import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useChangePassword } from '@/hooks/useChangePassword';
import { usePreferences } from '@/hooks/usePreferences';
import { useDeleteAccount } from '@/hooks/useDeleteAccount';
import { DeleteAccountModal } from '@/components/DeleteAccountModal';

export function ProfilePage() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const passwordForm = useChangePassword();
    const preferences = usePreferences();
    const deleteAccount = useDeleteAccount();

    return (
        <Layout title='Perfil'>
            <div className='flex flex-col gap-8 max-w-xl'>
                <div className='bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 flex flex-col gap-4'>
                    <h2 className='text-base font-semibold text-gray-900 dark:text-white'>
                        {t('profile.accountInfo')}
                    </h2>
                    <div className='flex flex-col gap-3 text-sm'>
                        <div className='flex flex-col gap-0.5'>
                            <span className='text-xs text-gray-500 dark:text-gray-400'>{t('profile.name')}</span>
                            <span className='text-gray-900 dark:text-white font-medium'>{user?.name}</span>
                        </div>
                        <div className='flex flex-col gap-0.5'>
                            <span className='text-xs text-gray-500 dark:text-gray-400'>{t('profile.email')}</span>
                            <span className='text-gray-900 dark:text-white font-medium'>{user?.email}</span>
                        </div>
                        <div className='flex flex-col gap-0.5'>
                            <span className='text-xs text-gray-500 dark:text-gray-400'>{t('profile.role')}</span>
                            <span className='text-gray-900 dark:text-white font-medium capitalize'>{user?.role}</span>
                        </div>
                    </div>
                </div>
                <div className='bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 flex flex-col gap-4'>
                    <div>
                        <h2 className='text-base font-semibold text-gray-900 dark:text-white'>{t('profile.theme.title')}</h2>
                        <p className='text-sm text-gray-500 dark:text-gray-400 mt-0.5'>
                            {t('profile.theme.subtitle')}
                        </p>
                    </div>
                    <div className='flex gap-3'>
                        {(['light', 'dark'] as const).map((theme) => (
                            <button
                                key={theme}
                                onClick={() => preferences.handleThemeChange(theme)}
                                disabled={preferences.isSubmitting}
                                className={`flex-1 py-3 px-4 rounded-xl border text-sm font-medium
                                    transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                                    ${preferences.currentTheme === theme
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400'
                                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                                    }
                                `}
                            >
                                {t(`profile.theme.${theme}`)}
                            </button>
                        ))}
                    </div>
                </div>
                <div className='bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 flex flex-col gap-4'>
                    <div>
                        <h2 className='text-base font-semibold text-gray-900 dark:text-white'>{t('profile.changePassword.title')}</h2>
                        <p className='text-sm text-gray-500 dark:text-gray-400 mt-0.5'>
                            {t('profile.changePassword.subtitle')}
                        </p>
                    </div>
                    <form onSubmit={passwordForm.handleSubmit} noValidate className="flex flex-col gap-4">
                        {(['currentPassword', 'newPassword', 'confirmPassword'] as const).map((field) => {
                            const labels = {
                                currentPassword: t('profile.changePassword.current'),
                                newPassword: t('profile.changePassword.new'),
                                confirmPassword: t('profile.changePassword.confirm'),
                            };
                            return (
                                <div key={field} className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {labels[field]}
                                    </label>
                                    <input
                                        name={field}
                                        type="password"
                                        value={passwordForm.form[field]}
                                        onChange={passwordForm.handleChange}
                                        placeholder="••••••••"
                                        className={`
                                            w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors
                                            placeholder:text-gray-400 dark:placeholder:text-gray-600
                                            text-gray-900 dark:text-white
                                            ${passwordForm.errors[field]
                                                ? 'border-red-400 bg-red-50 dark:bg-red-950'
                                                : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-blue-500'
                                            }
                                        `}
                                    />
                                    {passwordForm.errors[field] && (
                                        <p className="text-xs text-red-500">{passwordForm.errors[field]}</p>
                                    )}
                                </div>
                            );
                        })}

                        <button
                            type="submit"
                            disabled={passwordForm.isSubmitting}
                            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                        >
                            {passwordForm.isSubmitting ? t('common.saving') : t('profile.changePassword.submit')}
                        </button>
                    </form>
                </div>
                <div className='bg-white dark:bg-gray-900 border border-red-200 dark:border-red-900 rounded-xl p-6 flex flex-col gap-4'>
                    <div>
                        <h2 className='text-base font-semibold text-red-600 dark:text-red-400'>
                            {t('profile.dangerZone.title')}
                        </h2>
                        <p className='text-sm text-gray-500 dark:text-gray-400 mt-0.5'>
                            {t('profile.dangerZone.subtitle')}
                        </p>
                    </div>
                    <div className='flex items-center justify-between gap-4 p-4 border border-red-100 dark:border-red-900 rounded-lg bg-red-50 dark:bg-red-950/30'>
                        <div className='flex flex-col gap-0.5'>
                            <span className='text-sm font-medium text-gray-900 dark:text-white'>
                                {t('profile.dangerZone.deleteAccount')}
                            </span>
                            <span className='text-xs text-gray-500 dark:text-gray-400'>
                                {t('profile.dangerZone.deleteAccountDescription')}
                            </span>
                        </div>
                        <button
                            onClick={deleteAccount.openModal}
                            className='
                                shrink-0 px-4 py-2 text-sm rounded-lg border border-transparent
                                bg-red-600 hover:bg-red-700 text-white transition-colors
                            '
                        >
                            {t('profile.dangerZone.deleteButton')}
                        </button>
                    </div>
                </div>
            </div>
            <DeleteAccountModal
                isOpen={deleteAccount.modalOpen}
                password={deleteAccount.password}
                passwordError={deleteAccount.passwordError}
                isSubmitting={deleteAccount.isSubmitting}
                onClose={deleteAccount.closeModal}
                onConfirm={deleteAccount.handleConfirm}
                onPasswordChange={deleteAccount.handlePasswordChange}
            />
        </Layout>
    );
}