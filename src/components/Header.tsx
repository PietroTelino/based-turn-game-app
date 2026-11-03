import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LogoutDialog } from './LogoutDialog';

interface HeaderProps {
    title: string;
    /** Botão que abre e fecha o menu, quando ele fica escondido (Layout com hideMenu). */
    menu?: { isOpen: boolean; onToggle: () => void };
}

export function Header({ title, menu }: HeaderProps) {
    const { t } = useTranslation();
    /** A pergunta "Sair da conta?" está aberta. */
    const [isConfirming, setIsConfirming] = useState(false);

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
            <button onClick={() => setIsConfirming(true)} className='app-header__logout'>
                {t('nav.logout')}
            </button>
            <LogoutDialog open={isConfirming} onClose={() => setIsConfirming(false)} />
        </header>
    );
}
