import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';

interface HeaderProps {
    title: string;
}

export function Header({ title }: HeaderProps) {
    const { t } = useTranslation();
    const { logout } = useAuth();
    const navigate = useNavigate();

    async function handleLogout() {
        await logout();
        navigate('/login');
    }

    return (
        <header className='h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6'>
            <h1 className='text-base font-semibold text-gray-900 dark:text-white'>{title}</h1>
            <button
                onClick={handleLogout}
                className='text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer'
            >
                {t('nav.logout')}
            </button>
        </header>
    );
}