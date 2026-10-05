import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/Layout';
import { CharacterCard } from '@/components/battle/CharacterCard';
import { TEAM_SIZE, usePlay } from '@/hooks/usePlay';
import { ratingKey } from '@/battle/rating';
import type { BattleSummary } from '@/types/battle';
import '@/styles/battle.css';

function battleLabelKey(battle: BattleSummary): string {
    if (battle.status === 'in_progress') return 'play.inProgress';

    // Contra a IA o jogador é o time A; entre jogadores, pode ser qualquer um dos dois.
    return battle.winner === battle.playerTeam ? 'play.won' : 'play.lost';
}

export function PlayPage() {
    const { t, i18n } = useTranslation();
    const { characters, battles, isLoading, hasError, team, isStarting, toggle, start } = usePlay();

    return (
        <Layout title={t('nav.play')}>
            <div className='bt bt-play'>
                <header>
                    <h2 className='bt-title'>{t('play.title')}</h2>
                    <p className='bt-lead'>{t('play.subtitle', { size: TEAM_SIZE })}</p>
                </header>

                {/* Quem nunca jogou é convidado a começar pelo treino. */}
                {!isLoading && !hasError && battles.length === 0 && (
                    <p className='bt-callout'>
                        {t('play.firstTime')}{' '}
                        <Link to='/tutorial' className='bt-link'>
                            {t('play.firstTimeLink')}
                        </Link>
                    </p>
                )}

                {isLoading && <p className='bt-message'>{t('play.loading')}</p>}
                {hasError && <p className='bt-message bt-message--error'>{t('play.loadError')}</p>}

                {!isLoading && !hasError && (
                    <>
                        <div className='bt-roster'>
                            {characters.map((character) => {
                                const position = team.indexOf(character.id);

                                return (
                                    <CharacterCard
                                        key={character.id}
                                        character={character}
                                        position={position}
                                        isLocked={position === -1 && team.length >= TEAM_SIZE}
                                        onToggle={toggle}
                                    />
                                );
                            })}
                        </div>

                        <div className='bt-play__actions'>
                            <button type='button' className='bt-btn bt-btn--big' disabled={team.length !== TEAM_SIZE || isStarting} onClick={start}>
                                {isStarting ? t('play.starting') : t('play.start')}
                            </button>
                            <p className='bt-lead'>
                                {team.length === TEAM_SIZE
                                    ? t('play.selected', { count: team.length, max: TEAM_SIZE })
                                    : t('play.selectedMissing', { count: team.length, max: TEAM_SIZE, missing: TEAM_SIZE - team.length })}
                            </p>
                        </div>

                        <section className='bt-history'>
                            <h2 className='bt-subtitle'>{t('play.recent')}</h2>
                            {battles.length === 0 ? (
                                <p className='bt-lead'>{t('play.noBattles')}</p>
                            ) : (
                                <ul className='bt-history__list'>
                                    {battles.map((battle) => (
                                        <li key={battle.id} className='bt-history__item'>
                                            <span>
                                                <b>{t(battleLabelKey(battle), { turn: battle.turn })}</b>
                                                {battle.ranked ? (
                                                    <span className='bt-history__tag bt-history__tag--ranked'>{t('play.ranked')}</span>
                                                ) : (
                                                    battle.mode === 'pvp' && <span className='bt-history__tag'>{t('play.versusPlayer')}</span>
                                                )}
                                                {/* Partida ranqueada encerrada: quantos pontos ela valeu. */}
                                                {battle.ratingChange !== null && (
                                                    <span className={`bt-history__points ${battle.ratingChange > 0 ? 'bt-history__points--up' : ''}`}>
                                                        {t(ratingKey(battle.ratingChange), { count: Math.abs(battle.ratingChange) })}
                                                    </span>
                                                )}
                                                <span className='bt-history__date'>
                                                    {new Date(battle.createdAt).toLocaleString(i18n.language)}
                                                </span>
                                            </span>
                                            <span className='bt-history__links'>
                                                {/* As batalhas antigas não guardaram o começo: delas só dá para ver o resultado. */}
                                                {battle.status === 'finished' && battle.hasReplay && (
                                                    <Link to={`/replay/${battle.id}`} className='bt-link'>
                                                        {t('play.replay')}
                                                    </Link>
                                                )}
                                                <Link to={`/battle/${battle.id}`} className='bt-link'>
                                                    {t(battle.status === 'in_progress' ? 'play.continue' : 'play.review')}
                                                </Link>
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    </>
                )}
            </div>
        </Layout>
    );
}
