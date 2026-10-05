import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getCharacters } from '@/api/battles';
import { enterRankedQueue, getRankedProfile, getRankedQueue, leaveRankedQueue } from '@/api/ranked';
import { sfx } from '@/audio/sfx';
import { useToast } from '@/contexts/ToastContext';
import { TEAM_SIZE } from '@/hooks/usePlay';
import type { Character } from '@/types/battle';
import type { QueueView, RankedProfile } from '@/types/ranked';

/** De quanto em quanto tempo a tela pergunta pela fila, em ms. É essa pergunta que mantém o jogador na fila. */
const POLL_INTERVAL = 1500;

/** loading: buscando os pontos e os personagens | ready | error */
type Phase = 'loading' | 'ready' | 'error';

function messageOf(error: unknown): string | undefined {
    return (error as { response?: { data?: { message?: string } } }).response?.data?.message;
}

/**
 * Tela da ranqueada: os pontos e o rank do jogador, a escolha do time e a
 * fila com pareamento automático.
 *
 * Não há conexão aberta com o servidor: enquanto procura, a tela pergunta
 * pela fila a cada POLL_INTERVAL. Cada pergunta renova o lugar do jogador na
 * fila e tenta parear; quando a resposta traz uma partida, a tela vai para
 * ela. Quem fecha a tela para de perguntar e sai da fila sozinho.
 */
export function useRanked() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [profile, setProfile] = useState<RankedProfile | null>(null);
    const [characters, setCharacters] = useState<Character[]>([]);
    const [phase, setPhase] = useState<Phase>('loading');
    const [queue, setQueue] = useState<QueueView | null>(null);
    const [team, setTeam] = useState<string[]>([]);
    /** Esperando a resposta de "procurar partida" ou de "cancelar". */
    const [isSending, setIsSending] = useState(false);
    /** Há quantos segundos a tela está procurando (anda sozinho entre uma pergunta e outra). */
    const [waited, setWaited] = useState(0);

    // Sobe a cada pedido que muda a fila. Uma pergunta que saiu antes do pedido
    // e voltou depois traz a fila velha: ela percebe que o número mudou e é descartada.
    const changesRef = useRef(0);

    useEffect(() => {
        let cancelled = false;

        Promise.all([getRankedProfile(), getCharacters()])
            .then(([loadedProfile, loadedCharacters]) => {
                if (cancelled) return;

                setProfile(loadedProfile);
                setQueue(loadedProfile.queue);
                setCharacters(loadedCharacters);
                // Quem recarregou a página no meio da busca continua na fila, com o mesmo time.
                setTeam(loadedProfile.queue.team ?? []);
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

    // Procurando: pergunta pela fila até aparecer uma partida.
    useEffect(() => {
        if (!isSearching) return;

        let cancelled = false;
        let timer: number | undefined;

        async function check() {
            const changes = changesRef.current;

            try {
                const fresh = await getRankedQueue();

                if (cancelled || changesRef.current !== changes) return;

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

    // Achou: a tela vai para a partida. Só quando o pareamento acontece com
    // esta tela procurando; uma partida que já estava em andamento ao abrir a
    // página aparece como aviso, com um botão para voltar a ela.
    const wasSearchingRef = useRef(false);
    const matchedBattleId = queue?.status === 'matched' ? queue.battleId : null;

    useEffect(() => {
        if (isSearching) wasSearchingRef.current = true;

        if (matchedBattleId && wasSearchingRef.current) {
            sfx.play('turn');
            navigate(`/battle/${matchedBattleId}`, { replace: true });
        }
    }, [isSearching, matchedBattleId, navigate]);

    const canChoose = phase === 'ready' && queue?.status === 'idle' && !isSending;

    function toggle(characterId: string) {
        if (!canChoose) return;

        sfx.play('select');

        setTeam((current) => {
            if (current.includes(characterId)) {
                return current.filter((id) => id !== characterId);
            }

            return current.length < TEAM_SIZE ? [...current, characterId] : current;
        });
    }

    /** Manda um pedido que muda a fila e mostra a fila que voltou. */
    async function send(request: () => Promise<QueueView>, errorKey: string) {
        setIsSending(true);
        changesRef.current += 1;

        try {
            const fresh = await request();

            // Entrou na fila agora: se a resposta já traz a partida, a tela vai para ela.
            if (fresh.status !== 'idle') wasSearchingRef.current = true;

            setQueue(fresh);
            setWaited(fresh.waitedSeconds);
        } catch (error) {
            showToast(messageOf(error) ?? t(errorKey), 'error');
        } finally {
            changesRef.current += 1;
            setIsSending(false);
        }
    }

    /** Entra na fila com o time escolhido. */
    async function search() {
        if (!canChoose || team.length !== TEAM_SIZE) return;

        sfx.play('click');
        await send(() => enterRankedQueue(team), 'ranked.searchError');
    }

    /** Sai da fila. Se o pareamento aconteceu no meio do caminho, a resposta traz a partida e a tela vai para ela. */
    async function cancel() {
        if (!isSearching || isSending) return;

        sfx.play('click');
        await send(leaveRankedQueue, 'errors.genericError');
    }

    return { profile, characters, phase, queue, team, waited, isSending, isSearching, canChoose, toggle, search, cancel };
}
