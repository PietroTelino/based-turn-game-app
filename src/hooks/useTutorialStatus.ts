import { useEffect, useState } from 'react';
import { getTutorialStatus } from '@/api/tutorial';

/** O último estado conhecido, para trocar de aba sem a tela piscar enquanto pergunta de novo. */
let lastKnown: boolean | null = null;

/**
 * Se o jogador já fez o tutorial. `null` enquanto ainda não se sabe. Pergunta
 * à API a cada tela que usa, porque o tutorial pode ter acabado de terminar.
 * Se a consulta falhar, a tela não trava: quem garante a regra é a API.
 */
export function useTutorialStatus(): boolean | null {
    const [completed, setCompleted] = useState<boolean | null>(lastKnown);

    useEffect(() => {
        let cancelled = false;

        getTutorialStatus()
            .then((status) => {
                lastKnown = status.completed;
                if (!cancelled) setCompleted(status.completed);
            })
            .catch(() => {
                if (!cancelled) setCompleted((current) => current ?? true);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    return completed;
}
