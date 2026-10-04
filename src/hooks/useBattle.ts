import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { getBattle, getBattleEvents, sendBattleAction, surrenderBattle } from '@/api/battles';
import { sfx } from '@/audio/sfx';
import { findPassive, findSkill } from '@/battle/forms';
import { impactsOf, passiveFxOf, skillFxOf } from '@/battle/fx';
import { stacksOf } from '@/battle/passives';
import type { Impact, SkillFx } from '@/battle/fx';
import { applyEvents, openingState, toBeats, toPercent } from '@/battle/playback';
import { cuesOf } from '@/battle/sounds';
import { useConfirm } from '@/contexts/ConfirmContext';
import { useToast } from '@/contexts/ToastContext';
import type { AvailableAction, BattleEvent, BattleResponse, BattleState, BattleUnit, BattleView, TeamId } from '@/types/battle';

/** Número que sobe da cabeça de uma unidade quando ela leva dano ou cura. */
export interface Floater {
    id: number;
    unitId: string;
    text: string;
    kind: 'damage' | 'critical' | 'heal' | 'status' | 'passive';
    /** Linha pequena acima do número (ex.: "Crítico!"). */
    label?: string;
}

/** O que está sendo animado neste instante. Tudo vazio quando a tela está parada. */
export interface BattleEffects {
    /** A habilidade em uso: fica do anúncio até o fim do impacto. */
    skill: SkillFx | null;
    banner: string | null;
    /**
     * Aviso no meio da arena: "Batalha!" na abertura (grande) e "Turno N" a
     * cada turno novo. Com o Berserk ativo, `detail` é a segunda linha, com
     * quanto o dano está aumentado.
     */
    announce: { text: string; big: boolean; detail?: string; berserk?: boolean } | null;
    hitUnitIds: string[];
    healedUnitIds: string[];
    /** Quem mudou de forma neste instante: a figura nova surge num clarão. */
    morphingUnitIds: string[];
    /** Quem foi derrotado neste instante: anima a queda. */
    fallingUnitIds: string[];
    impacts: Impact[];
    /** Acerto crítico: a arena treme. */
    quake: boolean;
    /** A ordem do turno mudou agora: a fila do topo pisca. */
    orderChanged: boolean;
    floaters: Floater[];
}

export interface LogEntry {
    id: number;
    text: string;
    team: TeamId | null;
}

/** loading: buscando a batalha | idle: esperando o jogador | busy: enviando ou animando */
type Phase = 'loading' | 'idle' | 'busy' | 'error';

