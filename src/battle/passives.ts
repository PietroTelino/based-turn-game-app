import { toPercent } from '@/battle/playback';
import type { BattleUnit, Passive } from '@/types/battle';

/**
 * Uma passiva cujo bônus de dano muda ao longo da batalha, e quanto ela vale
 * agora. A tela mostra esse número num selo embaixo da unidade e na carta da
 * passiva: a descrição diz a regra, isto diz o resultado.
 */
export interface PassiveCharge {
    passive: Passive;
    /** Quanto a passiva soma ao dano dos golpes agora, em porcentagem (15 = +15%). */
    percent: number;
    /** O desenho do selo: cargas acumuladas (Vampiro) ou vida perdida (Bárbaro). */
    kind: 'stacks' | 'wounded';
}

/**
 * As cargas da passiva que acumula com roubo de vida, ou null se a unidade
 * não tem uma ou ainda não acumulou nada. `stacks` permite perguntar por um
 * total que ainda não está na unidade (o que acabou de chegar num evento).
 */
export function chargeOf(unit: BattleUnit | undefined, stacks = unit?.passiveStacks ?? 0): PassiveCharge | null {
    const passive = unit?.passives?.find((item) => item.effect.type === 'damage_per_drain');

    if (!passive || passive.effect.type !== 'damage_per_drain' || stacks <= 0) {
        return null;
    }

    return { passive, percent: toPercent(passive.effect.amount * stacks), kind: 'stacks' };
}

/** O bônus da passiva "quanto mais ferido, mais forte", pela vida que a unidade tem agora. Mesma conta da API. */
function woundedOf(unit: BattleUnit | undefined): PassiveCharge | null {
    const passive = unit?.passives?.find((item) => item.effect.type === 'damage_per_missing_hp');

    if (!unit || !passive || passive.effect.type !== 'damage_per_missing_hp') {
        return null;
    }

    const missingPercent = Math.floor(((unit.stats.maxHp - unit.hp) * 100) / unit.stats.maxHp);
    const percent = Math.round(passive.effect.amount * Math.max(0, missingPercent));

    return percent > 0 ? { passive, percent, kind: 'wounded' } : null;
}

/** O bônus de dano que a passiva da unidade está dando agora, para mostrar na tela. */
export function bonusOf(unit: BattleUnit | undefined): PassiveCharge | null {
    return chargeOf(unit) ?? woundedOf(unit);
}
