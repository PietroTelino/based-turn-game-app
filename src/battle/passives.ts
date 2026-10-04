import { toPercent } from '@/battle/playback';
import type { BattleUnit, Passive } from '@/types/battle';

/**
 * Uma passiva cujo número muda ao longo da batalha, e quanto ela vale agora.
 * A tela mostra esse número num selo embaixo da unidade e na carta da
 * passiva: a descrição diz a regra, isto diz o resultado.
 */
export interface PassiveCharge {
    passive: Passive;
    /**
     * O que o número é: cargas acumuladas (Vampiro), vida perdida (Bárbaro) e
     * inimigos com um status (os que sangram, para o lobo do Druida) somam
     * dano; cadáveres (Necromante) são quantos aliados caídos ele ainda pode
     * erguer.
     */
    kind: 'stacks' | 'wounded' | 'hunt' | 'corpses';
    /** 'stacks', 'wounded' e 'hunt': quanto a passiva soma ao dano dos golpes agora, em porcentagem (15 = +15%). */
    percent: number;
    /** 'corpses': quantos cadáveres há. */
    count: number;
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

    return { passive, percent: toPercent(passive.effect.amount * stacks), count: stacks, kind: 'stacks' };
}

/** Os cadáveres que a passiva da unidade conta (zero também vale: é o que ela mostra depois de erguer o último). */
export function corpsesOf(unit: BattleUnit | undefined, stacks = unit?.passiveStacks ?? 0): PassiveCharge | null {
    const passive = unit?.passives?.find((item) => item.effect.type === 'count_corpses');

    return passive ? { passive, percent: 0, count: stacks, kind: 'corpses' } : null;
}

/** O que a passiva da unidade guarda, com o total que acabou de chegar num evento (`stacks`). */
export function stacksOf(unit: BattleUnit | undefined, stacks: number): PassiveCharge | null {
    return chargeOf(unit, stacks) ?? corpsesOf(unit, stacks);
}

/** O bônus da passiva "quanto mais ferido, mais forte", pela vida que a unidade tem agora. Mesma conta da API. */
function woundedOf(unit: BattleUnit | undefined): PassiveCharge | null {
    const passive = unit?.passives?.find((item) => item.effect.type === 'damage_per_missing_hp');

    if (!unit || !passive || passive.effect.type !== 'damage_per_missing_hp') {
        return null;
    }

    const missingPercent = Math.floor(((unit.stats.maxHp - unit.hp) * 100) / unit.stats.maxHp);
    const percent = Math.round(passive.effect.amount * Math.max(0, missingPercent));

    return percent > 0 ? { passive, percent, count: 0, kind: 'wounded' } : null;
}

/**
 * O bônus da passiva "mais dano para cada inimigo com o status" (o lobo e os
 * inimigos sangrando), pelos inimigos vivos de agora. Mesma conta da API. O
 * efeito pode estar em `effect` ou em `also`.
 */
function huntOf(unit: BattleUnit | undefined, units: BattleUnit[]): PassiveCharge | null {
    if (!unit) {
        return null;
    }

    for (const passive of unit.passives ?? []) {
        for (const effect of [passive.effect, ...(passive.also ?? [])]) {
            if (effect.type !== 'damage_per_enemy_status') continue;

            const count = units.filter(
                (enemy) => enemy.team !== unit.team && enemy.hp > 0 && (enemy.statuses ?? []).some((status) => effect.statuses.includes(status.kind)),
            ).length;

            return count > 0 ? { passive, percent: toPercent(effect.amount * count), count, kind: 'hunt' } : null;
        }
    }

    return null;
}

/**
 * O número que a passiva da unidade está mostrando agora: bônus de dano ou
 * cadáveres (só quando há algum). `units` são todas as unidades da batalha,
 * para as passivas que olham o outro time.
 */
export function bonusOf(unit: BattleUnit | undefined, units: BattleUnit[] = []): PassiveCharge | null {
    const corpses = corpsesOf(unit);

    return chargeOf(unit) ?? (corpses && corpses.count > 0 ? corpses : null) ?? woundedOf(unit) ?? huntOf(unit, units);
}
