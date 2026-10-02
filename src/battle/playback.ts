import type { BattleEvent, BattleState, BattleView } from '@/types/battle';

/**
 * A API devolve o estado final e a lista de eventos que levou até ele.
 * Para animar, a tela parte do estado anterior e aplica os eventos aos poucos.
 *
 * Um "beat" é um grupo de eventos que aparece junto na tela, seguido de uma
 * pausa. Ex.: os três danos de uma habilidade em área são um beat só.
 */
export interface Beat {
    events: BattleEvent[];
    /** Quanto tempo a tela fica nesse beat antes do próximo, em ms. */
    duration: number;
}

const BEAT_DURATION = {
    turn_started: 450,
    skill_used: 700,
    turn_skipped: 1000,
    effects: 800,
    battle_ended: 300,
} as const;

/** Eventos que aparecem na tela como resultado de algo: dano, cura, status. */
function isEffect(event: BattleEvent): boolean {
    return (
        event.type === 'damage' ||
        event.type === 'heal' ||
        event.type === 'unit_defeated' ||
        event.type === 'status_applied' ||
        event.type === 'status_damage'
    );
}

/** Eventos que só atualizam dados, sem animação própria: entram no beat anterior. */
function isSilent(event: BattleEvent): boolean {
    return event.type === 'statuses_changed' || event.type === 'status_expired';
}

export function toBeats(events: BattleEvent[]): Beat[] {
    const beats: Beat[] = [];

    for (const event of events) {
        const last = beats[beats.length - 1];

        if (isSilent(event)) {
            // Depois de um turno pulado, o status só some quando a faixa de
            // aviso termina: por isso vai num beat próprio, sem duração.
            const afterSkip = last?.events[0]?.type === 'turn_skipped';

            if (last && !afterSkip) {
                last.events.push(event);
            } else {
                beats.push({ events: [event], duration: 0 });
            }
            continue;
        }

        if (isEffect(event)) {
            // Efeitos seguidos fazem parte da mesma habilidade: mostram-se juntos.
            if (last && last.events.every((e) => isEffect(e) || isSilent(e)) && last.events.some(isEffect)) {
                last.events.push(event);
            } else {
                beats.push({ events: [event], duration: BEAT_DURATION.effects });
            }
            continue;
        }

        beats.push({ events: [event], duration: BEAT_DURATION[event.type as keyof typeof BEAT_DURATION] });
    }

    return beats;
}

/** Aplica eventos a um estado e devolve um estado novo (não altera o recebido). */
export function applyEvents(state: BattleState, events: BattleEvent[]): BattleState {
    let next = state;

    for (const event of events) {
        switch (event.type) {
            case 'turn_started':
                next = {
                    ...next,
                    activeUnitId: event.unitId,
                    turn: event.turn,
                    energy: { ...next.energy, [event.team]: event.energy },
                };
                break;

            case 'skill_used':
                next = { ...next, energy: { ...next.energy, [event.team]: event.energy } };
                break;

            case 'damage':
            case 'heal':
            case 'status_damage':
                next = {
                    ...next,
                    units: next.units.map((unit) => (unit.id === event.targetId ? { ...unit, hp: event.hp } : unit)),
                };
                break;

            // O servidor manda a lista de status já pronta: é só copiar.
            case 'statuses_changed':
                next = {
                    ...next,
                    units: next.units.map((unit) => (unit.id === event.unitId ? { ...unit, statuses: event.statuses } : unit)),
                };
                break;

            case 'battle_ended':
                next = { ...next, winner: event.winner, activeUnitId: null };
                break;

            case 'unit_defeated':
            case 'status_applied':
            case 'status_expired':
            case 'turn_skipped':
                break;
        }
    }

    return next;
}

/**
 * Estado do instante em que a batalha foi criada, antes de qualquer jogada.
 * Serve para animar a abertura quando a IA joga primeiro: no começo todo
 * mundo está com a vida cheia, e os eventos cuidam do resto.
 */
export function openingState(view: BattleView): BattleState {
    return {
        ...view.state,
        units: view.state.units.map((unit) => ({ ...unit, hp: unit.stats.maxHp, statuses: [] })),
        activeUnitId: null,
        winner: null,
    };
}
