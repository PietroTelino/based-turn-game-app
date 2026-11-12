import { useSyncExternalStore } from 'react';
import type { LoadProgress } from './assets3d';

/**
 * O carregamento de todos os modelos 3D, feito uma vez logo depois de entrar
 * no jogo. Fica fora do React para valer na página inteira: trocar de tela,
 * sair e entrar de novo não carrega outra vez (os modelos ficam na memória).
 *
 * O three.js só é baixado aqui, sob demanda, e não junto com o resto do app.
 */
export interface PreloadState {
    status: 'idle' | 'loading' | 'ready';
    progress: LoadProgress;
}

let state: PreloadState = { status: 'idle', progress: { done: 0, total: 0, loaded: 0, bytes: 0 } };
const listeners = new Set<() => void>();

function set(next: Partial<PreloadState>) {
    state = { ...state, ...next };
    for (const listener of listeners) listener();
}

export function startModelPreload(): void {
    if (state.status !== 'idle') return;

    set({ status: 'loading' });

    import('./assets3d')
        .then(({ loadAllModels }) => loadAllModels((progress) => set({ progress })))
        // Sem 3D (falha de rede ou do navegador): libera o jogo; a batalha tenta de novo.
        .catch(() => undefined)
        .finally(() => set({ status: 'ready' }));
}

export function useModelPreload(): PreloadState {
    return useSyncExternalStore(
        (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        () => state,
    );
}
