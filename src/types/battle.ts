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
    /** Quantos turnos da própria unidade o status ainda dura. */
    turns: number;
    /** Dano por turno, pontos de escudo ou fração do atributo, conforme o tipo. */
    value: number;
    sourceId: string;
    appliedOnTurn: number;
}

export type SkillEffect =
    | { type: 'damage'; power: number }
    | { type: 'heal'; power: number }
    | { type: 'status'; status: StatusKind; turns: number; power: number; chance?: number; to?: 'target' | 'self' };

export interface Skill {
    id: string;
    name: string;
    description: string;
    energyCost: number;
    target: TargetType;
    effects: SkillEffect[];
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
    actionGauge: number;
    /** Ausente em batalhas gravadas antes de os status existirem. */
    statuses?: StatusEffect[];
    skills: Skill[];
}

export interface BattleState {
    units: BattleUnit[];
    energy: Record<TeamId, number>;
    activeUnitId: string | null;
    turn: number;
    winner: TeamId | null;
}

export type BattleEvent =
    | { type: 'turn_started'; turn: number; unitId: string; team: TeamId; energy: number }
    | { type: 'skill_used'; unitId: string; skillId: string; targetIds: string[]; team: TeamId; energy: number }
    | { type: 'damage'; sourceId: string; targetId: string; amount: number; absorbed: number; critical: boolean; hp: number }
    | { type: 'heal'; sourceId: string; targetId: string; amount: number; hp: number }
    | { type: 'status_applied'; sourceId: string; targetId: string; status: StatusKind; turns: number; value: number }
    | { type: 'status_damage'; targetId: string; status: StatusKind; amount: number; hp: number }
    | { type: 'status_expired'; unitId: string; status: StatusKind }
    | { type: 'statuses_changed'; unitId: string; statuses: StatusEffect[] }
    | { type: 'turn_skipped'; unitId: string; status: StatusKind }
    | { type: 'unit_defeated'; unitId: string }
    | { type: 'battle_ended'; winner: TeamId };

export interface AvailableAction {
    skill: Skill;
    usable: boolean;
    requiresTarget: boolean;
    targetIds: string[];
}

export type BattleStatus = 'in_progress' | 'finished';

export interface BattleView {
    id: string;
    status: BattleStatus;
    winner: TeamId | null;
    playerTeam: TeamId;
    state: BattleState;
    availableActions: AvailableAction[];
    turnOrder: string[];
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
