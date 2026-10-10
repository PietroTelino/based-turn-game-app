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
        <header className='app-header'>
            <h1 className='app-header__title'>{title}</h1>
            <button onClick={handleLogout} className='app-header__logout'>
                {t('nav.logout')}
            </button>
        </header>
    );
}