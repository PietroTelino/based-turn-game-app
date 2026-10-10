import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import type React from 'react';

interface LayoutProps {
    title: string;
    children: React.ReactNode;
    /**
     * Esconde o menu lateral, que só aparece (por cima da tela) quando o
     * jogador clica no botão "Menu" do cabeçalho. É o que a batalha usa, para
     * as habilidades ocuparem o lugar dele.
     */
    hideMenu?: boolean;
}

export function Layout({ title, children, hideMenu = false }: LayoutProps) {
    const { t } = useTranslation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Esc fecha o menu aberto.
    useEffect(() => {
        if (!isMenuOpen) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsMenuOpen(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isMenuOpen]);

    return (
        <div className={`app-shell flex min-h-screen bg-gray-50 dark:bg-gray-950 ${hideMenu ? 'app-shell--hidden-menu' : ''}`}>
            {hideMenu ? (
                isMenuOpen && (
                    <div className='app-drawer'>
                        <button type='button' className='app-drawer__backdrop' aria-label={t('nav.closeMenu')} tabIndex={-1} onClick={() => setIsMenuOpen(false)} />
                        <Sidebar id='app-menu' onNavigate={() => setIsMenuOpen(false)} />
                    </div>
                )
            ) : (
                <Sidebar />
            )}
            <div className='flex-1 flex flex-col min-w-0'>
                <Header
                    title={title}
                    {...(hideMenu && { menu: { isOpen: isMenuOpen, onToggle: () => setIsMenuOpen((open) => !open) } })}
                />
                <main className='app-main flex-1 p-6'>
                    {children}
                </main>
            </div>
        </div>
    );
}
