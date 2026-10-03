/**
 * Formatos que a API de batalhas devolve.
 * São o espelho de src/game/types.ts e src/modules/battles/battle.types.ts
 * no repositório da API: se mudar lá, mude aqui.
 */

export type TeamId = 'A' | 'B';

export interface Stats {
    maxHp: number;
    atk: number;
    def: number;
    speed: number;
    critChance: number;
    critDamage: number;
}

export type TargetType = 'single-enemy' | 'all-enemies' | 'single-ally' | 'all-allies' | 'self';

export type StatusKind =
    | 'stun'
    | 'burn'
    | 'poison'
    | 'shield'
    | 'atk_up'
    | 'atk_down'
    | 'def_up'
    | 'def_down'
    | 'speed_up'
    | 'speed_down';

export interface StatusEffect {
    kind: StatusKind;
    /** Quantos turnos o status ainda dura. Gasta um cada vez que a unidade termina a própria vez. */
    turns: number;
    /** Dano por turno, pontos de escudo ou fração do atributo, conforme o tipo. */
    value: number;
    sourceId: string;
    appliedOnStep: number;
}

export type SkillEffect =
    | { type: 'damage'; power: number; drain?: number }
    | { type: 'heal'; power: number }
    | { type: 'status'; status: StatusKind; turns: number; power: number; chance?: number; to?: 'target' | 'self' };

/** Só escolhe o efeito visual e o som; não entra em nenhuma conta. */
export type SkillElement = 'physical' | 'fire' | 'ice' | 'lightning' | 'nature' | 'light' | 'shadow';

export interface Skill {
    id: string;
    name: string;
    description: string;
    energyCost: number;
    target: TargetType;
    effects: SkillEffect[];
    /** Ausente em batalhas gravadas antes de os elementos existirem. */
    element?: SkillElement;
    /** Golpe à distância: num alvo só, um projétil; em área, uma chuva de projéteis. */
    ranged?: boolean;
}

export type CharacterRole = 'attacker' | 'tank' | 'support' | 'assassin' | 'mage' | 'fighter';

export interface Character {
    id: string;
    name: string;
    role: CharacterRole;
    stats: Stats;
    skills: Skill[];
}

export interface BattleUnit {
    id: string;
    characterId: string;
    name: string;
    team: TeamId;
    stats: Stats;
    hp: number;
    /** Ausente em batalhas gravadas antes de os status existirem. */
    statuses?: StatusEffect[];
    skills: Skill[];
}

export interface BattleState {
    units: BattleUnit[];
    /** Energia que cada time ainda tem para gastar neste turno. */
    energy: Record<TeamId, number>;
    /** Com quanta energia os dois times começaram este turno (3 no turno 1, mais 1 por turno, até 10). */
    turnEnergy: number;
    activeUnitId: string | null;
    /** Turno atual: uma rodada em que cada unidade viva age uma vez. Começa em 1. */
    turn: number;
    /**
     * Berserk (a "fúria" do motor): quanto o dano das habilidades está aumentado
     * neste turno. 0 = ainda não começou, 0.5 = +50%, 1 = +100%.
     */
    fury: number;
    /**
     * Ordem de ação do turno atual. Quem vem antes de `activeUnitId` já agiu.
     * Pode mudar no meio do turno, se a velocidade de alguém mudar.
     */
    order: string[];
    /** Contador de vezes da batalha inteira; só cresce. */
    step: number;
    winner: TeamId | null;
    /** Preenchido quando a batalha acabou porque um time desistiu. */
    surrenderedBy?: TeamId;
    /** Batalha de treino (o tutorial): a IA joga fraco e a tela mostra o guia. */
    training?: boolean;
}

export type BattleEvent =
    /** Um turno novo começou, com a ordem de ação dele e a energia que os dois times recebem. */
    | { type: 'turn_started'; turn: number; order: string[]; energy: number; fury: number }
    /** A velocidade de alguém mudou e quem ainda não agiu foi reordenado. */
    | { type: 'order_changed'; order: string[] }
    /** Chegou a vez de uma unidade. */
    | { type: 'unit_activated'; unitId: string; team: TeamId }
    | { type: 'skill_used'; unitId: string; skillId: string; targetIds: string[]; team: TeamId; energy: number }
    | { type: 'damage'; sourceId: string; targetId: string; amount: number; absorbed: number; critical: boolean; hp: number }
    | { type: 'heal'; sourceId: string; targetId: string; amount: number; hp: number }
    | { type: 'status_applied'; sourceId: string; targetId: string; status: StatusKind; turns: number; value: number }
    | { type: 'status_damage'; targetId: string; status: StatusKind; amount: number; hp: number }
    | { type: 'status_expired'; unitId: string; status: StatusKind }
    | { type: 'statuses_changed'; unitId: string; statuses: StatusEffect[] }
    /** A unidade perdeu a vez (atordoada). */
    | { type: 'unit_skipped'; unitId: string; status: StatusKind }
    | { type: 'unit_defeated'; unitId: string }
    | { type: 'surrendered'; team: TeamId }
    | { type: 'battle_ended'; winner: TeamId };

/**
 * Os números da habilidade para quem está na vez: dano e cura "base", com o
 * ataque atual de quem usa, sem contar a defesa do alvo nem o crítico.
 */
export interface SkillPreview {
    damage: number | null;
    heal: number | null;
}

export interface AvailableAction {
    skill: Skill;
    preview: SkillPreview;
    usable: boolean;
    requiresTarget: boolean;
    targetIds: string[];
}

export type BattleStatus = 'in_progress' | 'finished';

/** ai: contra o computador. pvp: entre dois jogadores, criada a partir de uma sala. */
export type BattleMode = 'ai' | 'pvp';

export interface BattleView {
    id: string;
    status: BattleStatus;
    winner: TeamId | null;
    mode: BattleMode;
    /** De que lado está quem pediu. Contra a IA é sempre "A"; entre jogadores, quem entrou na sala é "B". */
    playerTeam: TeamId;
    state: BattleState;
    /** As jogadas da unidade da vez. Vazio quando a vez é do outro jogador. */
    availableActions: AvailableAction[];
    /**
     * Quantos eventos a batalha já teve. Entre jogadores, é a partir daqui que
     * a tela pergunta pelo que o outro fez (`getBattleEvents`). Contra a IA é 0.
     */
    cursor: number;
    createdAt: string;
    updatedAt: string;
    finishedAt: string | null;
}

export interface BattleResponse {
    battle: BattleView;
    events: BattleEvent[];
}

export interface BattleSummary {
    id: string;
    status: BattleStatus;
    winner: TeamId | null;
    mode: BattleMode;
    playerTeam: TeamId;
    turn: number;
    createdAt: string;
    updatedAt: string;
    finishedAt: string | null;
}

export interface BattleActionInput {
    unitId: string;
    skillId: string;
    targetId?: string;
}
