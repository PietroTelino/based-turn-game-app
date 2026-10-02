import { createContext, useContext, useState } from 'react';

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

const CONFIRM_BUTTON_STYLES: Record<string, string> = {
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    warning: 'bg-yellow-500 hover:bg-yellow-600 text-white',
    info: 'bg-blue-600 hover:bg-blue-700 text-white',
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
    const [options, setOptions] = useState<ConfirmOptions | null>(null);

    const [resolveRef, setResolveRef] = useState<((value: boolean) => void) | null>(null);

    function confirm(opts: ConfirmOptions): Promise<boolean> {
        setOptions(opts);

        return new Promise((resolve) => {
            setResolveRef(() => resolve);
        });
    }

    function handleConfirm() {
        resolveRef?.(true);
        setOptions(null);
        setResolveRef(null);
    }

    function handleCancel() {
        resolveRef?.(false);
        setOptions(null);
        setResolveRef(null);
    }

    const variant = options?.variant ?? 'danger';

    return (
        <ConfirmContext.Provider value={{ confirm }}>
            {children}

            {options && (
                <div className='fixed inset-0 z-50 flex items-center justify-center'>
                    <div
                        className='absolute inset-0 bg-black/40'
                        onClick={handleCancel}
                    />
                    <div className='relative bg-white rounded-2xl shadow-lg w-full max-w-sm mx-4 p-6 flex flex-col gap-4'>
                        <h2 className='text-base font-semibold text-gray-900'>
                            {options.title}
                        </h2>
                        <p className='text-sm text-gray-600'>
                            {options.message}
                        </p>
                        <div className='flex gap-2 justify-end'>
                            <button
                                onClick={handleCancel}
                                className='px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors'
                            >
                                {options.cancelLabel ?? 'Cancelar'}
                            </button>
                            <button
                                onClick={handleConfirm}
                                className={`px-4 py-2 text-sm rounded-lg transition-colors ${CONFIRM_BUTTON_STYLES[variant]}`}
                            >
                                {options.confirmLabel ?? 'Confirmar'}
                            </button>
                        </div>
                    </div>
                </div>
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