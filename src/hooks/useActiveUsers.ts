import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { getUsers, deleteUser, inactivateUser, reactivateUser, adminResetPassword, createUser, updateUser } from '@/api/users';
import { useToast } from '@/contexts/ToastContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import type { User } from '@/types';

export function useActiveUsers() {
    const { t } = useTranslation();
    const { showToast } = useToast();
    const { confirm } = useConfirm();

    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [modalOpen, setModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const fetchUsers = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            const data = await getUsers()
            setUsers(data)
        } catch {
            setError(t('users.loading'))
        } finally {
            setIsLoading(false)
        }
    }, [t]);

    useEffect(() => {
        fetchUsers()
    }, [fetchUsers]);

    function openCreateModal() {
        setEditingUser(null);
        setModalOpen(true);
    }

    function openEditModal(user: User) {
        setEditingUser(user);
        setModalOpen(true);
    }

    function closeModal() {
        setModalOpen(false);
        setEditingUser(null);
    }

    async function handleCreate(data: {
        name: string
        email: string
        password: string
        role: string
    }) {
        try {
            await createUser(data);
            await fetchUsers();
            showToast(t('users.form.createSuccess'), 'success');
            closeModal();
        } catch (err: any) {
            const message = err?.response?.data?.message ?? t('errors.genericError');
            showToast(message, 'error');
        }
    }

    async function handleEdit(id: string, data: { name: string; email: string }) {
        try {
            await updateUser(id, data);
            await fetchUsers();
            showToast(t('users.form.editSuccess'), 'success');
            closeModal();
        } catch (err: any) {
            const message = err?.response?.data?.message ?? t('errors.genericError');
            showToast(message, 'error');
        }
    }

    async function handleDelete(id: string) {
        const ok = await confirm({
            title: t('users.confirm.delete.title'),
            message: t('users.confirm.delete.message'),
            confirmLabel: t('users.confirm.delete.confirm'),
            variant: 'danger',
        });
        if (!ok) return
        try {
            await deleteUser(id);
            await fetchUsers();
            showToast(t('users.confirm.delete.confirm'), 'success');
        } catch {
            showToast(t('errors.genericError'), 'error');
        }
    }

    async function handleInactivate(id: string) {
        const ok = await confirm({
            title: t('users.confirm.inactivate.title'),
            message: t('users.confirm.inactivate.message'),
            confirmLabel: t('users.confirm.inactivate.confirm'),
            variant: 'warning',
        });
        if (!ok) return
        try {
            await inactivateUser(id);
            await fetchUsers();
            showToast(t('users.confirm.inactivate.confirm'), 'success');
        } catch {
            showToast(t('errors.genericError'), 'error');
        }
    }

    async function handleReactivate(id: string) {
        const ok = await confirm({
            title: t('users.confirm.reactivate.title'),
            message: t('users.confirm.reactivate.message'),
            confirmLabel: t('users.confirm.reactivate.confirm'),
            variant: 'info',
        });
        if (!ok) return
        try {
            await reactivateUser(id);
            await fetchUsers();
            showToast(t('users.confirm.reactivate.confirm'), 'success');
        } catch {
            showToast(t('errors.genericError'), 'error');
        }
    }

    async function handleResetPassword(id: string) {
        const ok = await confirm({
            title: t('users.confirm.resetPassword.title'),
            message: t('users.confirm.resetPassword.message'),
            confirmLabel: t('users.confirm.resetPassword.confirm'),
            variant: 'warning',
        });
        if (!ok) return;
        try {
            await adminResetPassword(id);
            showToast(t('users.confirm.resetPassword.confirm'), 'success');
        } catch {
            showToast(t('errors.genericError'), 'error');
        }
    }

    return {
        users,
        isLoading,
        error,
        modalOpen,
        editingUser,
        openCreateModal,
        openEditModal,
        closeModal,
        handleCreate,
        handleEdit,
        handleDelete,
        handleInactivate,
        handleReactivate,
        handleResetPassword,
    };
}