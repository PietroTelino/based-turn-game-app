import type { BattleUnit, Form, Passive, Skill } from '@/types/battle';

/*
 * Formas: quem se transforma (o Druida) troca atributos, habilidades e
 * passivas pelos da forma. A unidade leva na batalha todas as formas
 * (`forms`) e a original (`baseForm`), então a tela consegue fazer a troca
 * sozinha quando o evento chega, sem esperar a resposta completa da API.
 */

/** A forma em que a unidade está agora, ou undefined se está na original (ou não se transforma). */
export function formOf(unit: BattleUnit | undefined): Form | undefined {
    return unit?.form === undefined ? undefined : unit.forms?.find((form) => form.id === unit.form);
}

/** A unidade depois de mudar de forma (`formId` null = de volta à original). Mesma troca que a API faz. */
export function withForm(unit: BattleUnit, formId: string | null, hp: number): BattleUnit {
    const form = formId === null ? unit.baseForm : unit.forms?.find((item) => item.id === formId);

    if (!form) {
        return { ...unit, hp };
    }

    const next: BattleUnit = { ...unit, stats: form.stats, skills: form.skills, passives: form.passives, hp };

    if (formId === null) {
        delete next.form;
    } else {
        next.form = formId;
    }

    return next;
}

function everyForm(unit: BattleUnit): { skills: Skill[]; passives?: Passive[] }[] {
    return [unit, ...(unit.baseForm ? [unit.baseForm] : []), ...(unit.forms ?? [])];
}

/**
 * Uma habilidade da unidade pelo id, em qualquer forma dela. Quem se
 * transforma e age de novo usa, na mesma resposta, habilidades de duas formas.
 */
export function findSkill(unit: BattleUnit | undefined, skillId: string): Skill | undefined {
    return unit ? everyForm(unit).flatMap((form) => form.skills).find((skill) => skill.id === skillId) : undefined;
}

/** Uma passiva da unidade pelo id, em qualquer forma dela. */
export function findPassive(unit: BattleUnit | undefined, passiveId: string): Passive | undefined {
    return unit ? everyForm(unit).flatMap((form) => form.passives ?? []).find((passive) => passive.id === passiveId) : undefined;
}
