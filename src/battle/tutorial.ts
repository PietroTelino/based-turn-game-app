import type { AvailableAction, BattleState, TeamId } from '@/types/battle';

/**
 * O tutorial é uma batalha de treino contra a IA, com os dois times já
 * escolhidos, e um guia que explica a tela enquanto o jogador joga. A API
 * marca a batalha como treino (`state.training`) e nela a IA joga fraco de
 * propósito: a ideia é o iniciante vencer mesmo errando bastante.
 *
 * Os times foram escolhidos para a aula funcionar:
 * - o Bárbaro é mais rápido que todos os inimigos, então a primeira vez da
 *   batalha é do jogador, e a lição começa com ele no comando;
 * - o time do jogador tem tanque, cura, golpe em área e efeito de queimadura,
 *   para as dicas de cada coisa terem onde aparecer.
 *
 * A API tem um teste com estes mesmos times (ai.test.ts): quem só usa o
 * ataque básico vence a IA de treino. Se mudar os times aqui, mude lá.
 *
 * A ordem é a de entrada em campo: o primeiro fica na frente.
 */
export const TUTORIAL_TEAM = ['cavaleiro', 'barbaro', 'piromante', 'arqueiro', 'clerigo'];
export const TUTORIAL_ENEMY_TEAM = ['guardiao', 'vampiro', 'espadachim', 'criomante', 'driade'];

/** A parte da tela que a dica aponta: ela ganha um contorno enquanto a dica está aberta. */
export type TutorialFocus = 'teams' | 'queue' | 'energy' | 'skills' | 'targets' | 'statuses' | 'berserk';

/** Os textos de cada dica ficam nas traduções, em `tutorial.tips.<id>`. */
export type TutorialTipId =
    | 'welcome'
    | 'queue'
    | 'energy'
    | 'skills'
    | 'target'
    | 'damage'
    | 'area'
    | 'allySkill'
    | 'noEnergy'
    | 'status'
    | 'newTurn'
    | 'defeated'
    | 'berserk';

export interface TutorialTip {
    id: TutorialTipId;
    focus: TutorialFocus | null;
}

/** A lição do começo: uma dica por vez, nesta ordem, antes da primeira jogada. */
export const LESSON: TutorialTip[] = [
    { id: 'welcome', focus: 'teams' },
    { id: 'queue', focus: 'queue' },
    { id: 'energy', focus: 'energy' },
    { id: 'skills', focus: 'skills' },
    { id: 'target', focus: 'targets' },
];

/** O que o guia olha na batalha para decidir que dica mostrar. */
export interface TutorialSituation {
    state: BattleState;
    playerTeam: TeamId;
    /** É a vez do jogador e a tela está parada. */
    canAct: boolean;
    actions: AvailableAction[];
    selected: AvailableAction | null;
    /** O jogador já fez a primeira jogada. */
    hasPlayed: boolean;
}

/**
 * As dicas de depois da lição: cada uma aparece quando a situação acontece e
 * fica até o jogador dizer que entendeu. Quando há mais de uma, vale a
 * primeira da lista: primeiro o que tem a ver com a escolha que o jogador
 * está fazendo agora, depois o que acabou de acontecer na batalha.
 */
const MOMENTS: { tip: TutorialTip; happens: (situation: TutorialSituation) => boolean }[] = [
    {
        tip: { id: 'area', focus: 'targets' },
        happens: ({ canAct, selected }) => canAct && selected !== null && !selected.requiresTarget && selected.targetIds.length > 1,
    },
    {
        tip: { id: 'allySkill', focus: 'targets' },
        happens: ({ canAct, selected, state, playerTeam }) =>
            canAct &&
            selected !== null &&
            selected.requiresTarget &&
            selected.targetIds.length > 0 &&
            selected.targetIds.every((id) => state.units.find((unit) => unit.id === id)?.team === playerTeam),
    },
    {
        tip: { id: 'damage', focus: null },
        happens: ({ hasPlayed }) => hasPlayed,
    },
    {
        tip: { id: 'status', focus: 'statuses' },
        happens: ({ state }) => state.units.some((unit) => unit.hp > 0 && (unit.statuses?.length ?? 0) > 0),
    },
    {
        tip: { id: 'noEnergy', focus: 'energy' },
        happens: ({ canAct, actions }) => canAct && actions.some((action) => !action.usable),
    },
    {
        tip: { id: 'newTurn', focus: 'energy' },
        happens: ({ state }) => state.turn >= 2,
    },
    {
        tip: { id: 'defeated', focus: null },
        happens: ({ state }) => state.units.some((unit) => unit.hp <= 0),
    },
    {
        tip: { id: 'berserk', focus: 'berserk' },
        happens: ({ state }) => state.fury > 0,
    },
];

/** A dica de situação a mostrar agora, fora as que o jogador já dispensou. */
export function momentTip(situation: TutorialSituation, dismissed: TutorialTipId[]): TutorialTip | null {
    return MOMENTS.find(({ tip, happens }) => !dismissed.includes(tip.id) && happens(situation))?.tip ?? null;
}
