import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { getDeletedUsers, restoreUser, hardDeleteUser } from '@/api/users';
import { useToast } from '@/contexts/ToastContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { useAuth } from '@/contexts/AuthContext';
import type { User } from '@/types';

export function useDeletedUsers() {
    const { t } = useTranslation();
    const { showToast } = useToast();
    const { confirm } = useConfirm();
    const { user: currentUser } = useAuth();

    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchUsers = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            const data = await getDeletedUsers();
            setUsers(data);
        } catch {
            setError(t('users.loading'));
        } finally {
            setIsLoading(false);
        }
    }, [t]);

    useEffect(() => {
        fetchUsers()
    }, [fetchUsers]);

    async function handleRestore(id: string) {
        const ok = await confirm({
            title: t('users.confirm.restore.title'),
            message: t('users.confirm.restore.message'),
            confirmLabel: t('users.confirm.restore.confirm'),
            variant: 'info',
        });
        if (!ok) return
        try {
            await restoreUser(id);
            await fetchUsers();
            showToast(t('users.deleted.restoreSuccess'), 'success');
        } catch {
            showToast(t('errors.genericError'), 'error');
        }
    }

    async function handleHardDelete(id: string) {
        const ok = await confirm({
            title: t('users.confirm.hardDelete.title'),
            message: t('users.confirm.hardDelete.message'),
            confirmLabel: t('users.confirm.hardDelete.confirm'),
            variant: 'danger',
        });
        if (!ok) return
        try {
            await hardDeleteUser(id);
            await fetchUsers();
            showToast(t('users.deleted.hardDeleteSuccess'), 'success');
        } catch {
            showToast(t('errors.genericError'), 'error');
        }
    }

    const isGod = currentUser?.role === 'god';

    return {
        users,
        isLoading,
        error,
        isGod,
        handleRestore,
        handleHardDelete,
    };
}