const NO_EFFECTS: BattleEffects = {
    skill: null,
    banner: null,
    announce: null,
    hitUnitIds: [],
    healedUnitIds: [],
    morphingUnitIds: [],
    fallingUnitIds: [],
    impacts: [],
    quake: false,
    orderChanged: false,
    floaters: [],
};
const MAX_LOG_ENTRIES = 60;
/** Quanto tempo o aviso de começo da batalha fica na tela, em ms. */
const INTRO_DURATION = 1300;
/** Batalha entre jogadores: de quanto em quanto tempo a tela pergunta o que o outro fez, em ms. */
const POLL_INTERVAL = 1200;
/** `state.step` de uma batalha recém-criada, em que ninguém jogou ainda. */
const FIRST_STEP = 1;

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
            const skill = findSkill(unit, event.skillId);

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

        case 'transformed': {
            const unit = units.get(event.unitId);
            const form = unit?.forms?.find((item) => item.id === event.form);

            return {
                text: form ? t('battle.log.transformed', { unit: unit?.name, form: form.name }) : t('battle.log.reverted', { unit: unit?.name }),
                team: unit?.team ?? null,
            };
        }

        case 'extra_action': {
            const unit = units.get(event.unitId);

            return { text: t('battle.log.extraAction', { unit: unit?.name }), team: unit?.team ?? null };
        }

        case 'summoned':
            return { text: t('battle.log.summoned', { unit: units.get(event.sourceId)?.name, summon: event.unit.name }), team: event.unit.team };

        case 'cleansed':
            return {
                text: t('battle.log.cleansed', {
                    target: units.get(event.targetId)?.name,
                    statuses: event.statuses.map((status) => t(`battle.status.${status}`)).join(', '),
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

        case 'unit_skipped':
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

        case 'surrendered':
            return { text: t(event.team === playerTeam ? 'battle.log.surrendered' : 'battle.log.enemySurrendered'), team: event.team };

        case 'battle_ended':
            return { text: t(event.winner === playerTeam ? 'battle.log.won' : 'battle.log.lost'), team: null };

        // No log, o turno novo vira uma linha de separação.
        case 'turn_started':
            return {
                text:
                    event.fury > 0
                        ? t('battle.log.berserkTurn', { turn: event.turn, percent: toPercent(event.fury) })
                        : t('battle.turn', { turn: event.turn }),
                team: null,
            };

        case 'order_changed':
            return { text: t('battle.log.orderChanged'), team: null };

        case 'passive_triggered': {
            const unit = units.get(event.unitId);
            const passive = findPassive(unit, event.passiveId);
            const charge = event.stacks === undefined ? null : stacksOf(unit, event.stacks);

            // Passiva que conta cadáveres: a linha diz quantos há agora.
            if (charge?.kind === 'corpses') {
                return {
                    text: charge.count === 0 ? t('battle.log.corpsesNone', { unit: unit?.name }) : t('battle.log.corpses', { unit: unit?.name, count: charge.count }),
                    team: unit?.team ?? null,
                };
            }

            // Passiva que acumula: a linha diz quanto ela vale agora.
            if (charge) {
                return {
                    text: t('battle.log.passiveCharge', { unit: unit?.name, passive: charge.passive.name, percent: charge.percent }),
                    team: unit?.team ?? null,
                };
            }

            return { text: t('battle.log.passive', { unit: unit?.name, passive: passive?.name }), team: unit?.team ?? null };
        }

        case 'energy_gained':
            return {
                text: t(event.team === playerTeam ? 'battle.log.energyGained' : 'battle.log.enemyEnergyGained', { count: event.amount }),
                team: event.team,
            };

        case 'unit_activated':
        case 'status_expired':
        case 'statuses_changed':
            return null;
    }
}

/** Eventos que são consequência da habilidade que acabou de ser usada. */
function isAftermath(event: BattleEvent): boolean {
    return (
        event.type === 'damage' ||
        event.type === 'heal' ||
        event.type === 'status_applied' ||
        event.type === 'cleansed' ||
        event.type === 'transformed' ||
        event.type === 'summoned' ||
        event.type === 'extra_action' ||
        event.type === 'unit_defeated' ||
        event.type === 'status_expired' ||
        event.type === 'statuses_changed' ||
        event.type === 'order_changed' ||
        event.type === 'passive_triggered' ||
        event.type === 'energy_gained'
    );
}

function effectsOf(
    events: BattleEvent[],
    units: Map<string, BattleUnit>,
    skillFx: SkillFx | null,
    nextId: () => number,
    t: TFunction,
    /** Quanto valia o Berserk antes destes eventos: para saber se ele começou agora. */
    previousFury: number,
): BattleEffects {
    const effects: BattleEffects = {
        ...NO_EFFECTS,
        skill: skillFx,
        hitUnitIds: [],
        healedUnitIds: [],
        morphingUnitIds: [],
        fallingUnitIds: [],
        impacts: impactsOf(events, skillFx, nextId),
        floaters: [],
    };
    const healed = new Map<string, { floater: Floater; total: number }>();

    for (const event of events) {
        if (event.type === 'skill_used') {
            const unit = units.get(event.unitId);
            const skill = findSkill(unit, event.skillId);

            effects.banner = t('battle.banner', { unit: unit?.name, skill: skill?.name });
        }

        if (event.type === 'damage') {
            const lost = event.amount - event.absorbed;

            effects.hitUnitIds.push(event.targetId);
            effects.quake ||= event.critical;
            effects.floaters.push({
                id: nextId(),
                unitId: event.targetId,
                // Escudo segurou tudo: em vez de "0", diz o que aconteceu.
                text: lost === 0 ? t('battle.blocked') : String(lost),
                kind: lost === 0 ? 'status' : event.critical ? 'critical' : 'damage',
                ...(event.critical && lost > 0 && { label: t('battle.critical') }),
            });
        }

        if (event.type === 'unit_defeated') {
            effects.fallingUnitIds.push(event.unitId);
        }

        if (event.type === 'passive_triggered') {
            const unit = units.get(event.unitId);
            const name = findPassive(unit, event.passiveId)?.name;
            const charge = event.stacks === undefined ? null : stacksOf(unit, event.stacks);

            if (charge?.kind === 'corpses') {
                // Passiva que conta cadáveres: sobe a conta nova.
                effects.floaters.push({
                    id: nextId(),
                    unitId: event.unitId,
                    text: charge.count === 0 ? t('battle.corpsesNone') : t('battle.corpses', { count: charge.count }),
                    kind: 'passive',
                });
            } else if (charge) {
                // Passiva que acumula: sobe o nome dela com o quanto vale agora.
                effects.floaters.push({
                    id: nextId(),
                    unitId: event.unitId,
                    text: t('battle.passiveCharge', { passive: charge.passive.name, percent: charge.percent }),
                    kind: 'passive',
                });
            } else if (name && skillFx?.passive) {
                // Passiva de começo de vez, que age sozinha: é anunciada na faixa, como uma habilidade.
                effects.banner = t('battle.passiveBanner', { unit: unit?.name, passive: name });
            } else if (name) {
                // Passiva que mudou um golpe: o nome dela sobe de quem bateu.
                effects.floaters.push({ id: nextId(), unitId: event.unitId, text: name, kind: 'passive' });
            }
        }

        if (event.type === 'energy_gained') {
            effects.floaters.push({ id: nextId(), unitId: event.unitId, text: t('battle.energyFloater', { count: event.amount }), kind: 'passive' });
        }

        if (event.type === 'order_changed') {
            effects.orderChanged = true;
        }

        if (event.type === 'status_damage') {
            effects.hitUnitIds.push(event.targetId);
            effects.floaters.push({ id: nextId(), unitId: event.targetId, text: String(event.amount), kind: 'damage' });
        }

        if (event.type === 'transformed') {
            const unit = units.get(event.unitId);
            const form = unit?.forms?.find((item) => item.id === event.form);

            effects.morphingUnitIds.push(event.unitId);
            effects.floaters.push({ id: nextId(), unitId: event.unitId, text: form ? form.name : t('battle.reverted'), kind: 'passive' });
        }

        if (event.type === 'summoned') {
            // A invocação surge no lugar do cadáver, com o mesmo clarão de uma transformação.
            effects.morphingUnitIds.push(event.unitId);
            effects.floaters.push({ id: nextId(), unitId: event.unitId, text: event.unit.name, kind: 'passive' });
        }

        if (event.type === 'extra_action') {
            effects.floaters.push({ id: nextId(), unitId: event.unitId, text: t('battle.extraAction'), kind: 'passive' });
        }

        if (event.type === 'cleansed') {
            effects.floaters.push({ id: nextId(), unitId: event.targetId, text: t('battle.cleansed'), kind: 'status' });
        }

        if (event.type === 'status_applied') {
            effects.floaters.push({
                id: nextId(),
                unitId: event.targetId,
                text: t(`battle.status.${event.status}`),
                kind: 'status',
            });
        }

        if (event.type === 'turn_started') {
            const percent = toPercent(event.fury);

            if (event.fury === 0) {
                effects.announce = { text: t('battle.turn', { turn: event.turn }), big: false };
            } else if (previousFury === 0) {
                // O Berserk começou neste turno: aviso grande.
                effects.announce = { text: t('battle.berserkStart'), detail: t('battle.berserkDetail', { percent }), big: true, berserk: true };
            } else {
                effects.announce = { text: t('battle.turn', { turn: event.turn }), detail: t('battle.berserk', { percent }), big: false, berserk: true };
            }
        }

        if (event.type === 'unit_skipped') {
            effects.banner = t('battle.log.skipped', {
                unit: units.get(event.unitId)?.name,
                status: t(`battle.status.${event.status}`),
            });
        }

        if (event.type === 'heal' && event.amount > 0) {
            // Roubo de vida em vários alvos cura quem bateu várias vezes: aparece um número só, com a soma.
            let entry = healed.get(event.targetId);

            if (!entry) {
                entry = { floater: { id: nextId(), unitId: event.targetId, text: '', kind: 'heal' }, total: 0 };
                healed.set(event.targetId, entry);
                effects.healedUnitIds.push(event.targetId);
                effects.floaters.push(entry.floater);
            }

            entry.total += event.amount;
            entry.floater.text = `+${entry.total}`;
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
 *
 * Batalha entre dois jogadores (`view.mode === 'pvp'`): a resposta de uma
 * jogada traz só o que ela causou, e a vez pode passar para o outro. Enquanto
 * a tela está parada, ela pergunta à API pelos eventos que vieram depois dos
 * que já mostrou (`view.cursor`) e os anima do mesmo jeito.
 */
export function useBattle(battleId: string, opening?: BattleResponse) {
    const { t } = useTranslation();
    const { showToast } = useToast();
    const { confirm } = useConfirm();

    const [view, setView] = useState<BattleView | null>(null);
    const [state, setState] = useState<BattleState | null>(null);
    const [phase, setPhase] = useState<Phase>('loading');
    const [effects, setEffects] = useState<BattleEffects>(NO_EFFECTS);
    const [log, setLog] = useState<LogEntry[]>([]);
    const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
    /** A pergunta "quer mesmo desistir?" está aberta. */
    const [isConfirming, setIsConfirming] = useState(false);

    // Cada carregamento da tela ganha um número. Uma animação antiga que ainda
    // esteja rodando percebe que o número mudou e para sozinha.
    const runRef = useRef(0);
    const idRef = useRef(0);

    const play = useCallback(
        async (run: number, from: BattleState, response: BattleResponse) => {
            const nextId = () => ++idRef.current;
            let current = from;
            let skillFx: SkillFx | null = null;

            for (const beat of toBeats(response.events)) {
                if (runRef.current !== run) return;

                const previousFury = current.fury;

                current = applyEvents(current, beat.events);

                // Quem se transformou neste beat já aparece com a forma nova (cargas, passivas).
                const units = new Map(current.units.map((unit) => [unit.id, unit]));

                // A habilidade vale do anúncio até o impacto; qualquer outro
                // acontecimento (a vez de outra unidade, vez perdida, fim) a encerra.
                const used = beat.events.find((event) => event.type === 'skill_used');
                const triggered = beat.events.find((event) => event.type === 'passive_triggered');

                if (used) {
                    skillFx = skillFxOf(used, units, nextId());
                } else if (triggered && !skillFx) {
                    // Ninguém está usando habilidade: é uma passiva de começo
                    // de vez, animada como se fosse uma (null para as outras).
                    skillFx = passiveFxOf(triggered, units, nextId());
                } else if (beat.events.some((event) => !isAftermath(event))) {
                    skillFx = null;
                }

                for (const cue of cuesOf(beat.events, skillFx, response.battle.playerTeam)) {
                    sfx.play(cue.sound, cue.at);
                }

                // O log mostra o mais recente no topo.
                const entries = beat.events
                    .map((event) => describe(event, units, response.battle.playerTeam, t))
                    .filter((entry) => entry !== null)
                    .map((entry) => ({ ...entry, id: nextId() }))
                    .reverse();

                setState(current);
                setEffects(effectsOf(beat.events, units, skillFx, nextId, t, previousFury));
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
                // (ao recarregar a página no meio do jogo, não). `step` sobe
                // a cada vez jogada, então é ele que diz se algo já mudou.
                let first: BattleResponse | null = null;

                if (opening?.battle.id === fetched.id && opening.battle.state.step === fetched.state.step) {
                    first = { battle: fetched, events: opening.events };
                } else if (fetched.mode === 'pvp' && fetched.status === 'in_progress' && fetched.state.step === FIRST_STEP) {
                    // Entre jogadores a tela chega aqui vinda da sala, sem a resposta da
                    // criação: os eventos da abertura são os primeiros da batalha. Se o
                    // outro jogou nesse meio-tempo, a jogada dele vem junto e é animada.
                    first = await getBattleEvents(battleId, 0);

                    if (runRef.current !== run) return;
                }

                if (first) {
                    // Batalha recém-criada: os times entram e o aviso aparece.
                    const start = openingState(first.battle, first.events);

                    setView(first.battle);
                    setState(start);
                    setPhase('busy');
                    setEffects({ ...NO_EFFECTS, announce: { text: t('battle.begin'), big: true } });
                    sfx.play('start', 150);
                    await sleep(INTRO_DURATION);

                    if (runRef.current !== run) return;

                    await play(run, start, first);
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
    }, [battleId, opening, play, t]);

    // Batalha entre jogadores: enquanto a tela está parada, pergunta o que o
    // outro fez. Vale também na própria vez, porque o outro pode desistir. Com
    // a pergunta de desistir aberta a tela não se mexe, para a resposta valer
    // para o que o jogador está vendo.
    const isWatching = phase === 'idle' && !isConfirming && view?.mode === 'pvp' && view.status === 'in_progress';
    const cursor = view?.cursor ?? 0;

    useEffect(() => {
        if (!isWatching || !state) return;

        const run = runRef.current;
        const from = state;
        let cancelled = false;
        let timer: number | undefined;

        async function check() {
            try {
                const response = await getBattleEvents(battleId, cursor);

                // Se o jogador jogou ou desistiu enquanto a consulta estava a
                // caminho, ela é descartada: a resposta da jogada já traz o estado.
                if (cancelled || runRef.current !== run) return;

                if (response.events.length > 0) {
                    setPhase('busy');
                    await play(run, from, response);

                    if (runRef.current === run) setPhase('idle');

                    return;
                }
            } catch {
                // Sem conexão por um instante: tenta de novo na próxima volta.
            }

            if (!cancelled) timer = window.setTimeout(check, POLL_INTERVAL);
        }

        timer = window.setTimeout(check, POLL_INTERVAL);

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [isWatching, battleId, cursor, state, play]);

    const actions: AvailableAction[] = view?.availableActions ?? [];
    const selected = actions.find((a) => a.skill.id === selectedSkillId && a.usable) ?? actions.find((a) => a.usable) ?? null;
    const activeUnit = state?.units.find((unit) => unit.id === state.activeUnitId) ?? null;
    const canAct = phase === 'idle' && view?.status === 'in_progress' && activeUnit?.team === view.playerTeam;

    // Desistir não depende de ser a vez do jogador: basta a tela estar parada.
    const canSurrender = phase === 'idle' && view?.status === 'in_progress';

    /** Envia um pedido à API e anima a resposta. Serve para a jogada e para a desistência. */
    async function submit(request: (battleId: string) => Promise<BattleResponse>) {
        if (!view || !state) return;

        const run = runRef.current;

        setPhase('busy');

        try {
            let response = await request(view.id);

            // Entre jogadores: se o outro fez algo que esta tela ainda não tinha
            // visto, a resposta não começa de onde a tela está. Busca tudo o que
            // falta, para animar na ordem certa.
            if (response.battle.mode === 'pvp' && response.battle.cursor - response.events.length !== view.cursor) {
                response = await getBattleEvents(view.id, view.cursor);
            }

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

    async function act(targetId?: string) {
        if (!canAct || !activeUnit || !selected) return;

        await submit((battleId) =>
            sendBattleAction(battleId, {
                unitId: activeUnit.id,
                skillId: selected.skill.id,
                ...(selected.requiresTarget && targetId ? { targetId } : {}),
            }),
        );
    }

    async function surrender() {
        if (!canSurrender) return;

        setIsConfirming(true);

        const confirmed = await confirm({
            title: t('battle.surrenderTitle'),
            message: t('battle.surrenderMessage'),
            confirmLabel: t('battle.surrender'),
            cancelLabel: t('battle.surrenderCancel'),
            variant: 'danger',
        });

        setIsConfirming(false);

        if (confirmed) {
            await submit(surrenderBattle);
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
        selectSkill: (skillId: string) => {
            sfx.play('click');
            setSelectedSkillId(skillId);
        },
        act,
        canSurrender,
        surrender,
    };
}
