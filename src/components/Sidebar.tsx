import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
    label: string;
    key: string;
    path: string;
    roles?: Array<'user' | 'administrator' | 'god'>;
}

const navItems: NavItem[] = [
    { key: 'dashboard', label: 'Dashboard', path: '/dashboard' },
    { key: 'play', label: 'Jogar', path: '/play' },
    { key: 'multiplayer', label: 'Multiplayer', path: '/multiplayer' },
    { key: 'ranked', label: 'Ranqueada', path: '/ranked' },
    { key: 'tutorial', label: 'Tutorial', path: '/tutorial' },
    { key: 'profile', label: 'Perfil', path: '/profile' },
    { key: 'sessions', label: 'Sessões', path: '/sessions' },
    { key: 'users', label: 'Usuários', path: '/users', roles: ['administrator', 'god'] },
    { key: 'audit', label: 'Auditoria', path: '/audit', roles: ['administrator', 'god'] },
];

export function Sidebar() {
    const { user } = useAuth();
    const { t, i18n } = useTranslation();

    const visibleItems = navItems.filter((items) => {
        if (!items.roles) return true;
        return user?.role && items.roles.includes(user.role);
    });

    function handleLanguageChange(e: React.ChangeEvent<HTMLSelectElement>) {
        const lang = e.target.value;
        console.log('Mudando para:', lang);
        i18n.changeLanguage(lang);
        console.log('Idioma atual após mudança:', i18n.language);
        localStorage.setItem('language', lang);
    }

    return (
        <aside className='app-sidebar w-60 min-h-screen flex flex-col'>

            <div className='app-sidebar__brand'>Based Turn Game</div>

            <nav className='app-sidebar__nav flex-1 px-3 py-4 flex flex-col gap-1'>
                {visibleItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => (isActive ? 'app-nav-link app-nav-link--active' : 'app-nav-link')}
                    >
                        {t(`nav.${item.key}`)}
                    </NavLink>
                ))}
            </nav>

            <div className='app-sidebar__section app-sidebar__lang px-4 py-3'>
                <select
                    value={i18n.language}
                    onChange={handleLanguageChange}
                    className='app-sidebar__select'
                >
                    <option value='pt-BR'>🇧🇷 Português</option>
                    <option value='en'>🇺🇸 English</option>
                </select>
            </div>

            <div className='app-sidebar__section app-sidebar__user px-4 py-4'>
                <div className='flex flex-col gap-0.5'>
                    <span className='app-sidebar__name truncate'>{user?.name}</span>
                    <span className='app-sidebar__meta truncate'>{user?.email}</span>
                    <span className='app-sidebar__meta capitalize'>{user?.role}</span>
                </div>
            </div>
        </aside>
    );
}