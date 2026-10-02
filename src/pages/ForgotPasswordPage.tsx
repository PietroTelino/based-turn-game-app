import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForgotPassword } from '@/hooks/useForgotPassword';

export function ForgotPasswordPage() {
    const { t } =useTranslation();
    const {
        email,
        emailError,
        isSubmitting,
        submitted,
        handleChange,
        handleSubmit,
    } = useForgotPassword();

    return (
        <div className='min-h-screen bg-gray-50 flex items-center justify-center p-4'>
            <div className='w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8'>
                {submitted ? (
                    <div className='flex flex-col gap-4 text-center'>
                        <div className='text-4xl'>📬</div>
                        <h1 className='text-xl font-bold text-gray-900'>{t('auth.forgotPassword.successTitle')}</h1>
                        <p className='text-sm text-gray-500'>
                            {t('auth.forgotPassword.successMessage')}
                        </p>
                        <Link
                            to='/login'
                            className='text-sm text-blue-600 hover:underline mt-2'
                        >
                            {t('auth.forgotPassword.backToLogin')}
                        </Link>
                    </div>
                ) : (
                    <>
                        <div className='mb-8'>
                            <h1 className='text-2xl font-bold text-gray-900'>{t('auth.forgotPassword.title')}</h1>
                            <p className='text-sm text-gray-500 mt-1'>
                                {t('auth.forgotPassword.subtitle')}
                            </p>
                        </div>
                        <form onSubmit={handleSubmit} noValidate className='flex flex-col gap-5'>
                            <div className='flex flex-col gap-1.5'>
                                <label className='text-sm font-medium text-gray-700'>
                                    {t('auth.forgotPassword.email')}
                                </label>
                                <input
                                    name='text'
                                    type='email'
                                    value={email}
                                    onChange={handleChange}
                                    placeholder='seu@email.com'
                                    autoComplete='email'
                                    className={`
                                        w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors
                                        placeholder:text-gray-400 text-gray-900
                                        ${emailError
                                            ? 'border-red-400 bg-red-50 focus:border-red-500'
                                            : 'border-gray-300 bg-white focus:border-blue-500'
                                        }
                                    `}
                                />
                                {emailError && (
                                    <p className='text-xs text-red-500'>{emailError}</p>
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
                                {isSubmitting ? t('auth.forgotPassword.submitting') : t('auth.forgotPassword.submit')}
                            </button>
                            <Link
                                to='/login'
                                className='text-sm text-center text-gray-500 hover:text-gray-700 hover:underline'
                            >
                                {t('auth.forgotPassword.backToLogin')}
                            </Link>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}