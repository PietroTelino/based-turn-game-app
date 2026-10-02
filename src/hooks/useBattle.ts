import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { getBattle, sendBattleAction } from '@/api/battles';
import { applyEvents, openingState, toBeats } from '@/battle/playback';
import { useToast } from '@/contexts/ToastContext';
import type { AvailableAction, BattleEvent, BattleResponse, BattleState, BattleUnit, BattleView, TeamId } from '@/types/battle';

/** Número que sobe da cabeça de uma unidade quando ela leva dano ou cura. */
export interface Floater {
    id: number;
    unitId: string;
    text: string;
    kind: 'damage' | 'critical' | 'heal' | 'status';
}

/** O que está sendo animado neste instante. Tudo vazio quando a tela está parada. */
export interface BattleEffects {
    actingUnitId: string | null;
    banner: string | null;
    hitUnitIds: string[];
    healedUnitIds: string[];
    floaters: Floater[];
}

export interface LogEntry {
    id: number;
    text: string;
    team: TeamId | null;
}

/** loading: buscando a batalha | idle: esperando o jogador | busy: enviando ou animando */
type Phase = 'loading' | 'idle' | 'busy' | 'error';

const NO_EFFECTS: BattleEffects = { actingUnitId: null, banner: null, hitUnitIds: [], healedUnitIds: [], floaters: [] };
const MAX_LOG_ENTRIES = 60;

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function describe(
    event: BattleEvent,
    units: Map<string, BattleUnit>,
    playerTeam: TeamId,
    t: TFunction,
): { text: string; team: TeamId | null } | null {
    switch (event.type) {
        case 'skill_used': {
            const unit = units.get(event.unitId);
            const skill = unit?.skills.find((s) => s.id === event.skillId);

            return { text: t('battle.log.skill', { unit: unit?.name, skill: skill?.name }), team: event.team };
        }

        case 'damage': {
            const key = event.absorbed > 0 ? 'battle.log.shielded' : event.critical ? 'battle.log.critical' : 'battle.log.damage';

            return {
                text: t(key, {
                    target: units.get(event.targetId)?.name,
                    amount: event.amount - event.absorbed,
                    absorbed: event.absorbed,
                }),
                team: units.get(event.sourceId)?.team ?? null,
            };
        }

        case 'status_applied':
            return {
                text: t('battle.log.statusApplied', {
                    target: units.get(event.targetId)?.name,
                    status: t(`battle.status.${event.status}`),
                    turns: t('battle.turns', { count: event.turns }),
                }),
                team: units.get(event.sourceId)?.team ?? null,
            };

        case 'status_damage':
            return {
                text: t('battle.log.statusDamage', {
                    target: units.get(event.targetId)?.name,
                    amount: event.amount,
                    status: t(`battle.status.${event.status}`),
                }),
                team: null,
            };

        case 'turn_skipped':
            return {
                text: t('battle.log.skipped', { unit: units.get(event.unitId)?.name, status: t(`battle.status.${event.status}`) }),
                team: null,
            };

        case 'heal':
            // Cura em quem já estava com a vida cheia não merece uma linha.
            if (event.amount === 0) return null;

            return {
                text: t('battle.log.heal', { target: units.get(event.targetId)?.name, amount: event.amount }),
                team: units.get(event.sourceId)?.team ?? null,
            };

        case 'unit_defeated': {
            const unit = units.get(event.unitId);

            return { text: t('battle.log.defeated', { unit: unit?.name }), team: unit?.team ?? null };
        }

        case 'battle_ended':
            return { text: t(event.winner === playerTeam ? 'battle.log.won' : 'battle.log.lost'), team: null };

        case 'turn_started':
        case 'status_expired':
        case 'statuses_changed':
            return null;
    }
}

function effectsOf(events: BattleEvent[], units: Map<string, BattleUnit>, nextId: () => number, t: TFunction): BattleEffects {
    const effects: BattleEffects = { ...NO_EFFECTS, hitUnitIds: [], healedUnitIds: [], floaters: [] };

    for (const event of events) {
        if (event.type === 'skill_used') {
            const unit = units.get(event.unitId);
            const skill = unit?.skills.find((s) => s.id === event.skillId);

            effects.actingUnitId = event.unitId;
            effects.banner = t('battle.banner', { unit: unit?.name, skill: skill?.name });
        }

        if (event.type === 'damage') {
            const lost = event.amount - event.absorbed;

            effects.hitUnitIds.push(event.targetId);
            effects.floaters.push({
                id: nextId(),
                unitId: event.targetId,
                // Escudo segurou tudo: em vez de "0", diz o que aconteceu.
                text: lost === 0 ? t('battle.blocked') : event.critical ? `${lost}!` : String(lost),
                kind: lost === 0 ? 'status' : event.critical ? 'critical' : 'damage',
            });
        }

        if (event.type === 'status_damage') {
            effects.hitUnitIds.push(event.targetId);
            effects.floaters.push({ id: nextId(), unitId: event.targetId, text: String(event.amount), kind: 'damage' });
        }

        if (event.type === 'status_applied') {
            effects.floaters.push({
                id: nextId(),
                unitId: event.targetId,
                text: t(`battle.status.${event.status}`),
                kind: 'status',
            });
        }

        if (event.type === 'turn_skipped') {
            effects.banner = t('battle.log.skipped', {
                unit: units.get(event.unitId)?.name,
                status: t(`battle.status.${event.status}`),
            });
        }

        if (event.type === 'heal' && event.amount > 0) {
            effects.healedUnitIds.push(event.targetId);
            effects.floaters.push({ id: nextId(), unitId: event.targetId, text: `+${event.amount}`, kind: 'heal' });
        }
    }

    return effects;
}

