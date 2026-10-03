import type { BattleEvent, BattleUnit, Skill, SkillElement, StatusKind } from '@/types/battle';

/**
 * Efeitos visuais da batalha, descritos como dados. A tela (FxLayer,
 * UnitToken) só desenha o que está aqui; o som (battle/sounds.ts) lê os
 * mesmos dados. Nada disto muda o resultado do jogo.
 */

/** Como a habilidade chega no alvo. */
export type Delivery = 'melee' | 'projectile' | 'area' | 'cast';

/** A habilidade que está sendo usada agora: vale do anúncio até o fim do impacto. */
export interface SkillFx {
    id: number;
    element: SkillElement;
    delivery: Delivery;
    /** Ataque em área feito de projéteis (chuva de flechas): cai do alto em vez de usar o desenho do elemento. */
    rain: boolean;
    sourceId: string;
    targetIds: string[];
    /** Não é uma habilidade: é a passiva de começo de vez da unidade agindo sozinha. */
    passive: boolean;
}

export type ImpactKind = 'hit' | 'tick' | 'heal' | 'shield' | 'boon' | 'bane';

/** O que aparece em cima de uma unidade quando algo a atinge. */
export interface Impact {
    id: number;
    unitId: string;
    element: SkillElement;
    kind: ImpactKind;
    critical: boolean;
}

export function deliveryOf(skill: Skill | undefined): Delivery {
    if (!skill || skill.target === 'single-enemy') return skill?.ranged ? 'projectile' : 'melee';
    if (skill.target === 'all-enemies') return 'area';

    return 'cast';
}

export function skillFxOf(event: Extract<BattleEvent, { type: 'skill_used' }>, units: Map<string, BattleUnit>, id: number): SkillFx {
    const skill = units.get(event.unitId)?.skills.find((s) => s.id === event.skillId);

    const delivery = deliveryOf(skill);

    return {
        id,
        element: skill?.element ?? 'physical',
        delivery,
        rain: delivery === 'area' && skill?.ranged === true,
        sourceId: event.unitId,
        targetIds: event.targetIds,
        passive: false,
    };
}

/**
 * Uma passiva de começo de vez é animada como uma habilidade: a cura em área
 * como um feitiço, o golpe num inimigo como projétil ou investida. As outras
 * passivas mudam um golpe que já está sendo animado: para elas não há nada
 * novo a desenhar, e a função devolve null.
 */
export function passiveFxOf(event: Extract<BattleEvent, { type: 'passive_triggered' }>, units: Map<string, BattleUnit>, id: number): SkillFx | null {
    const passive = units.get(event.unitId)?.passives?.find((p) => p.id === event.passiveId);

    if (!passive || passive.effect.type !== 'turn_start' || event.targetIds.length === 0) {
        return null;
    }

    const onAllies = passive.effect.target === 'all-allies';

    return {
        id,
        element: passive.element ?? 'physical',
        delivery: onAllies ? 'cast' : passive.ranged ? 'projectile' : 'melee',
        rain: false,
        sourceId: event.unitId,
        targetIds: event.targetIds,
        passive: true,
    };
}

const STATUS_ELEMENT: Partial<Record<StatusKind, SkillElement>> = { burn: 'fire', poison: 'nature' };
const GOOD_STATUS: StatusKind[] = ['atk_up', 'def_up', 'speed_up'];

/** Quando várias coisas atingem a mesma unidade no mesmo instante, a mais forte aparece. */
const PRIORITY: ImpactKind[] = ['hit', 'tick', 'heal', 'shield', 'boon', 'bane'];

export function impactsOf(events: BattleEvent[], skill: SkillFx | null, nextId: () => number): Impact[] {
    const byUnit = new Map<string, Impact>();

    const add = (unitId: string, kind: ImpactKind, element: SkillElement, critical = false) => {
        const current = byUnit.get(unitId);

        if (!current || PRIORITY.indexOf(kind) < PRIORITY.indexOf(current.kind)) {
            byUnit.set(unitId, { id: nextId(), unitId, element, kind, critical });
        }
    };

    for (const event of events) {
        if (event.type === 'damage') {
            add(event.targetId, 'hit', skill?.element ?? 'physical', event.critical);
        } else if (event.type === 'status_damage') {
            add(event.targetId, 'tick', STATUS_ELEMENT[event.status] ?? 'physical');
        } else if (event.type === 'heal' && event.amount > 0) {
            add(event.targetId, 'heal', skill?.element ?? 'light');
        } else if (event.type === 'status_applied') {
            if (event.status === 'shield') add(event.targetId, 'shield', 'light');
            else if (GOOD_STATUS.includes(event.status)) add(event.targetId, 'boon', skill?.element ?? 'light');
            else add(event.targetId, 'bane', STATUS_ELEMENT[event.status] ?? skill?.element ?? 'physical');
        }
    }

    return [...byUnit.values()];
}
