import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getCharacters } from '@/api/battles';
import { getRoom, joinRoom, leaveRoom, readyInRoom, unreadyInRoom } from '@/api/rooms';
import { sfx } from '@/audio/sfx';
import { useToast } from '@/contexts/ToastContext';
import { TEAM_SIZE } from '@/hooks/usePlay';
import type { Character } from '@/types/battle';
import type { RoomView } from '@/types/room';

/** De quanto em quanto tempo a tela pergunta à API como está a sala, em ms. */
const POLL_INTERVAL = 1500;

/** loading: entrando na sala | open: na sala | error: não deu para entrar */
type Phase = 'loading' | 'open' | 'error';

function messageOf(error: unknown): string | undefined {
    return (error as { response?: { data?: { message?: string } } }).response?.data?.message;
}

/**
 * Controla uma sala do multiplayer na tela.
 *
 * O time fica só nesta tela enquanto está sendo montado: ele vai para a API
 * quando o jogador aperta "Jogar", e mesmo lá o outro jogador não o recebe.
 * Do outro só chegam o nome e se ele já está pronto.
 *
 * Não há conexão aberta com o servidor: a tela pergunta como está a sala a
 * cada POLL_INTERVAL. É assim que ela fica sabendo que alguém entrou, que o
 * outro ficou pronto e que a batalha começou.
 */
export function useRoom(code: string) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [room, setRoom] = useState<RoomView | null>(null);
    const [characters, setCharacters] = useState<Character[]>([]);
    const [phase, setPhase] = useState<Phase>('loading');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [team, setTeam] = useState<string[]>([]);
    /** Esperando a resposta de "Jogar", "Trocar time" ou "Sair". */
    const [isSending, setIsSending] = useState(false);

    // Sobe a cada pedido que muda a sala. Uma consulta que saiu antes do pedido
    // e voltou depois traz a sala velha: ela percebe que o número mudou e é descartada.
    const changesRef = useRef(0);
    /** A última sala recebida, para perceber o que mudou de uma consulta para a outra. */
    const lastRef = useRef<RoomView | null>(null);

    const show = useCallback((fresh: RoomView) => {
        const last = lastRef.current;

        // O outro entrou ou ficou pronto: um som avisa quem está olhando para outra aba.
        if (last && !last.opponent && fresh.opponent) sfx.play('turn');
        if (last?.opponent && !last.opponent.ready && fresh.opponent?.ready) sfx.play('select');

        lastRef.current = fresh;
        setRoom(fresh);
    }, []);

    // Abrir a tela é entrar na sala. Para quem já está nela (o anfitrião, ou
    // quem recarregou a página), a API só devolve a sala.
    useEffect(() => {
        let cancelled = false;

        Promise.all([joinRoom(code), getCharacters()])
            .then(([joined, loaded]) => {
                if (cancelled) return;

                show(joined);
                setCharacters(loaded);
                // Quem recarregou a página depois de confirmar o time o recebe de volta.
                setTeam(joined.you.team ?? []);
                setPhase('open');
            })
            .catch((error) => {
                if (cancelled) return;

                setErrorMessage(messageOf(error) ?? null);
                setPhase('error');
            });

        return () => {
            cancelled = true;
        };
    }, [code, show]);

    const status = room?.status;
    const isWaitingForStart = status === 'waiting' || status === 'selecting' || status === 'starting';

    useEffect(() => {
        if (!isWaitingForStart) return;

        let cancelled = false;
        let timer: number | undefined;

        async function check() {
            const changes = changesRef.current;

            try {
                const fresh = await getRoom(code);

                if (cancelled) return;

                if (changesRef.current === changes) show(fresh);
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
    }, [code, isWaitingForStart, show]);

    // A batalha começou: as duas telas vão para ela. "replace" tira a sala do
    // histórico, para o botão de voltar não cair numa sala que já acabou.
    const battleId = status === 'started' ? room?.battleId : null;

    useEffect(() => {
        if (battleId) {
            navigate(`/battle/${battleId}`, { replace: true });
        }
    }, [battleId, navigate]);

    const isReady = room?.you.ready ?? false;
    const canChoose = phase === 'open' && isWaitingForStart && status !== 'starting' && !isReady && !isSending;

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

    /** Manda um pedido que muda a sala e mostra a sala que voltou. */
    async function send(request: () => Promise<RoomView>) {
        setIsSending(true);
        changesRef.current += 1;

        try {
            show(await request());
        } catch (error) {
            showToast(messageOf(error) ?? t('errors.genericError'), 'error');
        } finally {
            changesRef.current += 1;
            setIsSending(false);
        }
    }

    /** Confirma o time. Se o outro já confirmou, a resposta já traz a batalha. */
    async function ready() {
        if (!canChoose || team.length !== TEAM_SIZE) return;

        sfx.play('click');
        await send(() => readyInRoom(code, team));
    }

    /** Volta atrás para trocar o time, enquanto a batalha não começou. */
    async function unready() {
        if (!isReady || isSending || status === 'starting' || status === 'started') return;

        sfx.play('click');
        await send(() => unreadyInRoom(code));
    }

    async function leave() {
        if (isSending) return;

        setIsSending(true);
        changesRef.current += 1;

        try {
            await leaveRoom(code);
        } catch {
            // A sala pode já ter fechado ou começado: sair da tela é o que importa.
        }

        navigate('/multiplayer');
    }

    return { room, characters, phase, errorMessage, team, isReady, isSending, canChoose, toggle, ready, unready, leave };
}
