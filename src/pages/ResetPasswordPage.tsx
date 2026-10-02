import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useResetPassword } from '@/hooks/useResetPassword';

export function ResetPasswordPage() {
    const { t } = useTranslation()
    const {
        token,
        form,
        errors,
        isSubmitting,
        handleChange,
        handleSubmit,
    } = useResetPassword();

    if (!token) {
        return (
            <div className='min-h-screen bg-gray-50 flex items-center justify-center p-4'>
                <div className='w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center flex flex-col gap-4'>
                    <div className='text-4xl'>⚠️</div>
                    <h1 className='text-xl font-bold text-gray-900'>{t('auth.resetPassword.invalidToken')}</h1>
                    <p className='text-sm text-gray-500'>
                        {t('auth.resetPassword.invalidTokenMessage')}
                    </p>
                    <Link to='/forgot-password' className='text-sm text-blue-600 hover:underline'>
                        {t('auth.resetPassword.requestNewLink')}
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className='min-h-screen bg-gray-50 flex items-center justify-center p-4'>
            <div className='w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8'>
                <div className='mb-8'>
                    <h1 className='text-2xl font-bold text-gray-900'>{t('auth.resetPassword.title')}</h1>
                    <p className='text-sm text-gray-500 mt-1'>
                        {t('auth.resetPassword.subtitle')}
                    </p>
                </div>
                <form onSubmit={handleSubmit} noValidate className='flex flex-col gap-5'>
                    <div className='flex flex-col gap-1.5'>
                        <label className='text-sm font-medium text-gray-700'>{t('auth.resetPassword.password')}</label>
                        <input
                            name='password'
                            type='password'
                            value={form.password}
                            onChange={handleChange}
                            placeholder='••••••••'
                            className={`
                                w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors
                                placeholder:text-gray-400 text-gray-900
                                ${errors.password
                                    ? 'border-red-400 bg-red-50 focus:border-red-500'
                                    : 'border-gray-300 bg-white focus:border-blue-500'
                                }
                            `}
                        />
                        {errors.password && (
                            <p className='text-xs text-red-500'>{errors.password}</p>
                        )}
                    </div>
                    <div className='flex flex-col gap-1.5'>
                        <label className='text-sm font-medium text-gray-700'>
                            {t('auth.resetPassword.confirmPassword')}
                        </label>
                        <input
                            name='confirmPassword'
                            type='password'
                            value={form.confirmPassword}
                            onChange={handleChange}
                            placeholder='••••••••'
                            className={`
                                w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors
                                placeholder:text-gray-400 text-gray-900
                                ${errors.confirmPassword
                                    ? 'border-red-400 bg-red-50 focus:border-red-500'
                                    : 'border-gray-300 bg-white focus:border-blue-500'
                                }
                            `}
                        />
                        {errors.confirmPassword && (
                            <p className='text-xs text-red-500'>{errors.confirmPassword}</p>
                        )}
                    </div>
                    <button
                        type='submit'
                        disabled={isSubmitting}
                        className='
                            w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700
                            disabled:bg-blue-400 disabled:cursor-not-allowed
                            text-white text-sm font-medium rounded-lg transition-colors
                        '
                    >
                        {isSubmitting ? t('auth.resetPassword.submitting') : t('auth.resetPassword.submit')}
                    </button>
                    <Link
                        to='/login'
                        className='text-sm text-center text-gray-500 hover:text-gray-700 hover:underline'
                    >
                        {t('auth.resetPassword.backToLogin')}
                    </Link>
                </form>
            </div>
        </div>
    );
}