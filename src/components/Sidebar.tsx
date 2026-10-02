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
        <aside className='w-60 min-h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col'>

            <div className='h-16 flex items-center px-6 border-b border-gray-200 dark:border-gray-800'>
                <span className='text-lg font-bold text-gray-900 dark:text-white'>MyApp</span>
            </div>

            <nav className='flex-1 px-3 py-4 flex flex-col gap-1'>
                {visibleItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `
                            flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
                            ${isActive
                                ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                            }
                        `}
                    >
                        {t(`nav.${item.key}`)}
                    </NavLink>
                ))}
            </nav>

            <div className='px-4 py-3 border-t border-gray-200 dark:border-gray-800'>
                <select
                    value={i18n.language}
                    onChange={handleLanguageChange}
                    className='
                        w-full text-xs px-2 py-1.5 rounded-lg border
                        border-gray-200 dark:border-gray-700
                        bg-white dark:bg-gray-800
                        text-gray-600 dark:text-gray-400
                        outline-none cursor-pointer
                    '
                >
                    <option value='pt-BR'>🇧🇷 Português</option>
                    <option value='en'>🇺🇸 English</option>
                </select>
            </div>

            <div className='px-4 py-4 border-t border-gray-200 dark:border-gray-800'>
                <div className='flex flex-col gap-0.5'>
                    <span className='text-sm font-medium text-gray-900 dark:text-white truncate'>
                        {user?.name}
                    </span>
                    <span className='text-xs text-gray-500 dark:text-gray-400 truncate'>{user?.email}</span>
                    <span className='text-xs text-gray-400 dark:text-gray-500 capitalize'>{user?.role}</span>
                </div>
            </div>
        </aside>
    );
}