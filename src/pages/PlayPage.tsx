import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/Layout';
import { CharacterSprite } from '@/components/battle/CharacterSprite';
import { MAX_TEAM_SIZE, usePlay } from '@/hooks/usePlay';
import type { BattleSummary } from '@/types/battle';
import '@/styles/battle.css';

function battleLabelKey(battle: BattleSummary): string {
    if (battle.status === 'in_progress') return 'play.inProgress';

    // O jogador é sempre o time A.
    return battle.winner === 'A' ? 'play.won' : 'play.lost';
}

export function PlayPage() {
    const { t, i18n } = useTranslation();
    const { characters, battles, isLoading, hasError, team, isStarting, toggle, start } = usePlay();

    return (
        <Layout title={t('nav.play')}>
            <div className='bt bt-play'>
                <header>
                    <h2 className='bt-title'>{t('play.title')}</h2>
                    <p className='bt-lead'>{t('play.subtitle', { max: MAX_TEAM_SIZE })}</p>
                </header>

                {isLoading && <p className='bt-message'>{t('play.loading')}</p>}
                {hasError && <p className='bt-message bt-message--error'>{t('play.loadError')}</p>}

                {!isLoading && !hasError && (
                    <>
                        <div className='bt-roster'>
                            {characters.map((character) => {
                                const position = team.indexOf(character.id);
                                const isSelected = position !== -1;
                                const isFull = team.length >= MAX_TEAM_SIZE;

                                return (
                                    <button
                                        key={character.id}
                                        type='button'
                                        className={`bt-card ${isSelected ? 'bt-card--selected' : ''}`}
                                        aria-pressed={isSelected}
                                        disabled={!isSelected && isFull}
                                        onClick={() => toggle(character.id)}
                                    >
                                        {isSelected && <span className='bt-card__order'>{position + 1}</span>}
                                        <CharacterSprite characterId={character.id} className='bt-card__sprite' />
                                        <span className='bt-card__name'>{character.name}</span>
                                        <span className='bt-card__role'>{t(`play.roles.${character.role}`)}</span>
                                        <span className='bt-card__stats'>
                                            <span>{t('play.stats.hp')} <b>{character.stats.maxHp}</b></span>
                                            <span>{t('play.stats.atk')} <b>{character.stats.atk}</b></span>
                                            <span>{t('play.stats.def')} <b>{character.stats.def}</b></span>
                                            <span>{t('play.stats.speed')} <b>{character.stats.speed}</b></span>
                                        </span>
                                        <span className='bt-card__skills'>{character.skills.map((skill) => skill.name).join(', ')}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className='bt-play__actions'>
                            <button type='button' className='bt-btn bt-btn--big' disabled={team.length === 0 || isStarting} onClick={start}>
                                {isStarting ? t('play.starting') : t('play.start')}
                            </button>
                            <p className='bt-lead'>{t('play.selected', { count: team.length, max: MAX_TEAM_SIZE })}</p>
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
                                                <span className='bt-history__date'>
                                                    {new Date(battle.createdAt).toLocaleString(i18n.language)}
                                                </span>
                                            </span>
                                            <Link to={`/battle/${battle.id}`} className='bt-link'>
                                                {t(battle.status === 'in_progress' ? 'play.continue' : 'play.review')}
                                            </Link>
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
