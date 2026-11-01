import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getCharacters } from '@/api/battles';
import { enterRankedQueue, getRankedDraft, getRankedProfile, getRankedQueue, leaveRankedQueue, sendDraftChoice } from '@/api/ranked';
import { sfx } from '@/audio/sfx';
import { useToast } from '@/contexts/ToastContext';
import type { Character } from '@/types/battle';
import type { DraftView, QueueView, RankedProfile } from '@/types/ranked';

/** De quanto em quanto tempo a tela pergunta pela fila, em ms. É essa pergunta que mantém o jogador na fila. */
const POLL_INTERVAL = 1500;
/** Na seleção de personagens a pergunta é mais frequente: as escolhas do outro aparecem logo. */
const DRAFT_POLL_INTERVAL = 1000;

/** loading: buscando os pontos e os personagens | ready | error */
type Phase = 'loading' | 'ready' | 'error';

function messageOf(error: unknown): string | undefined {
    return (error as { response?: { data?: { message?: string } } }).response?.data?.message;
}

/**
 * Tela da ranqueada: os pontos e o rank do jogador, a fila com pareamento
 * automático e a seleção de personagens.
 *
 * Não há conexão aberta com o servidor: enquanto procura, a tela pergunta
 * pela fila a cada POLL_INTERVAL (cada pergunta renova o lugar do jogador e
 * tenta parear). Pareado, ela passa a perguntar pela seleção a cada
 * DRAFT_POLL_INTERVAL, e manda os banimentos e escolhas. Quando a seleção
 * acaba, a resposta traz a partida e a tela vai para ela.
 */
export function useRanked() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [profile, setProfile] = useState<RankedProfile | null>(null);
    const [characters, setCharacters] = useState<Character[]>([]);
    const [phase, setPhase] = useState<Phase>('loading');
    const [queue, setQueue] = useState<QueueView | null>(null);
    /** Esperando a resposta de "procurar partida" ou de "cancelar". */
    const [isSending, setIsSending] = useState(false);
    /** Há quantos segundos a tela está procurando (anda sozinho entre uma pergunta e outra). */
    const [waited, setWaited] = useState(0);
    const [draft, setDraft] = useState<DraftView | null>(null);
    /** Quando acaba o prazo do passo da vez, no relógio deste navegador (ms). */
    const [deadline, setDeadline] = useState<number | null>(null);
    /** Esperando a resposta de uma escolha na seleção. */
    const [isChoosing, setIsChoosing] = useState(false);

    // Sobe a cada pedido que muda a fila ou a seleção. Uma pergunta que saiu
    // antes do pedido e voltou depois traz o estado velho: é descartada.
    const changesRef = useRef(0);

    useEffect(() => {
        let cancelled = false;

        Promise.all([getRankedProfile(), getCharacters()])
            .then(([loadedProfile, loadedCharacters]) => {
                if (cancelled) return;

                setProfile(loadedProfile);
                setQueue(loadedProfile.queue);
                setCharacters(loadedCharacters);
                setWaited(loadedProfile.queue.waitedSeconds);
                setPhase('ready');
            })
            .catch(() => {
                if (!cancelled) setPhase('error');
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const isSearching = queue?.status === 'searching';
    const isDrafting = queue?.status === 'drafting';

    // Procurando: pergunta pela fila até o pareamento acontecer.
    useEffect(() => {
        if (!isSearching) return;

        let cancelled = false;
        let timer: number | undefined;

        async function check() {
            const changes = changesRef.current;

            try {
                const fresh = await getRankedQueue();

                if (cancelled || changesRef.current !== changes) return;

                if (fresh.status === 'drafting') sfx.play('turn');
                setQueue(fresh);
                if (fresh.status === 'searching') setWaited(fresh.waitedSeconds);
            } catch {
                // Sem conexão por um instante: tenta de novo na próxima volta.
            }

            if (!cancelled) timer = window.setTimeout(check, POLL_INTERVAL);
        }

        timer = window.setTimeout(check, POLL_INTERVAL);

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [isSearching]);

    // O contador de espera anda de segundo em segundo, sem depender da resposta da API.
    useEffect(() => {
        if (!isSearching) return;

        const timer = window.setInterval(() => setWaited((seconds) => seconds + 1), 1000);

        return () => window.clearInterval(timer);
    }, [isSearching]);

    /** Guarda a seleção que chegou e acerta o relógio do passo da vez. */
    function applyDraft(fresh: DraftView) {
        setDraft((previous) => {
            // Uma escolha nova (do outro ou por tempo esgotado) tem som.
            if (previous && fresh.actions.length > previous.actions.length) sfx.play('select');

            return fresh;
        });
        setDeadline(fresh.current ? Date.now() + fresh.current.timeLeftMs : null);
    }

    // Na seleção: pergunta por ela até a partida existir. Quem recarregou a página no meio volta para cá.
    useEffect(() => {
        if (!isDrafting) return;

        let cancelled = false;
        let timer: number | undefined;

        async function check() {
            const changes = changesRef.current;

            try {
                const fresh = await getRankedDraft();

                if (!cancelled && changesRef.current === changes) applyDraft(fresh);
            } catch {
                // Sem conexão por um instante: tenta de novo na próxima volta.
            }

            if (!cancelled) timer = window.setTimeout(check, DRAFT_POLL_INTERVAL);
        }

        void check();

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [isDrafting]);

    // A seleção acabou: a tela vai para a partida.
    const draftBattleId = draft?.battleId ?? null;

    useEffect(() => {
        if (draftBattleId) {
            sfx.play('start');
            navigate(`/battle/${draftBattleId}`, { replace: true });
        }
    }, [draftBattleId, navigate]);

    /** Manda um pedido que muda a fila e mostra a fila que voltou. */
    async function send(request: () => Promise<QueueView>, errorKey: string) {
        setIsSending(true);
        changesRef.current += 1;

        try {
            const fresh = await request();

            setQueue(fresh);
            setWaited(fresh.waitedSeconds);
        } catch (error) {
            showToast(messageOf(error) ?? t(errorKey), 'error');
        } finally {
            changesRef.current += 1;
            setIsSending(false);
        }
    }

    const canSearch = phase === 'ready' && queue?.status === 'idle' && !isSending;

    /** Entra na fila. O time é montado depois, na seleção. */
    async function search() {
        if (!canSearch) return;

        sfx.play('click');
        await send(enterRankedQueue, 'ranked.searchError');
    }

    /** Sai da fila. Se o pareamento aconteceu no meio do caminho, a resposta traz a seleção. */
    async function cancel() {
        if (!isSearching || isSending) return;

        sfx.play('click');
        await send(leaveRankedQueue, 'errors.genericError');
    }

    /** Bane ou escolhe `characterId` no passo da vez. */
    async function choose(characterId: string) {
        if (!draft || isChoosing) return;

        setIsChoosing(true);
        changesRef.current += 1;
        sfx.play('click');

        try {
            applyDraft(await sendDraftChoice(characterId));
        } catch (error) {
            showToast(messageOf(error) ?? t('ranked.draft.chooseError'), 'error');

            // A seleção pode ter andado (o prazo acabou no caminho): mostra como ela está.
            try {
                applyDraft(await getRankedDraft());
            } catch {
                // A próxima pergunta da seleção acerta.
            }
        } finally {
            changesRef.current += 1;
            setIsChoosing(false);
        }
    }

    return { profile, characters, phase, queue, waited, isSending, isSearching, isDrafting, canSearch, search, cancel, draft, deadline, isChoosing, choose };
}