/**
 * Controla uma batalha na tela.
 *
 * - `view` é a última resposta da API (a verdade).
 * - `state` é o que está desenhado agora. Durante a animação ele vai sendo
 *   atualizado evento por evento até alcançar o `view.state`.
 *
 * `opening` é a resposta de quando a batalha foi criada. Se a IA jogou
 * primeiro, os eventos dela são animados ao abrir a tela.
 */
export function useBattle(battleId: string, opening?: BattleResponse) {
    const { t } = useTranslation();
    const { showToast } = useToast();

    const [view, setView] = useState<BattleView | null>(null);
    const [state, setState] = useState<BattleState | null>(null);
    const [phase, setPhase] = useState<Phase>('loading');
    const [effects, setEffects] = useState<BattleEffects>(NO_EFFECTS);
    const [log, setLog] = useState<LogEntry[]>([]);
    const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);

    // Cada carregamento da tela ganha um número. Uma animação antiga que ainda
    // esteja rodando percebe que o número mudou e para sozinha.
    const runRef = useRef(0);
    const idRef = useRef(0);

    const play = useCallback(
        async (run: number, from: BattleState, response: BattleResponse) => {
            const units = new Map(from.units.map((unit) => [unit.id, unit]));
            const nextId = () => ++idRef.current;
            let current = from;

            for (const beat of toBeats(response.events)) {
                if (runRef.current !== run) return;

                current = applyEvents(current, beat.events);

                // O log mostra o mais recente no topo.
                const entries = beat.events
                    .map((event) => describe(event, units, response.battle.playerTeam, t))
                    .filter((entry) => entry !== null)
                    .map((entry) => ({ ...entry, id: nextId() }))
                    .reverse();

                setState(current);
                setEffects(effectsOf(beat.events, units, nextId, t));
                setLog((previous) => [...entries, ...previous].slice(0, MAX_LOG_ENTRIES));

                await sleep(beat.duration);
            }

            if (runRef.current !== run) return;

            setEffects(NO_EFFECTS);
            setView(response.battle);
            setState(response.battle.state);
            setSelectedSkillId(null);
        },
        [t],
    );

    useEffect(() => {
        const run = ++runRef.current;

        async function load() {
            try {
                const fetched = await getBattle(battleId);

                if (runRef.current !== run) return;

                // Só anima a abertura se a batalha ainda está como foi criada
                // (ao recarregar a página no meio do jogo, não).
                const isFresh = opening?.battle.id === fetched.id && opening.battle.state.turn === fetched.state.turn;

                if (isFresh && opening.events.length > 1) {
                    setView(fetched);
                    setState(openingState(fetched));
                    setPhase('busy');
                    await play(run, openingState(fetched), { battle: fetched, events: opening.events });
                } else {
                    setView(fetched);
                    setState(fetched.state);
                }

                if (runRef.current === run) setPhase('idle');
            } catch {
                if (runRef.current === run) setPhase('error');
            }
        }

        load();

        return () => {
            // Invalida este carregamento: a animação em andamento para no próximo passo.
            runRef.current = run + 1;
        };
    }, [battleId, opening, play]);

    const actions: AvailableAction[] = view?.availableActions ?? [];
    const selected = actions.find((a) => a.skill.id === selectedSkillId && a.usable) ?? actions.find((a) => a.usable) ?? null;
    const activeUnit = state?.units.find((unit) => unit.id === state.activeUnitId) ?? null;
    const canAct = phase === 'idle' && view?.status === 'in_progress' && activeUnit?.team === view.playerTeam;

    async function act(targetId?: string) {
        if (!canAct || !view || !state || !activeUnit || !selected) return;

        const run = runRef.current;

        setPhase('busy');

        try {
            const response = await sendBattleAction(view.id, {
                unitId: activeUnit.id,
                skillId: selected.skill.id,
                ...(selected.requiresTarget && targetId ? { targetId } : {}),
            });

            await play(run, state, response);
        } catch (error) {
            const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message;

            showToast(message ?? t('errors.genericError'), 'error');

            // Algo saiu do combinado: busca o estado de verdade para a tela não ficar errada.
            try {
                const fresh = await getBattle(view.id);

                if (runRef.current === run) {
                    setEffects(NO_EFFECTS);
                    setView(fresh);
                    setState(fresh.state);
                }
            } catch {
                // Sem conexão: mantém o que está na tela.
            }
        } finally {
            if (runRef.current === run) setPhase('idle');
        }
    }

    return {
        view,
        state,
        phase,
        effects,
        log,
        actions,
        selected,
        activeUnit,
        canAct,
        /** Quem pode ser clicado agora para confirmar a habilidade selecionada. */
        targetIds: canAct && selected ? selected.targetIds : [],
        selectSkill: setSelectedSkillId,
        act,
    };
}
