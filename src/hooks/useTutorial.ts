import { useState } from 'react';
import { SCRIPT, scriptIsOver, stepFor } from '@/battle/tutorial';
import type { TutorialFocus, TutorialStep } from '@/battle/tutorial';
import type { AvailableAction, BattleState, BattleView } from '@/types/battle';

interface TutorialInput {
    view: BattleView | null;
    state: BattleState | null;
    canAct: boolean;
    /** A habilidade que o jogador escolheu na barra (ou a primeira, se ele não escolheu). */
    selected: AvailableAction | null;
}

/**
 * Em que ponto do passo o jogador está.
 * - read: lendo as páginas do passo; nada fica liberado.
 * - skill: falta clicar na habilidade do passo.
 * - target: falta clicar no alvo do passo.
 * - confirm: a habilidade atinge vários; falta confirmar no botão Usar.
 */
export type TutorialStage = 'read' | 'skill' | 'target' | 'confirm';

/**
 * O que o guia mostra agora.
 * - page: uma página de explicação do passo (tem "Próximo").
 * - do: o que o jogador tem que clicar agora.
 * - watch: o computador está jogando, ou a tela está animando.
 * - free: o roteiro acabou; agora é vencer a batalha (tem "Entendi").
 * - berserk: o berserk começou na parte livre (tem "Entendi").
 * - idle: parte livre, nada novo para explicar.
 * - done: venceu, o tutorial está concluído. - lost: perdeu ou desistiu; refazer.
 */
export type TutorialGuide =
    | { kind: 'page'; id: string; focus: TutorialFocus | null; move: number; page: number; pages: number }
    | { kind: 'do'; stage: Exclude<TutorialStage, 'read'>; step: TutorialStep; focus: TutorialFocus | null; move: number }
    | { kind: 'free' | 'berserk'; focus: TutorialFocus | null }
    | { kind: 'watch' | 'idle' | 'done' | 'lost'; focus: null };

/**
 * A trava do roteiro: o que o jogador pode fazer nesta vez. `null` quando a
 * batalha está livre.
 */
export interface TutorialLock {
    step: TutorialStep;
    stage: TutorialStage;
}

/** Total de jogadas guiadas, para o "Jogada 3 de 10". */
export const TUTORIAL_MOVES = SCRIPT.length;

/**
 * O guia da batalha de treino. Não guarda nada no servidor: olha a batalha
 * que está na tela, acha o passo do roteiro (src/battle/tutorial.ts) e diz o
 * que mostrar e o que deixar clicar.
 */
export function useTutorial(enabled: boolean, { view, state, canAct, selected }: TutorialInput) {
    /** Em que página está cada passo (pelo índice do passo no roteiro). */
    const [pages, setPages] = useState<Record<number, number>>({});
    /** Os passos em que o jogador já clicou na habilidade certa. */
    const [picked, setPicked] = useState<number[]>([]);
    const [seenFree, setSeenFree] = useState(false);
    const [seenBerserk, setSeenBerserk] = useState(false);

    if (!enabled || !view || !state) return null;

    const current = view.status === 'in_progress' ? stepFor(state, view.playerTeam) : null;
    let guide: TutorialGuide;
    let lock: TutorialLock | null = null;

    if (view.status === 'finished') {
        // Só a vitória conclui o tutorial: perder ou desistir manda refazer.
        guide = { kind: view.winner === view.playerTeam ? 'done' : 'lost', focus: null };
    } else if (current) {
        const { step, index } = current;
        const page = pages[index] ?? 0;
        const move = index + 1;
        const hasPicked = picked.includes(index) && selected?.skill.id === step.skillId;
        const stage: TutorialStage =
            page < step.pages.length ? 'read' : !hasPicked ? 'skill' : selected?.requiresTarget ? 'target' : 'confirm';
        const shownPage = step.pages[page];

        lock = { step, stage };

        if (!canAct) {
            // A vez já é do jogador, mas a tela ainda está animando a jogada anterior.
            guide = { kind: 'watch', focus: null };
        } else if (stage === 'read' && shownPage) {
            guide = { kind: 'page', ...shownPage, move, page: page + 1, pages: step.pages.length };
        } else {
            const doStage = stage === 'read' ? 'skill' : stage;

            guide = { kind: 'do', stage: doStage, step, focus: doStage === 'skill' ? 'skills' : 'targets', move };
        }
    } else if (!scriptIsOver(state)) {
        // Ainda no começo, mas é a vez do computador.
        guide = { kind: 'watch', focus: null };
    } else if (!seenFree) {
        guide = { kind: 'free', focus: null };
    } else if (state.fury > 0 && !seenBerserk) {
        guide = { kind: 'berserk', focus: 'berserk' };
    } else {
        guide = { kind: 'idle', focus: null };
    }

    return {
        guide,
        lock,
        /** "Próximo" e "Entendi": a próxima página do passo, ou dispensa o aviso da parte livre. */
        advance: () => {
            if (guide.kind === 'page' && current) {
                const { index } = current;

                setPages((all) => ({ ...all, [index]: (all[index] ?? 0) + 1 }));
            } else if (guide.kind === 'free') {
                setSeenFree(true);
            } else if (guide.kind === 'berserk') {
                setSeenBerserk(true);
            }
        },
        /** O jogador clicou numa habilidade: se é a do passo, o passo segue para o alvo. */
        notePick: (skillId: string) => {
            if (current && current.step.skillId === skillId) {
                const { index } = current;

                setPicked((all) => (all.includes(index) ? all : [...all, index]));
            }
        },
    };
}
