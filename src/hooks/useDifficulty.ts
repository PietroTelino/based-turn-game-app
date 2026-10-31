import { useState } from 'react';
import { AI_DIFFICULTIES } from '@/types/battle';
import type { AiDifficulty } from '@/types/battle';

const STORAGE_KEY = 'bt-difficulty';

function load(): AiDifficulty {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        return AI_DIFFICULTIES.find((difficulty) => difficulty === saved) ?? 'normal';
    } catch {
        return 'normal';
    }
}

/**
 * O nível da IA escolhido no single player. Fica guardado no navegador: a
 * partida rápida e a campanha começam no último nível usado.
 */
export function useDifficulty(): [AiDifficulty, (difficulty: AiDifficulty) => void] {
    const [difficulty, setDifficulty] = useState<AiDifficulty>(load);

    function change(next: AiDifficulty) {
        setDifficulty(next);

        try {
            localStorage.setItem(STORAGE_KEY, next);
        } catch {
            // Sem acesso ao armazenamento (navegação privada): vale só nesta tela.
        }
    }

    return [difficulty, change];
}
