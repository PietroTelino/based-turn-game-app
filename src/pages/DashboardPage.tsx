import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';

export function DashboardPage() {
    const { t } = useTranslation();
    const { user } = useAuth();

    return (
        <Layout title={t('nav.dashboard')}>
            <div className='flex flex-col gap-2'>
                <h2 className='text-xl font-semibold text-gray-900'>
                    {t('dashboard.greeting', { name: user?.name })}
                </h2>
                <p className='text-sm text-gray-500'>
                    {t('dashboard.welcome')}{' '}
                    <span className='font-medium text-gray-700'>{user?.role}</span>.
                </p>
            </div>
        </Layout>
    );
}