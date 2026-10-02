import { Link, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/Layout';
import { BattleLog, EnergyPips, SkillBar, TurnQueue } from '@/components/battle/BattleHud';
import { UnitToken } from '@/components/battle/UnitToken';
import { useBattle } from '@/hooks/useBattle';
import type { BattleResponse, TeamId } from '@/types/battle';
import '@/styles/battle.css';

function BattleScreen({ battleId, opening }: { battleId: string; opening?: BattleResponse }) {
    const { t } = useTranslation();
    const { view, state, phase, effects, log, actions, selected, activeUnit, canAct, targetIds, selectSkill, act } = useBattle(
        battleId,
        opening,
    );

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
                            isActing={effects.actingUnitId === unit.id}
                            isHit={effects.hitUnitIds.includes(unit.id)}
                            isHealed={effects.healedUnitIds.includes(unit.id)}
                            isTargetable={targetIds.includes(unit.id)}
                            floaters={effects.floaters.filter((floater) => floater.unitId === unit.id)}
                            onSelect={(unitId) => act(unitId)}
                        />
                    ))}
            </div>
        );
    };

    let hint: string;

    if (isOver) {
        hint = playerWon ? t('battle.log.won') : t('battle.log.lost');
    } else if (!canAct || !selected) {
        hint = t('battle.resolving');
    } else if (selected.requiresTarget) {
        hint = t('battle.chooseTarget', { skill: selected.skill.name });
    } else {
        hint = t('battle.hitsAll', { skill: selected.skill.name });
    }

    return (
        <div className='bt'>
            <div className='bt-arena'>
                <div className='bt-topbar'>
                    <span className='bt-chip'>{t('battle.turn', { turn: state.turn })}</span>
                    <div className={isAnimating ? 'bt-queue-wrap bt-queue-wrap--stale' : 'bt-queue-wrap'}>
                        <TurnQueue order={view.turnOrder} units={state.units} />
                    </div>
                    <span className='bt-chip bt-chip--energy'>
                        <span className='bt-chip__label'>{t('battle.enemyEnergy')}</span>
                        <EnergyPips value={state.energy[enemyTeam]} label={t('battle.enemyEnergy')} />
                    </span>
                </div>

                <div className='bt-field'>
                    {renderTeam(playerTeam, 'left')}
                    {renderTeam(enemyTeam, 'right')}
                </div>

                {effects.banner && (
                    <p key={effects.banner} className='bt-banner' role='status'>
                        {effects.banner}
                    </p>
                )}

                {isOver && (
                    <div className='bt-result' role='dialog' aria-label={playerWon ? t('battle.victory') : t('battle.defeat')}>
                        <div className={`bt-result__card ${playerWon ? 'bt-result__card--won' : ''}`}>
                            <p className='bt-result__title'>{playerWon ? t('battle.victory') : t('battle.defeat')}</p>
                            <p className='bt-result__text'>
                                {t(playerWon ? 'battle.victoryText' : 'battle.defeatText', { turn: state.turn })}
                            </p>
                            <Link to='/play' className='bt-btn'>
                                {t('battle.newBattle')}
                            </Link>
                        </div>
                    </div>
                )}
            </div>

            <section className='bt-hud' aria-label={t('battle.hudLabel')}>
                <div className='bt-hud__head'>
                    <h2 className='bt-hud__title'>
                        {activeUnit
                            ? t(activeUnit.team === playerTeam ? 'battle.yourTurn' : 'battle.enemyTurn', { unit: activeUnit.name })
                            : t('battle.title')}
                    </h2>
                    <span className='bt-hud__energy'>
                        <span className='bt-chip__label'>{t('battle.energy')}</span>
                        <EnergyPips value={state.energy[playerTeam]} label={t('battle.energy')} />
                    </span>
                </div>

                <SkillBar actions={actions} selectedSkillId={selected?.skill.id ?? null} disabled={!canAct} onSelect={selectSkill} />

                <div className='bt-hud__foot'>
                    <p className='bt-hud__hint' aria-live='polite'>
                        {hint}
                    </p>
                    {canAct && selected && !selected.requiresTarget && (
                        <button type='button' className='bt-btn' onClick={() => act()}>
                            {t('battle.useSkill', { skill: selected.skill.name })}
                        </button>
                    )}
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
