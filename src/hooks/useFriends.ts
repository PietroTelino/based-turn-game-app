import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { acceptFriend, getFriends, removeFriend, requestFriend } from '@/api/friends';
import type { FriendsView } from '@/api/friends';
import { useToast } from '@/contexts/ToastContext';

/** De quanto em quanto tempo a lista é atualizada (pedidos, convites, quem está jogando). */
const POLL_INTERVAL = 8000;

function messageOf(error: unknown): string | undefined {
    return (error as { response?: { data?: { message?: string } } }).response?.data?.message;
}

/** A lista de amigos, os pedidos e os convites, com as ações de cada um. */
export function useFriends() {
    const { t } = useTranslation();
    const { showToast } = useToast();
    const [view, setView] = useState<FriendsView | null>(null);
    const [hasError, setHasError] = useState(false);
    const [isBusy, setIsBusy] = useState(false);

    const load = useCallback(async () => {
        try {
            setView(await getFriends());
            setHasError(false);
        } catch {
            setHasError(true);
        }
    }, []);

    useEffect(() => {
        void load();

        const timer = window.setInterval(load, POLL_INTERVAL);

        return () => window.clearInterval(timer);
    }, [load]);

    const run = async (request: () => Promise<FriendsView>, done?: string) => {
        setIsBusy(true);

        try {
            setView(await request());
            if (done) showToast(t(done), 'success');
        } catch (error) {
            showToast(messageOf(error) ?? t('errors.genericError'), 'error');
        } finally {
            setIsBusy(false);
        }
    };

    return {
        view,
        hasError,
        isBusy,
        reload: load,
        request: (userId: string) => run(() => requestFriend(userId), 'friends.requestSent'),
        accept: (requestId: string) => run(() => acceptFriend(requestId), 'friends.accepted'),
        remove: (userId: string) => run(() => removeFriend(userId)),
    };
}
