import { Link, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/Layout';
import { BattleLog, EnergyPips, SkillBar, TurnQueue } from '@/components/battle/BattleHud';
import { CharacterArt } from '@/components/battle/CharacterArt';
import { FxLayer } from '@/components/battle/FxLayer';
import { SoundControl } from '@/components/battle/SoundControl';
import { TutorialGuide } from '@/components/battle/TutorialGuide';
import { UnitToken } from '@/components/battle/UnitToken';
import { bonusOf } from '@/battle/passives';
import { toPercent } from '@/battle/playback';
import { useBattle } from '@/hooks/useBattle';
import { useTutorial } from '@/hooks/useTutorial';
import type { BattleResponse, TeamId } from '@/types/battle';
import '@/styles/battle.css';

function BattleScreen({ battleId, opening }: { battleId: string; opening?: BattleResponse }) {
    const { t } = useTranslation();
    const { view, state, phase, effects, log, actions, selected, activeUnit, canAct, targetIds, selectSkill, act, canSurrender, surrender } =
        useBattle(battleId, opening);
    /** Batalha de treino: mostra o guia e destaca a parte da tela de que ele fala. */
    const isTutorial = view?.state.training === true;
    const tutorial = useTutorial(isTutorial, { view, state, canAct, actions, selected });

    if (phase === 'loading') {
        return <p className='bt-message'>{t('battle.loading')}</p>;
    }

    if (phase === 'error' || !view || !state) {
        return (
            <div className='bt-message'>
                <p>{t('battle.notFound')}</p>
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
                            isActive={state.activeUnitId === unit.id}
                            acting={effects.skill?.sourceId === unit.id ? effects.skill : null}
                            isHit={effects.hitUnitIds.includes(unit.id)}
                            isHealed={effects.healedUnitIds.includes(unit.id)}
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
    const lobbyPath = isVersus ? '/multiplayer' : '/play';
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

    if (isOver) {
        hint = playerSurrendered ? t('battle.log.surrendered') : playerWon ? t('battle.log.won') : t('battle.log.lost');
    } else if (isWaitingOpponent && !isAnimating) {
        hint = t('battle.waitingOpponent');
    } else if (!canAct || !selected) {
        hint = t('battle.resolving');
    } else if (selected.requiresTarget) {
        hint = t('battle.chooseTarget', { skill: selected.skill.name });
    } else {
        hint = t('battle.hitsAll', { skill: selected.skill.name });
    }

    return (
        <div className='bt' {...(coachFocus && { 'data-coach': coachFocus })}>
            <div
                className={['bt-arena', isCrowded && 'bt-arena--crowd', effects.quake && 'bt-arena--quake', isOver && !playerWon && 'bt-arena--lost']
                    .filter(Boolean)
                    .join(' ')}
            >
                {/* Vem antes de tudo para ficar só sobre o cenário, atrás das figuras e dos selos. */}
                {berserk > 0 && !isOver && <span className='bt-berserk-veil' aria-hidden='true' />}

                <div className='bt-topbar'>
                    <span className='bt-topbar__turn'>
                        <span className='bt-chip'>{t('battle.turn', { turn: state.turn })}</span>
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
                                        ? 'battle.surrenderedText'
                                        : enemySurrendered
                                          ? 'battle.enemySurrenderedText'
                                          : playerWon
                                            ? 'battle.victoryText'
                                            : 'battle.defeatText',
                                    { turn: state.turn },
                                )}
                            </p>
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
                                            <CharacterArt characterId={unit.characterId} kind='face' className='bt-queue__sprite' />
                                            <span className='bt-visually-hidden'>
                                                {t(unit.hp > 0 ? 'battle.survived' : 'battle.fell', { unit: unit.name })}
                                            </span>
                                        </li>
                                    ))}
                            </ul>
                            <Link to={lobbyPath} className='bt-btn'>
                                {t(isTutorial ? 'tutorial.buildTeam' : 'battle.newBattle')}
                            </Link>
                        </div>
                    </div>
                )}
            </div>

            {tutorial && <TutorialGuide guide={tutorial.guide} unitName={activeUnit?.name ?? ''} onAdvance={tutorial.advance} />}

            <section className='bt-hud' aria-label={t('battle.hudLabel')}>
                <div className='bt-hud__head'>
                    <h2 className='bt-hud__title'>
                        {activeUnit
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

                {isWaitingOpponent ? (
                    <p className='bt-hud__waiting'>{t('battle.waitingOpponentLong')}</p>
                ) : (
                    <SkillBar
                        actions={actions}
                        passives={actingPassives}
                        charge={bonusOf(actingUnit)}
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

export function BattlePage() {
    const { t } = useTranslation();
    const { id } = useParams();
    const location = useLocation();
    const opening = (location.state as { opening?: BattleResponse } | null)?.opening;

    return (
        <Layout title={t('battle.title')}>
            {/* key: trocar de batalha recria a tela do zero */}
            {id && <BattleScreen key={id} battleId={id} {...(opening && { opening })} />}
        </Layout>
    );
}
