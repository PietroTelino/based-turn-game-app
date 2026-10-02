import { useTranslation } from 'react-i18next';
import { useActiveUsers } from '@/hooks/useActiveUsers';
import { useAuth } from '@/contexts/AuthContext';
import { RoleBadge } from '@/components/RoleBadge';
import { StatusBadge } from '@/components/StatusBadge';
import { UserFormModal } from './UserFormModal';

export function ActiveUsersTab() {
    const { t } = useTranslation();
    const { user: currentUser } = useAuth();
    const {
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
    } = useActiveUsers();

    return (
        <>
            <div className='flex flex-col gap-6'>
                <div className='flex items-center justify-between'>
                <div>
                    <h2 className='text-lg font-semibold text-gray-900 dark:text-white'>
                        {t('users.title')}
                    </h2>
                    <p className='text-sm text-gray-500 dark:text-gray-400 mt-0.5'>
                        {t('users.count', { count: users.length })}
                    </p>
                </div>
                    <button
                        onClick={openCreateModal}
                        className='px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors'
                    >
                        {t('users.newUser')}
                    </button>
                </div>

                {isLoading && <p className='text-sm text-gray-500 dark:text-gray-400'>{t('users.loading')}</p>}

                {error && (
                    <div className='px-4 py-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg'>
                        <p className='text-sm text-red-600 dark:text-red-400'>{error}</p>
                    </div>
                )}

                {!isLoading && !error && (
                    <div className='bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden'>
                        <table className='w-full text-sm'>
                            <thead>
                                <tr className='border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800'>
                                    <th className='text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400'>{t('users.table.name')}</th>
                                    <th className='text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400'>{t('users.table.email')}</th>
                                    <th className='text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400'>{t('users.table.role')}</th>
                                    <th className='text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400'>{t('users.table.status')}</th>
                                    <th className='text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400'>{t('users.table.createdAt')}</th>
                                    <th className='px-4 py-3' />
                                </tr>
                            </thead>
                            <tbody className='divide-y divide-gray-100 dark:divide-gray-800'>
                                {users.map((user) => {
                                    const isSelf = user.id === currentUser?.id;
                                    const isGod = user.role === 'god';
                                    const isInactive = !!user.inactivatedAt;
                                    const canAct = !isSelf && !isGod;

                                    return (
                                        <tr key={user.id} className='hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'>
                                            <td className='px-4 py-3 font-medium text-gray-900 dark:text-white'>
                                                {user.name}
                                                {isSelf && <span className='ml-2 text-xs text-gray-400 dark:text-gray-500'>{t('users.actions.you')}</span>}
                                            </td>
                                            <td className='px-4 py-3 text-gray-600 dark:text-gray-400'>{user.email}</td>
                                            <td className='px-4 py-3'><RoleBadge role={user.role} /></td>
                                            <td className='px-4 py-3'><StatusBadge user={user} /></td>
                                            <td className='px-4 py-3 text-gray-500 dark:text-gray-400'>
                                                {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                                            </td>
                                            <td className='px-4 py-3'>
                                                {canAct && (
                                                <div className='flex items-center gap-3 justify-end'>
                                                    <button
                                                        onClick={() => openEditModal(user)}
                                                        className='text-xs text-gray-500 dark:text-gray-400 hover:underline'
                                                    >
                                                        {t('users.actions.edit')}
                                                    </button>
                                                    {isInactive ? (
                                                        <button
                                                            onClick={() => handleReactivate(user.id)}
                                                            className='text-xs text-green-600 dark:text-green-400 hover:underline'
                                                        >
                                                            {t('users.actions.reactivate')}
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleInactivate(user.id)}
                                                            className='text-xs text-yellow-600 dark:text-yellow-400 hover:underline'
                                                        >
                                                            {t('users.actions.inactivate')}
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleResetPassword(user.id)}
                                                        className='text-xs text-blue-600 dark:text-blue-400 hover:underline'
                                                    >
                                                        {t('users.actions.resetPassword')}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(user.id)}
                                                        className='text-xs text-red-500 dark:text-red-400 hover:underline'
                                                    >
                                                        {t('users.actions.delete')}
                                                    </button>
                                                </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {users.length === 0 && (
                            <div className='px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500'>
                                {t('users.noUsers')}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <UserFormModal
                isOpen={modalOpen}
                editingUser={editingUser}
                onClose={closeModal}
                onCreate={handleCreate}
                onEdit={handleEdit}
            />
        </>
    );
}