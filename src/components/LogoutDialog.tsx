import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';

interface LogoutDialogProps {
    open: boolean;
    onClose: () => void;
}

/**
 * A pergunta antes de sair da conta. Usa o <dialog> do navegador aberto como
 * modal: ele fica por cima de tudo, prende o foco dentro dele e fecha com Esc.
 * O foco começa em "Continuar jogando", para Enter sem querer não deslogar.
 */
export function LogoutDialog({ open, onClose }: LogoutDialogProps) {
    const { t } = useTranslation();
    const { logout } = useAuth();
    const navigate = useNavigate();
    const ref = useRef<HTMLDialogElement>(null);
    const [isLeaving, setIsLeaving] = useState(false);

    useEffect(() => {
        const dialog = ref.current;

        if (!dialog) return;
        if (open && !dialog.open) dialog.showModal();
        if (!open && dialog.open) dialog.close();
    }, [open]);

    async function confirm() {
        setIsLeaving(true);

        try {
            await logout();
            navigate('/login');
        } finally {
            setIsLeaving(false);
            onClose();
        }
    }

    return (
        <dialog
            ref={ref}
            className='ui-dialog'
            aria-labelledby='logout-title'
            aria-describedby='logout-text'
            // Esc: o navegador fecha sozinho; aqui só avisa quem abriu.
            onCancel={(event) => {
                event.preventDefault();
                if (!isLeaving) onClose();
            }}
            // Clique fora da caixa (no fundo escurecido) também desiste.
            onClick={(event) => {
                if (event.target === event.currentTarget && !isLeaving) onClose();
            }}
        >
            <div className='ui-dialog__box'>
                <svg className='ui-dialog__icon' viewBox='0 0 24 24' aria-hidden='true'>
                    <path d='M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M9 8l-4 4 4 4M5 12h10' />
                </svg>
                <h2 id='logout-title' className='ui-dialog__title'>
                    {t('logoutConfirm.title')}
                </h2>
                <p id='logout-text' className='ui-dialog__text'>
                    {t('logoutConfirm.text')}
                </p>
                <div className='ui-dialog__buttons'>
                    <button type='button' className='ui-dialog__button' autoFocus disabled={isLeaving} onClick={onClose}>
                        {t('logoutConfirm.stay')}
                    </button>
                    <button type='button' className='ui-dialog__button ui-dialog__button--danger' disabled={isLeaving} onClick={confirm}>
                        {t(isLeaving ? 'logoutConfirm.leaving' : 'logoutConfirm.leave')}
                    </button>
                </div>
            </div>
        </dialog>
    );
}
