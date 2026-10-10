import { Link, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/Layout';
import { BattleLog, EnergyPips, SkillBar, TurnQueue } from '@/components/battle/BattleHud';
import { ReplayBar } from '@/components/battle/ReplayBar';
import { CharacterArt } from '@/components/battle/CharacterArt';
import { FxLayer } from '@/components/battle/FxLayer';
import { SoundControl } from '@/components/battle/SoundControl';
import { TutorialGuide } from '@/components/battle/TutorialGuide';
import { UnitToken } from '@/components/battle/UnitToken';
import { bonusOf, corpsesOf } from '@/battle/passives';
import { toPercent } from '@/battle/playback';
import { ratingKey } from '@/battle/rating';
import { useBattle } from '@/hooks/useBattle';
import { useTutorial } from '@/hooks/useTutorial';
import type { BattleResponse, TeamId } from '@/types/battle';
import '@/styles/battle.css';

/** 75 -> "1:15": o prazo da vez, na partida ranqueada. */
function formatClock(seconds: number): string {
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** Abaixo disto o relógio da vez fica vermelho. */
const URGENT_SECONDS = 15;

function BattleScreen({ battleId, opening, isReplay = false }: { battleId: string; opening?: BattleResponse; isReplay?: boolean }) {
    const { t } = useTranslation();
    const {
        view,
        state,
        phase,
        effects,
        log,
        actions,
        selected,
        activeUnit,
        canAct,
        turnSecondsLeft,
        replay,
        targetIds,
        selectSkill,
        act,
        canSurrender,
        surrender,
    } = useBattle(battleId, opening, { replay: isReplay });
    /** Batalha de treino: mostra o guia e destaca a parte da tela de que ele fala. No replay ninguém joga, então não há guia. */
    const isTutorial = !isReplay && view?.state.training === true;
    const tutorial = useTutorial(isTutorial, { view, state, canAct, actions, selected });

    if (phase === 'loading') {
        return <p className='bt-message'>{t(isReplay ? 'replay.loading' : 'battle.loading')}</p>;
    }

    if (phase === 'error' || !view || !state) {
        return (
            <div className='bt-message'>
                <p>{t(isReplay ? 'replay.unavailable' : 'battle.notFound')}</p>
                <Link to='/play' className='bt-btn'>
                    {t('battle.backToPlay')}
                </Link>
            </div>
        );
    }

    const playerTeam = view.playerTeam;
    const enemyTeam: TeamId = playerTeam === 'A' ? 'B' : 'A';
    const isAnimating = phase === 'busy';
    const isOver = !isAnimating && view.status === 'finished';
    const playerWon = view.winner === playerTeam;
    /** Time com mais de três: as figuras e as placas encolhem para caber (bt-arena--crowd). */
    const isCrowded = state.units.filter((unit) => unit.team === playerTeam).length > 3 || state.units.filter((unit) => unit.team === enemyTeam).length > 3;
    /** Berserk em porcentagem (50 = dano +50%); 0 enquanto não começou. */
    const berserk = toPercent(state.fury);

    const renderTeam = (team: TeamId, side: 'left' | 'right') => {
        return (
            <div className={`bt-team bt-team--${side}`}>
                {state.units
                    .filter((unit) => unit.team === team)
                    .map((unit) => (
                        <UnitToken
                            key={unit.id}
                            unit={unit}
                            units={state.units}
                            isActive={state.activeUnitId === unit.id}
                            acting={effects.skill?.sourceId === unit.id ? effects.skill : null}
                            isHit={effects.hitUnitIds.includes(unit.id)}
                            isHealed={effects.healedUnitIds.includes(unit.id)}
                            isMorphing={effects.morphingUnitIds.includes(unit.id)}
                            isFalling={effects.fallingUnitIds.includes(unit.id)}
                            isTargetable={targetIds.includes(unit.id)}
                            impact={effects.impacts.find((impact) => impact.unitId === unit.id) ?? null}
                            floaters={effects.floaters.filter((floater) => floater.unitId === unit.id)}
                            onSelect={(unitId) => play(unitId)}
                        />
                    ))}
                {/* Depois das unidades, para não mudar a posição delas na fila (nth-child). */}
                {coachFocus === 'teams' && (
                    <span className={`bt-coach-label bt-coach-label--${side}`}>{t(side === 'left' ? 'tutorial.yourTeam' : 'tutorial.enemyTeam')}</span>
                )}
            </div>
        );
    };

    let hint: string;

    const playerSurrendered = state.surrenderedBy === playerTeam;
    const enemySurrendered = state.surrenderedBy === enemyTeam;
    const isVersus = view.mode === 'pvp';
    /** Batalha entre jogadores, na vez do outro: não há jogada para escolher, só esperar. */
    const isWaitingOpponent = isVersus && view.status === 'in_progress' && actions.length === 0;
    /** Para onde o jogador volta quando a batalha acaba. */
    const lobbyPath = view.ranked ? '/ranked' : isVersus ? '/multiplayer' : '/play';
    /** A desistência foi por tempo esgotado (partida ranqueada). */
    const timedOut = state.timedOut === true;
    /** As passivas de quem está na vez: são mostradas junto das habilidades dele. */
    const actingUnit = actions.length > 0 ? view.state.units.find((unit) => unit.id === view.state.activeUnitId) : undefined;
    const actingPassives = actingUnit?.passives ?? [];
    /** A parte da tela que o guia do treino está explicando agora. */
    const coachFocus = tutorial?.guide.focus ?? null;

    /** No treino, a primeira jogada encerra a lição do começo. */
    const play = (targetId?: string) => {
        tutorial?.noteAction();
        act(targetId);
    };

    if (isReplay) {
        hint = t(isOver ? 'replay.finished' : 'replay.hint');
    } else if (isOver) {
        hint = playerSurrendered ? t('battle.log.surrendered') : playerWon ? t('battle.log.won') : t('battle.log.lost');
    } else if (isWaitingOpponent && !isAnimating) {
        hint = t('battle.waitingOpponent');
    } else if (!canAct || !selected) {
        hint = t('battle.resolving');
    } else if (selected.requiresTarget) {
        hint = t('battle.chooseTarget', { skill: selected.skill.name });
    } else if (selected.skill.target === 'corpse') {
        hint = t('battle.raisesCorpse', { skill: selected.skill.name, unit: state.units.find((unit) => unit.id === selected.targetIds[0])?.name });
    } else {
        hint = t('battle.hitsAll', { skill: selected.skill.name });
    }

    return (
        <div className='bt bt--battle' {...(coachFocus && { 'data-coach': coachFocus })}>
            <div
                className={['bt-arena', isCrowded && 'bt-arena--crowd', effects.quake && 'bt-arena--quake', isOver && !playerWon && 'bt-arena--lost']
                    .filter(Boolean)
                    .join(' ')}
                data-arena={state.arena ?? 'muralha'}
            >
                {/* Vem antes de tudo para ficar só sobre o cenário, atrás das figuras e dos selos. */}
                {berserk > 0 && !isOver && <span className='bt-berserk-veil' aria-hidden='true' />}

                <div className='bt-topbar'>
                    <span className='bt-topbar__turn'>
                        <span className='bt-chip'>{t('battle.turn', { turn: state.turn })}</span>
                        {isReplay && <span className='bt-chip bt-chip--tag'>{t('replay.tag')}</span>}
                        {view.ranked && <span className='bt-chip bt-chip--tag bt-chip--ranked'>{t('battle.ranked')}</span>}
                        {/* O prazo de quem está na vez. Só aparece com a tela parada, que é quando ele corre. */}
                        {turnSecondsLeft !== null && (
                            <span
                                className={`bt-chip bt-chip--timer ${turnSecondsLeft <= URGENT_SECONDS ? 'bt-chip--urgent' : ''}`}
                                title={t(canAct ? 'battle.timerYours' : 'battle.timerTheirs')}
                                role='timer'
                            >
                                {formatClock(turnSecondsLeft)}
                            </span>
                        )}
                        {/* A chave faz o selo "pular" de novo cada vez que o bônus cresce. */}
                        {berserk > 0 && (
                            <span key={berserk} className='bt-chip bt-chip--berserk' title={t('battle.berserkHint', { percent: berserk })}>
                                {t('battle.berserk', { percent: berserk })}
                            </span>
                        )}
                    </span>
                    <TurnQueue
                        order={state.order}
                        activeUnitId={state.activeUnitId}
                        units={state.units}
                        isOver={state.winner !== null}
                        justChanged={effects.orderChanged}
                    />
                    <span className='bt-chip bt-chip--energy'>
                        <span className='bt-chip__label'>{t('battle.enemyEnergy')}</span>
                        <EnergyPips value={state.energy[enemyTeam]} turnEnergy={state.turnEnergy} label={t('battle.enemyEnergy')} />
                    </span>
                </div>

                <div className='bt-field'>
                    {renderTeam(playerTeam, 'left')}
                    {renderTeam(enemyTeam, 'right')}
                </div>

                <FxLayer skill={effects.skill} />

                {effects.quake && <span className='bt-flash' aria-hidden='true' />}

                {effects.banner && (
                    <p key={effects.banner} className='bt-banner' role='status'>
                        {effects.banner}
                    </p>
                )}

                {effects.announce && (
                    <p
                        key={effects.announce.text}
                        className={['bt-announce', !effects.announce.big && 'bt-announce--turn', effects.announce.berserk && 'bt-announce--berserk']
                            .filter(Boolean)
                            .join(' ')}
                        role='status'
                    >
                        {effects.announce.text}
                        {effects.announce.detail && <span className='bt-announce__detail'>{effects.announce.detail}</span>}
                    </p>
                )}

                {isOver && (
                    <div
                        className={`bt-result ${playerWon ? 'bt-result--won' : 'bt-result--lost'}`}
                        role='dialog'
                        aria-label={playerWon ? t('battle.victory') : t('battle.defeat')}
                    >
                        {playerWon && <span className='bt-result__rays' aria-hidden='true' />}
                        <div className={`bt-result__card ${playerWon ? 'bt-result__card--won' : ''}`}>
                            <p className='bt-result__title'>{playerWon ? t('battle.victory') : t('battle.defeat')}</p>
                            <p className='bt-result__text'>
                                {t(
                                    playerSurrendered
                                        ? timedOut
                                            ? 'battle.timedOutText'
                                            : 'battle.surrenderedText'
                                        : enemySurrendered
                                          ? timedOut
                                              ? 'battle.enemyTimedOutText'
                                              : 'battle.enemySurrenderedText'
                                          : playerWon
                                            ? 'battle.victoryText'
                                            : 'battle.defeatText',
                                    { turn: state.turn },
                                )}
                            </p>
                            {/* Partida ranqueada: quantos pontos ela valeu. */}
                            {view.ratingChange !== null && (
                                <p className={`bt-result__rating ${view.ratingChange > 0 ? 'bt-result__rating--up' : ''}`}>
                                    {t(ratingKey(view.ratingChange), { count: Math.abs(view.ratingChange) })}
                                </p>
                            )}
                            {/* Quem do seu time ficou de pé */}
                            <ul className='bt-result__team' aria-label={t('battle.survivors')}>
                                {state.units
                                    .filter((unit) => unit.team === playerTeam)
                                    .map((unit) => (
                                        <li
                                            key={unit.id}
                                            className={`bt-result__face ${unit.hp <= 0 ? 'bt-result__face--down' : ''}`}
                                            title={unit.name}
                                        >
                                            <CharacterArt characterId={unit.characterId} form={unit.form} kind='face' className='bt-queue__sprite' />
                                            <span className='bt-visually-hidden'>
                                                {t(unit.hp > 0 ? 'battle.survived' : 'battle.fell', { unit: unit.name })}
                                            </span>
                                        </li>
                                    ))}
                            </ul>
                            <div className='bt-result__buttons'>
                                {isReplay && replay ? (
                                    <>
                                        <button type='button' className='bt-btn' onClick={replay.restart}>
                                            {t('replay.again')}
                                        </button>
                                        <Link to='/play' className='bt-btn bt-btn--plain'>
                                            {t('replay.back')}
                                        </Link>
                                    </>
                                ) : (
                                    <>
                                        <Link to={lobbyPath} className='bt-btn'>
                                            {t(isTutorial ? 'tutorial.buildTeam' : view.ranked ? 'battle.newRanked' : 'battle.newBattle')}
                                        </Link>
                                        {view.hasReplay && (
                                            <Link to={`/replay/${view.id}`} className='bt-btn bt-btn--plain'>
                                                {t('replay.watch')}
                                            </Link>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {tutorial && <TutorialGuide guide={tutorial.guide} unitName={activeUnit?.name ?? ''} onAdvance={tutorial.advance} />}

            <section className='bt-hud' aria-label={t('battle.hudLabel')}>
                <div className='bt-hud__head'>
                    <h2 className='bt-hud__title'>
                        {isReplay
                            ? t('replay.title')
                            : activeUnit
                              ? t(activeUnit.team === playerTeam ? 'battle.yourTurn' : 'battle.enemyTurn', { unit: activeUnit.name })
                              : t('battle.title')}
                    </h2>
                    <div className='bt-hud__side'>
                        <span className='bt-hud__energy'>
                            <span className='bt-chip__label'>{t('battle.energy')}</span>
                            <EnergyPips value={state.energy[playerTeam]} turnEnergy={state.turnEnergy} label={t('battle.energy')} />
                        </span>
                        <SoundControl />
                    </div>
                </div>

                {replay ? (
                    <ReplayBar replay={replay} />
                ) : isWaitingOpponent ? (
                    <p className='bt-hud__waiting'>{t('battle.waitingOpponentLong')}</p>
                ) : (
                    <SkillBar
                        actions={actions}
                        passives={actingPassives}
                        // Quem conta cadáveres mostra a conta mesmo zerada.
                        charge={corpsesOf(actingUnit) ?? bonusOf(actingUnit, state.units)}
                        selectedSkillId={selected?.skill.id ?? null}
                        disabled={!canAct}
                        berserk={berserk > 0}
                        onSelect={selectSkill}
                    />
                )}

                <div className='bt-hud__foot'>
                    <p className='bt-hud__hint' aria-live='polite'>
                        {hint}
                    </p>
                    <div className='bt-hud__buttons'>
                        {canAct && selected && !selected.requiresTarget && (
                            <button type='button' className='bt-btn' onClick={() => play()}>
                                {t('battle.useSkill', { skill: selected.skill.name })}
                            </button>
                        )}
                        {view.status === 'in_progress' && (
                            <button type='button' className='bt-btn bt-btn--quiet' disabled={!canSurrender} onClick={surrender}>
                                {t('battle.surrender')}
                            </button>
                        )}
                    </div>
                </div>
            </section>

            <BattleLog entries={log} />
        </div>
    );
}

/** `replay`: a rota /replay/:id, que mostra uma batalha encerrada do começo ao fim em vez de deixar jogar. */
export function BattlePage({ replay = false }: { replay?: boolean }) {
    const { t } = useTranslation();
    const { id } = useParams();
    const location = useLocation();
    const opening = (location.state as { opening?: BattleResponse } | null)?.opening;

    return (
        <Layout title={t(replay ? 'replay.title' : 'battle.title')}>
            {/* key: trocar de batalha (ou da batalha para o replay dela) recria a tela do zero */}
            {id && <BattleScreen key={`${replay ? 'replay' : 'battle'}-${id}`} battleId={id} isReplay={replay} {...(!replay && opening && { opening })} />}
        </Layout>
    );
}
