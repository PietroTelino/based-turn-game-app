import type { AvailableAction, BattleState, TeamId } from '@/types/battle';

/**
 * O tutorial é uma batalha de treino contra a IA, com os dois times já
 * escolhidos, e um guia que leva o jogador pela mão. A API marca a batalha
 * como treino (`state.training`), joga com a IA fraca de propósito e usa
 * sempre a mesma semente (TUTORIAL_SEED, em battle.service.ts na API): por
 * isso a batalha guiada sai igual toda vez, e o roteiro abaixo (SCRIPT)
 * encontra em cada passo a situação que ele explica.
 *
 * O começo é guiado: em cada vez do jogador o guia explica uma coisa e só
 * libera uma habilidade e um alvo. Depois do roteiro, a batalha fica livre e
 * o jogador precisa vencer para concluir o tutorial; quem perde refaz.
 *
 * Os times foram escolhidos para a aula funcionar:
 * - o Bárbaro é mais rápido que todos os inimigos, então a primeira vez da
 *   batalha é do jogador, e a lição começa com ele no comando;
 * - o time do jogador tem tanque, cura, golpe em área e efeito de queimadura,
 *   para as dicas de cada coisa terem onde aparecer;
 * - o Guardião ficou de fora do time inimigo: o veneno dele, que já começa em
 *   todo mundo e cresce a cada turno, derrubava quem só usa o ataque básico.
 *
 * A API tem um teste com estes mesmos times (ai.test.ts): quem só usa o
 * ataque básico vence a IA de treino. Se mudar os times aqui, mude lá.
 *
 * A ordem é a de entrada em campo: o primeiro fica na frente.
 */
export const TUTORIAL_TEAM = ['cavaleiro', 'barbaro', 'piromante', 'arqueiro', 'sacerdote'];
export const TUTORIAL_ENEMY_TEAM = ['banshee', 'vampiro', 'espadachim', 'criomante', 'driade'];

/** A parte da tela que a dica aponta: ela ganha um contorno enquanto a dica está aberta. */
export type TutorialFocus = 'teams' | 'queue' | 'energy' | 'skills' | 'targets' | 'passive' | 'statuses' | 'berserk';

/** Uma página de explicação do roteiro. Os textos ficam nas traduções, em `tutorial.script.<id>`. */
export interface TutorialPage {
    id: string;
    focus: TutorialFocus | null;
}

/**
 * Um passo do roteiro: uma vez do jogador. Primeiro o guia mostra as páginas
 * (cada uma com "Próximo"); depois só a habilidade `skillId` fica liberada e,
 * escolhida ela, só o alvo `targetId`. Sem `targetId` a habilidade atinge
 * vários de uma vez, e o jogador confirma no botão Usar.
 *
 * O passo vale quando é o turno `turn` e a vez é do personagem `characterId`
 * do jogador. Se a batalha sair do roteiro (não deveria, mas é o que garante
 * que o tutorial nunca trava), a batalha fica livre.
 */
export interface TutorialStep {
    turn: number;
    characterId: string;
    pages: TutorialPage[];
    skillId: string;
    targetId?: string;
}

/**
 * O roteiro, conferido com a semente do treino: cada jogada abaixo cai
 * exatamente na situação do passo seguinte (quem age, quem está vivo, que
 * efeitos estão em quem). O jogador é o time A (A1 Cavaleiro, A2 Bárbaro,
 * A3 Piromante, A4 Arqueiro, A5 Sacerdote) e o inimigo, o B (B1 Banshee,
 * B2 Vampiro, B3 Espadachim, B4 Criomante, B5 Dríade).
 *
 * Turno 1 (3 de energia): ataque básico, alvo, cura de aliado, passiva,
 * efeito, golpe em área. Turno 2 (4 de energia): energia nova e fila nova,
 * apoio para o time todo, velocidade, atordoamento, falta de energia e
 * personagem derrotado.
 */
