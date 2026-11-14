import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { InviteNotifier } from './InviteNotifier';
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
    /**
     * Mostra o título no alto da página. As telas que têm o próprio título
     * (Um Jogador, Multijogador, a sala, o painel) passam false.
     */
    heading?: boolean;
}

export function Layout({ title, children, hideMenu = false, heading = true }: LayoutProps) {
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
        <div className={`app-shell flex min-h-screen ${hideMenu ? 'app-shell--hidden-menu' : 'app-shell--hub'}`}>
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
                <main className='app-main flex-1'>
                    {!hideMenu && heading && (
                        <header className='app-page-head'>
                            <h1 className='app-page-title'>{title}</h1>
                        </header>
                    )}
                    {children}
                </main>
                {/* Convite de amigo para sala: aparece em qualquer página. */}
                <InviteNotifier />
            </div>
        </div>
    );
}
