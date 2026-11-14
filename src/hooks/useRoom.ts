import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getCharacters } from '@/api/battles';
import { getRoom, joinRoom, leaveRoom, sendRoomDraftChoice } from '@/api/rooms';
import { sfx } from '@/audio/sfx';
import { useToast } from '@/contexts/ToastContext';
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
 * Enquanto só o anfitrião está na sala, a tela espera. Quando o outro entra,
 * começa a seleção de personagens, a mesma da ranqueada (banimentos e
 * escolhas alternados, com prazo): ela vem junto com a sala.
 *
 * Não há conexão aberta com o servidor: a tela pergunta como está a sala a
 * cada POLL_INTERVAL. É assim que ela fica sabendo que alguém entrou, que o
 * outro jogou e que a batalha começou.
 */
export function useRoom(code: string) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [room, setRoom] = useState<RoomView | null>(null);
    const [characters, setCharacters] = useState<Character[]>([]);
    const [phase, setPhase] = useState<Phase>('loading');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    /** Quando acaba o prazo do passo da vez, no relógio deste navegador (ms). */
    const [deadline, setDeadline] = useState<number | null>(null);
    /** Esperando a resposta de uma escolha. */
    const [isChoosing, setIsChoosing] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);

    // Sobe a cada pedido que muda a sala. Uma consulta que saiu antes do pedido
    // e voltou depois traz a sala velha: ela percebe que o número mudou e é descartada.
    const changesRef = useRef(0);
    /** A última sala recebida, para perceber o que mudou de uma consulta para a outra. */
    const lastRef = useRef<RoomView | null>(null);

    const show = useCallback((fresh: RoomView) => {
        const last = lastRef.current;

        // O outro entrou (a seleção começou) ou alguém jogou: um som avisa quem está olhando para outra aba.
        if (last && !last.opponent && fresh.opponent) sfx.play('turn');
        if (last?.draft && fresh.draft && fresh.draft.actions.length > last.draft.actions.length) sfx.play('select');

        lastRef.current = fresh;
        setRoom(fresh);
        setDeadline(fresh.draft?.current ? Date.now() + fresh.draft.current.timeLeftMs : null);
    }, []);

    // Abrir a tela é entrar na sala. Para quem já está nela (o anfitrião, ou
    // quem recarregou a página no meio da seleção), a API só devolve a sala.
    useEffect(() => {
        let cancelled = false;

        Promise.all([joinRoom(code), getCharacters()])
            .then(([joined, loaded]) => {
                if (cancelled) return;

                show(joined);
                setCharacters(loaded);
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
    const isOpen = status === 'waiting' || status === 'selecting' || status === 'starting';

    useEffect(() => {
        if (!isOpen) return;

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
    }, [code, isOpen, show]);

    // A batalha começou: as duas telas vão para ela. "replace" tira a sala do
    // histórico, para o botão de voltar não cair numa sala que já acabou.
    const battleId = room?.battleId ?? room?.draft?.battleId ?? null;

    useEffect(() => {
        if (battleId) {
            navigate(`/battle/${battleId}`, { replace: true });
        }
    }, [battleId, navigate]);

    /** Bane ou escolhe `characterId` no passo da vez. */
    async function choose(characterId: string) {
        if (!room?.draft || isChoosing) return;

        setIsChoosing(true);
        changesRef.current += 1;
        sfx.play('click');

        try {
            show(await sendRoomDraftChoice(code, characterId));
        } catch (error) {
            showToast(messageOf(error) ?? t('ranked.draft.chooseError'), 'error');

            // A seleção pode ter andado (o prazo acabou no caminho): mostra como ela está.
            try {
                show(await getRoom(code));
            } catch {
                // A próxima consulta acerta.
            }
        } finally {
            changesRef.current += 1;
            setIsChoosing(false);
        }
    }

    async function leave() {
        if (isLeaving) return;

        setIsLeaving(true);
        changesRef.current += 1;

        try {
            await leaveRoom(code);
        } catch {
            // A sala pode já ter fechado ou começado: sair da tela é o que importa.
        }

        navigate('/multiplayer');
    }

    return { room, characters, phase, errorMessage, deadline, isChoosing, isLeaving, choose, leave };
}