export const SCRIPT: TutorialStep[] = [
    {
        turn: 1,
        characterId: 'barbaro',
        pages: [
            { id: 'welcome', focus: 'teams' },
            { id: 'queue', focus: 'queue' },
            { id: 'energy', focus: 'energy' },
            { id: 'skills', focus: 'skills' },
            { id: 'basicAttack', focus: 'skills' },
        ],
        skillId: 'barbaro.machadada',
        targetId: 'B1',
    },
    {
        turn: 1,
        characterId: 'sacerdote',
        pages: [
            { id: 'damage', focus: null },
            { id: 'enemyTurn', focus: 'queue' },
            { id: 'heal', focus: 'energy' },
        ],
        skillId: 'sacerdote.toque-curativo',
        targetId: 'A1',
    },
    {
        turn: 1,
        characterId: 'arqueiro',
        pages: [
            { id: 'passive', focus: 'passive' },
            { id: 'eagleEye', focus: null },
        ],
        skillId: 'arqueiro.flecha',
        targetId: 'B1',
    },
    {
        turn: 1,
        characterId: 'piromante',
        pages: [
            { id: 'status', focus: 'statuses' },
            { id: 'fireball', focus: 'energy' },
        ],
        skillId: 'piromante.bola-de-fogo',
        targetId: 'B2',
    },
    {
        turn: 1,
        characterId: 'cavaleiro',
        pages: [{ id: 'area', focus: 'targets' }],
        skillId: 'cavaleiro.brado-de-guerra',
    },
    {
        turn: 2,
        characterId: 'sacerdote',
        pages: [
            { id: 'newTurn', focus: 'energy' },
            { id: 'speed', focus: 'queue' },
            { id: 'blessing', focus: null },
        ],
        skillId: 'sacerdote.bencao',
    },
    {
        turn: 2,
        characterId: 'arqueiro',
        pages: [{ id: 'slow', focus: null }],
        skillId: 'arqueiro.flecha-incapacitante',
        targetId: 'B1',
    },
    {
        turn: 2,
        characterId: 'barbaro',
        pages: [{ id: 'stun', focus: null }],
        skillId: 'barbaro.golpe-trovejante',
        targetId: 'B3',
    },
    {
        turn: 2,
        characterId: 'piromante',
        pages: [
            { id: 'stunned', focus: 'statuses' },
            { id: 'noEnergy', focus: 'energy' },
            { id: 'combustion', focus: 'passive' },
        ],
        skillId: 'piromante.labareda',
        targetId: 'B1',
    },
    {
        turn: 2,
        characterId: 'cavaleiro',
        pages: [{ id: 'defeated', focus: null }],
        skillId: 'cavaleiro.corte',
        targetId: 'B2',
    },
];

/** O passo do roteiro para a vez de agora, ou `null` se esta vez é livre. */
export function stepFor(state: BattleState, playerTeam: TeamId): { step: TutorialStep; index: number } | null {
    const unit = state.units.find((candidate) => candidate.id === state.activeUnitId);
    if (!unit || unit.team !== playerTeam) return null;

    const index = SCRIPT.findIndex((step) => step.turn === state.turn && step.characterId === unit.characterId);
    const step = SCRIPT[index];

    return step ? { step, index } : null;
}

/** O roteiro já ficou para trás: daqui em diante a batalha é livre. */
export function scriptIsOver(state: BattleState): boolean {
    const last = SCRIPT[SCRIPT.length - 1];

    return last !== undefined && state.turn > last.turn;
}

/**
 * Se a jogada cabe no passo: a habilidade é a do passo e, quando ela pede
 * alvo, o alvo também é. A tela usa isto para não deixar fazer outra coisa.
 */
export function followsStep(step: TutorialStep, action: AvailableAction | null, targetId?: string): boolean {
    if (!action || action.skill.id !== step.skillId) return false;

    return action.requiresTarget ? targetId === step.targetId : true;
}
