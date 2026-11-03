import { createContext, useContext, useEffect, useRef, useState } from 'react';

interface ConfirmOptions {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
}

interface ConfirmContextData {
    confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextData | null>(null);

/** O ícone no alto da caixa, pelo tipo da pergunta (traço, 24 x 24). */
const ICONS: Record<NonNullable<ConfirmOptions['variant']>, React.ReactNode> = {
    // Bandeira: desistir, encerrar, apagar.
    danger: <path d='M5 21V4M5 4h11l-2 4 2 4H5' />,
    warning: <path d='M12 3 2 20h20zM12 10v4M12 17h.01' />,
    info: <path d='M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v6M12 7.5h.01' />,
};

/**
 * As perguntas de confirmação do jogo (desistir da batalha, encerrar uma
 * sessão...), todas na mesma caixa da confirmação de sair da conta: o
 * <dialog> do navegador aberto como modal, que fica por cima de tudo, prende o
 * foco e fecha com Esc. O foco começa em "cancelar", para Enter sem querer não
 * confirmar uma ação sem volta.
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
    const [options, setOptions] = useState<ConfirmOptions | null>(null);
    const resolveRef = useRef<((value: boolean) => void) | null>(null);
    const dialogRef = useRef<HTMLDialogElement>(null);

    function confirm(opts: ConfirmOptions): Promise<boolean> {
        // Uma pergunta nova no lugar de outra ainda aberta: a antiga conta como "não".
        resolveRef.current?.(false);
        setOptions(opts);

        return new Promise((resolve) => {
            resolveRef.current = resolve;
        });
    }

    function answer(value: boolean) {
        resolveRef.current?.(value);
        resolveRef.current = null;
        setOptions(null);
    }

    useEffect(() => {
        const dialog = dialogRef.current;

        if (dialog && options && !dialog.open) dialog.showModal();
    }, [options]);

    const variant = options?.variant ?? 'danger';

    return (
        <ConfirmContext.Provider value={{ confirm }}>
            {children}

            {options && (
                <dialog
                    ref={dialogRef}
                    className={`ui-dialog ui-dialog--${variant}`}
                    aria-labelledby='confirm-title'
                    aria-describedby='confirm-text'
                    onCancel={(event) => {
                        event.preventDefault();
                        answer(false);
                    }}
                    // Clique fora da caixa (no fundo escurecido) também desiste.
                    onClick={(event) => {
                        if (event.target === event.currentTarget) answer(false);
                    }}
                >
                    <div className='ui-dialog__box'>
                        <svg className='ui-dialog__icon' viewBox='0 0 24 24' aria-hidden='true'>
                            {ICONS[variant]}
                        </svg>
                        <h2 id='confirm-title' className='ui-dialog__title'>
                            {options.title}
                        </h2>
                        <p id='confirm-text' className='ui-dialog__text'>
                            {options.message}
                        </p>
                        <div className='ui-dialog__buttons'>
                            <button type='button' className='ui-dialog__button' autoFocus onClick={() => answer(false)}>
                                {options.cancelLabel ?? 'Cancelar'}
                            </button>
                            <button
                                type='button'
                                className={`ui-dialog__button ${variant === 'danger' ? 'ui-dialog__button--danger' : 'ui-dialog__button--primary'}`}
                                onClick={() => answer(true)}
                            >
                                {options.confirmLabel ?? 'Confirmar'}
                            </button>
                        </div>
                    </div>
                </dialog>
            )}
        </ConfirmContext.Provider>
    );
}

export function useConfirm() {
    const context = useContext(ConfirmContext);

    if (!context) {
        throw new Error('useConfirm deve ser usado dentro de um ConfirmProvider');
    }

    return context;
}