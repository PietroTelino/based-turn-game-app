import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createRoom, joinRoom, listOpenRooms } from '@/api/rooms';
import { sfx } from '@/audio/sfx';
import { useToast } from '@/contexts/ToastContext';
import type { OpenRoom } from '@/types/room';

/** De quanto em quanto tempo a lista de salas abertas é buscada de novo, em ms. */
const REFRESH_INTERVAL = 4000;

/** A mensagem que a API mandou junto com o erro, se mandou. */
function messageOf(error: unknown): string | undefined {
    return (error as { response?: { data?: { message?: string } } }).response?.data?.message;
}

/** Tela de entrada do multiplayer: criar uma sala ou entrar em uma que já existe. */
export function useLobby() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [rooms, setRooms] = useState<OpenRoom[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [code, setCode] = useState('');
    /** Criando ou entrando: os botões ficam travados até a resposta chegar. */
    const [isBusy, setIsBusy] = useState(false);

    // A lista se atualiza sozinha: quem está nesta tela vê as salas novas aparecerem.
    useEffect(() => {
        let cancelled = false;
        let timer: number | undefined;

        async function refresh() {
            try {
                const open = await listOpenRooms();

                if (cancelled) return;

                setRooms(open);
                setHasError(false);
            } catch {
                if (cancelled) return;

                setHasError(true);
            }

            setIsLoading(false);
            timer = window.setTimeout(refresh, REFRESH_INTERVAL);
        }

        refresh();

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, []);

    async function create() {
        if (isBusy) return;

        setIsBusy(true);
        sfx.play('click');

        try {
            const room = await createRoom();

            navigate(`/room/${room.code}`);
        } catch (error) {
            showToast(messageOf(error) ?? t('multiplayer.createError'), 'error');
            setIsBusy(false);
        }
    }

    async function join(roomCode: string) {
        const wanted = roomCode.trim().toUpperCase();

        if (!wanted || isBusy) return;

        setIsBusy(true);
        sfx.play('click');

        try {
            const room = await joinRoom(wanted);

            navigate(`/room/${room.code}`);
        } catch (error) {
            showToast(messageOf(error) ?? t('multiplayer.joinError'), 'error');
            setIsBusy(false);
        }
    }

    return { rooms, isLoading, hasError, code, setCode, isBusy, create, join };
}
