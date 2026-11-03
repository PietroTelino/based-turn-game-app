import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { LogoutDialog } from './LogoutDialog';

/**
 * Os ícones do menu, desenhados em traço (24 x 24), na cor do texto do link.
 * Cada página tem o seu: o castelo é o início, a espada o jogo contra a IA, as
 * espadas cruzadas o jogo contra outras pessoas.
 */
const ICONS: Record<string, React.ReactNode> = {
    dashboard: <path d='M4 20V10l3-2V5h2v2l3-2 3 2V5h2v3l3 2v10h-6v-5h-4v5z' />,
    play: <path d='M20 4v4L10 18l-4-4L16 4zM7.5 12.5 4 16M8 19l-3-3M5.5 20.5 3.5 18.5M13 7l4 4' />,
    multiplayer: <path d='M4 3l7 7M3 4l3-1-1 3M20 3l-7 7M21 4l-3-1 1 3M9.5 14.5 5 19l-1 2-1-1 2-1M14.5 14.5 19 19l1 2 1-1-2-1M8 12l4 4M16 12l-4 4' />,
    profile: <path d='M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5' />,
    sessions: <path d='M15 4a5 5 0 1 1-4.6 7L4 17.5V20h3v-2h2v-2h2l1.4-1.4A5 5 0 0 1 15 4zM16.5 7.5h.01' />,
    users: <path d='M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M16 4.2a3.5 3.5 0 0 1 0 6.6M18 14.3c2.2.6 3.5 2.6 3.5 5.7' />,
    audit: <path d='M7 3h10v18H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM9 8h6M9 12h6M9 16h4' />,
};

function NavIcon({ name }: { name: string }) {
    return (
        <svg className='app-nav-link__icon' viewBox='0 0 24 24' aria-hidden='true'>
            {ICONS[name]}
        </svg>
    );
}

interface NavItem {
    label: string;
    key: string;
    path: string;
    roles?: Array<'user' | 'administrator' | 'god'>;
}

const navItems: NavItem[] = [
    { key: 'dashboard', label: 'Dashboard', path: '/dashboard' },
    { key: 'play', label: 'Um Jogador', path: '/play' },
    { key: 'multiplayer', label: 'Multijogador', path: '/multiplayer' },
    { key: 'profile', label: 'Perfil', path: '/profile' },
    { key: 'sessions', label: 'Sessões', path: '/sessions' },
    { key: 'users', label: 'Usuários', path: '/users', roles: ['administrator', 'god'] },
    { key: 'audit', label: 'Auditoria', path: '/audit', roles: ['administrator', 'god'] },
];

interface SidebarProps {
    /** Quando o menu abre por cima da tela (Layout com hideMenu). */
    id?: string;
    /** Chamado ao escolher uma página: fecha o menu que abre por cima da tela. */
    onNavigate?: () => void;
}

export function Sidebar({ id, onNavigate }: SidebarProps = {}) {
    const { user } = useAuth();
    const { t, i18n } = useTranslation();
    /** A pergunta "Sair da conta?" está aberta. */
    const [isConfirming, setIsConfirming] = useState(false);

    const visibleItems = navItems.filter((items) => {
        if (!items.roles) return true;
        return user?.role && items.roles.includes(user.role);
    });

    function handleLanguageChange(e: React.ChangeEvent<HTMLSelectElement>) {
        const lang = e.target.value;
        i18n.changeLanguage(lang);
        localStorage.setItem('language', lang);
    }

    return (
        <aside id={id} className='app-sidebar flex flex-col'>

            <div className='app-sidebar__brand'>
                <svg className='app-sidebar__crest' viewBox='0 0 24 24' aria-hidden='true'>
                    <path d='M12 2 20 5v6c0 5-3.4 9-8 11-4.6-2-8-6-8-11V5z' />
                    <path d='M12 6v11M8.5 9.5h7' />
                </svg>
                Based Turn Game
            </div>

            <nav className='app-sidebar__nav'>
                {visibleItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={onNavigate}
                        className={({ isActive }) => (isActive ? 'app-nav-link app-nav-link--active' : 'app-nav-link')}
                    >
                        <NavIcon name={item.key} />
                        {t(`nav.${item.key}`)}
                    </NavLink>
                ))}
            </nav>

            <div className='app-sidebar__section app-sidebar__lang'>
                <select
                    value={i18n.language}
                    onChange={handleLanguageChange}
                    className='app-sidebar__select'
                >
                    <option value='pt-BR'>🇧🇷 Português</option>
                    <option value='en'>🇺🇸 English</option>
                </select>
            </div>

            {/* Quem está jogando, com a inicial no lugar do retrato, e o botão de sair. */}
            <div className='app-sidebar__section app-sidebar__user'>
                <span className='app-sidebar__avatar' aria-hidden='true'>
                    {user?.name?.trim().charAt(0).toUpperCase()}
                </span>
                <div className='app-sidebar__who'>
                    <span className='app-sidebar__name'>{user?.name}</span>
                    <span className='app-sidebar__meta'>{user?.email}</span>
                </div>
                <button type='button' className='app-sidebar__logout' onClick={() => setIsConfirming(true)} title={t('nav.logout')}>
                    <svg viewBox='0 0 24 24' aria-hidden='true'>
                        <path d='M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M9 8l-4 4 4 4M5 12h10' />
                    </svg>
                    <span className='bt-visually-hidden'>{t('nav.logout')}</span>
                </button>
                <LogoutDialog open={isConfirming} onClose={() => setIsConfirming(false)} />
            </div>
        </aside>
    );
}