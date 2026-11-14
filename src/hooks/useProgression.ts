import { useEffect, useSyncExternalStore } from 'react';
import { getProgression } from '@/api/progression';
import type { Progression } from '@/api/progression';

/**
 * A progressão do jogador, guardada fora do React para todas as telas verem o
 * mesmo saldo (a barra lateral, a loja, as conquistas). `refreshProgression`
 * pergunta de novo à API; `setProgression` usa a resposta de uma compra.
 */
let current: Progression | null = null;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

export function setProgression(next: Progression): void {
    current = next;
    for (const listener of listeners) listener();
}

export function refreshProgression(): Promise<void> {
    loading ??= getProgression()
        .then(setProgression)
        .catch(() => undefined)
        .finally(() => {
            loading = null;
        });

    return loading;
}

/** Ao sair da conta, o próximo jogador não vê o saldo do anterior. */
export function clearProgression(): void {
    current = null;
    for (const listener of listeners) listener();
}

export function useProgression(): Progression | null {
    const value = useSyncExternalStore(
        (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        () => current,
    );

    useEffect(() => {
        void refreshProgression();
    }, []);

    return value;
}
