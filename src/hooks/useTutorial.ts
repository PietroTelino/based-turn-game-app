import { useState } from 'react';
import { LESSON, momentTip } from '@/battle/tutorial';
import type { TutorialFocus, TutorialTipId } from '@/battle/tutorial';
import type { AvailableAction, BattleState, BattleView } from '@/types/battle';

/** `state.step` de uma batalha em que ninguém jogou ainda. */
const FIRST_STEP = 1;

interface TutorialInput {
    view: BattleView | null;
    state: BattleState | null;
    canAct: boolean;
    actions: AvailableAction[];
    selected: AvailableAction | null;
}

/**
 * O que o guia mostra agora.
 * - lesson: um passo da lição do começo (tem "Próximo", menos no último, que espera a jogada).
 * - moment: dica de uma situação que acabou de acontecer (tem "Entendi").
 * - idle: nada novo para explicar. - done: a batalha acabou.
 */
export type TutorialGuide =
    | { kind: 'lesson'; id: TutorialTipId; focus: TutorialFocus | null; step: number; total: number; hasNext: boolean }
    | { kind: 'moment'; id: TutorialTipId; focus: TutorialFocus | null }
    | { kind: 'opening' | 'idle' | 'done'; focus: null };

/**
 * O guia da batalha de treino. Não guarda nada no servidor: olha a batalha
 * que está na tela e decide que dica mostrar (ver src/battle/tutorial.ts).
 */
export function useTutorial(enabled: boolean, { view, state, canAct, actions, selected }: TutorialInput) {
    const [lessonStep, setLessonStep] = useState(0);
    const [hasActed, setHasActed] = useState(false);
    const [dismissed, setDismissed] = useState<TutorialTipId[]>([]);

    if (!enabled || !view || !state) return null;

    // Quem recarrega a página no meio do treino não volta para a lição do começo.
    const hasPlayed = hasActed || view.state.step > FIRST_STEP;
    let guide: TutorialGuide;

    if (view.status === 'finished') {
        guide = { kind: 'done', focus: null };
    } else if (!hasPlayed && lessonStep < LESSON.length) {
        const tip = LESSON[lessonStep];

        // A lição espera a abertura acabar: começa quando o jogador pode agir.
        guide =
            canAct && tip
                ? { kind: 'lesson', ...tip, step: lessonStep + 1, total: LESSON.length, hasNext: lessonStep < LESSON.length - 1 }
                : { kind: 'opening', focus: null };
    } else {
        const tip = momentTip({ state, playerTeam: view.playerTeam, canAct, actions, selected, hasPlayed }, dismissed);

        guide = tip ? { kind: 'moment', ...tip } : { kind: 'idle', focus: null };
    }

    return {
        guide,
        /** Passa para a próxima dica: o passo seguinte da lição, ou dispensa a dica de situação. */
        advance: () => {
            if (guide.kind === 'lesson') {
                setLessonStep((current) => current + 1);
            } else if (guide.kind === 'moment') {
                const { id } = guide;

                setDismissed((current) => [...current, id]);
            }
        },
        /** O jogador jogou: a lição do começo acabou, tenha ele lido tudo ou não. */
        noteAction: () => setHasActed(true),
    };
}
