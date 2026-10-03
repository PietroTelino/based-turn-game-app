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
    turn_started: 850,
    /** Turno com Berserk: o aviso tem duas linhas e fica mais tempo na tela. */
    berserk_turn: 1300,
    unit_activated: 450,
    skill_used: 700,
    unit_skipped: 1000,
    surrendered: 500,
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
    return event.type === 'statuses_changed' || event.type === 'status_expired' || event.type === 'order_changed';
}

export function toBeats(events: BattleEvent[]): Beat[] {
    const beats: Beat[] = [];

    for (const event of events) {
        const last = beats[beats.length - 1];

        if (isSilent(event)) {
            // Depois de uma vez perdida, o status só some quando a faixa de
            // aviso termina: por isso vai num beat próprio, sem duração.
            const afterSkip = last?.events[0]?.type === 'unit_skipped';

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

        const kind = event.type === 'turn_started' && event.fury > 0 ? 'berserk_turn' : event.type;

        beats.push({ events: [event], duration: BEAT_DURATION[kind as keyof typeof BEAT_DURATION] });
    }

    return beats;
}

/** 0.5 -> 50: o Berserk é mostrado na tela em porcentagem. */
export function toPercent(fraction: number): number {
    return Math.round(fraction * 100);
}

/** Aplica eventos a um estado e devolve um estado novo (não altera o recebido). */
export function applyEvents(state: BattleState, events: BattleEvent[]): BattleState {
    let next = state;

    for (const event of events) {
        switch (event.type) {
            // Turno novo: a ordem muda, a energia dos dois times é reabastecida
            // e, por um instante, não é a vez de ninguém.
            case 'turn_started':
                next = {
                    ...next,
                    turn: event.turn,
                    order: event.order,
                    activeUnitId: null,
                    turnEnergy: event.energy,
                    energy: { A: event.energy, B: event.energy },
                    fury: event.fury,
                };
                break;

            // A ordem mudou no meio do turno: é só copiar a nova.
            case 'order_changed':
                next = { ...next, order: event.order };
                break;

            case 'unit_activated':
                next = { ...next, activeUnitId: event.unitId };
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

            case 'surrendered':
                next = { ...next, surrenderedBy: event.team };
                break;

            case 'battle_ended':
                next = { ...next, winner: event.winner, activeUnitId: null };
                break;

            case 'unit_defeated':
            case 'status_applied':
            case 'status_expired':
            case 'unit_skipped':
                break;
        }
    }

    return next;
}

/**
 * Estado do instante em que a batalha foi criada, antes de qualquer jogada.
 * Serve para animar a abertura: no começo todo mundo está com a vida cheia,
 * a energia é a do primeiro turno e a ordem ainda não foi anunciada; os
 * eventos cuidam do resto.
 */
export function openingState(view: BattleView, events: BattleEvent[]): BattleState {
    const firstTurn = events.find((event) => event.type === 'turn_started');
    const energy = firstTurn?.energy ?? view.state.turnEnergy;

    return {
        ...view.state,
        energy: { A: energy, B: energy },
        turnEnergy: energy,
        units: view.state.units.map((unit) => ({ ...unit, hp: unit.stats.maxHp, statuses: [] })),
        activeUnitId: null,
        turn: 1,
        fury: 0,
        order: [],
        winner: null,
    };
}
