import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';

interface HeaderProps {
    title: string;
    /** Botão que abre e fecha o menu, quando ele fica escondido (Layout com hideMenu). */
    menu?: { isOpen: boolean; onToggle: () => void };
}

export function Header({ title, menu }: HeaderProps) {
    const { t } = useTranslation();
    const { logout } = useAuth();
    const navigate = useNavigate();

    async function handleLogout() {
        await logout();
        navigate('/login');
    }

    return (
        <header className='app-header'>
            <div className='app-header__start'>
                {menu && (
                    <button
                        type='button'
                        className='app-header__menu'
                        aria-expanded={menu.isOpen}
                        aria-controls='app-menu'
                        onClick={menu.onToggle}
                    >
                        <span className='app-header__burger' aria-hidden='true' />
                        {t('nav.menu')}
                    </button>
                )}
                <h1 className='app-header__title'>{title}</h1>
            </div>
            <button onClick={handleLogout} className='app-header__logout'>
                {t('nav.logout')}
            </button>
        </header>
    );
}
