import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { getMySessions, logoutSession } from '@/api/sessions';
import { useToast } from '@/contexts/ToastContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import type { Session } from '@/types';

export function useSessions() {
    const { t } = useTranslation();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { showToast } = useToast();
    const { confirm } = useConfirm();

    const fetchSessions = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await getMySessions();
            setSessions(data);
        } catch {
            setError(t('sessions.loading'));
        } finally {
            setIsLoading(false);
        }
    }, [t]);

    useEffect(() => {
        fetchSessions()
    }, [fetchSessions]);

    async function handleLogoutSession(sessionId: string) {
        const ok = await confirm({
            title: t('sessions.terminateTitle'),
            message: t('sessions.terminateMessage'),
            confirmLabel: t('sessions.terminate'),
            variant: 'danger',
        });
        if (!ok) return;

        try {
            await logoutSession(sessionId);
            setSessions((prev) => prev.filter((s) => s.id !== sessionId));
            showToast(t('sessions.terminateSuccess'), 'success');
        } catch {
            showToast(t('errors.genericError'), 'error');
        }
    }

    return {
        sessions,
        isLoading,
        error,
        handleLogoutSession,
    }
}