import { createContext, useContext, useState, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastContextData {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextData | null>(null);

const STYLES: Record<ToastType, string> = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
}

const ICONS: Record<ToastType, string> = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Date.now();

        setToasts((prev) => [...prev, { id, message, type }]);

        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4000);
    }, []);

    function dismiss(id: number) {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className='fixed top-4 right-4 z-50 flex flex-col gap-2 w-80'>
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`flex items-start gap-3 px-4 py-3 border rounded-xl shadow-sm text-sm animate-fade-in ${STYLES[toast.type]}`}
                    >
                        <span className='font-bold shrink-0 mt-0.5'>
                            {ICONS[toast.type]}
                        </span>
                        <span className="flex-1">{toast.message}</span>
                        <button
                            onClick={() => dismiss(toast.id)}
                            className='shrink-0 opacity-50 hover:opacity-100 transition-opacity'
                        >
                            ✕
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);

    if (!context) {
        throw new Error('useToast deve ser usado dentro de um ToastProvider');
    }

    return context;
}