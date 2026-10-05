import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/Layout';
import { CharacterCard } from '@/components/battle/CharacterCard';
import { RankBadge } from '@/components/battle/RankBadge';
import { RankProgress } from '@/components/battle/RankProgress';
import { TEAM_SIZE } from '@/hooks/usePlay';
import { useRanked } from '@/hooks/useRanked';
import { RANK_IDS } from '@/types/ranked';
import '@/styles/battle.css';

/** 75 -> "1:15": há quanto tempo a tela está procurando. */
function formatClock(seconds: number): string {
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** Partida ranqueada: o rank do jogador, a escolha do time e a fila com pareamento automático. */
export function RankedPage() {
    const { t } = useTranslation();
    const { profile, characters, phase, queue, team, waited, isSending, isSearching, canChoose, toggle, search, cancel } = useRanked();

    return (
        <Layout title={t('nav.ranked')}>
            <div className='bt bt-play bt-ranked'>
                <header>
                    <h2 className='bt-title'>{t('ranked.title')}</h2>
                    <p className='bt-lead'>{t('ranked.subtitle')}</p>
                </header>

                {phase === 'loading' && <p className='bt-message'>{t('ranked.loading')}</p>}
                {phase === 'error' && <p className='bt-message bt-message--error'>{t('ranked.loadError')}</p>}

                {phase === 'ready' && profile && queue && (
                    <>
                        <section className='bt-panel bt-ranked__profile' aria-label={t('ranked.yourRank')}>
                            <RankProgress profile={profile} />

                            {/* A escada inteira, com o degrau do jogador em destaque. */}
                            <ol className='bt-ranked__ladder' aria-label={t('ranked.ladder')}>
                                {RANK_IDS.map((rank) => (
                                    <li key={rank} className={`bt-ranked__step ${rank === profile.rank ? 'bt-ranked__step--current' : ''}`}>
                                        <RankBadge rank={rank} iconOnly />
                                        <span className='bt-ranked__step-name'>{t(`ranked.ranks.${rank}`)}</span>
                                    </li>
                                ))}
                            </ol>
                        </section>

                        {queue.status === 'matched' && queue.battleId ? (
                            <section className='bt-panel' aria-live='polite'>
                                <h3 className='bt-subtitle'>{t('ranked.inBattleTitle')}</h3>
                                <p className='bt-panel__text'>{t('ranked.inBattleText')}</p>
                                <Link to={`/battle/${queue.battleId}`} className='bt-btn'>
                                    {t('ranked.backToBattle')}
                                </Link>
                            </section>
                        ) : (
                            <>
                                <div>
                                    <h3 className='bt-subtitle'>{t('ranked.teamTitle')}</h3>
                                    <p className='bt-lead'>{t('ranked.teamText', { size: TEAM_SIZE })}</p>
                                </div>

                                <div className='bt-roster'>
                                    {characters.map((character) => {
                                        const position = team.indexOf(character.id);

                                        return (
                                            <CharacterCard
                                                key={character.id}
                                                character={character}
                                                position={position}
                                                isLocked={position === -1 && (team.length >= TEAM_SIZE || isSearching)}
                                                isReadOnly={!canChoose}
                                                onToggle={toggle}
                                            />
                                        );
                                    })}
                                </div>

                                <section className='bt-panel bt-room__bar' aria-label={t('ranked.queueLabel')}>
                                    <p className='bt-room__note' aria-live='polite'>
                                        {isSearching ? (
                                            <>
                                                <span className='bt-ranked__pulse' aria-hidden='true' />
                                                {t('ranked.searching', { time: formatClock(waited) })}
                                            </>
                                        ) : team.length === TEAM_SIZE ? (
                                            t('ranked.teamReady')
                                        ) : (
                                            t('play.selectedMissing', { count: team.length, max: TEAM_SIZE, missing: TEAM_SIZE - team.length })
                                        )}
                                    </p>
                                    <div className='bt-room__buttons'>
                                        {isSearching ? (
                                            <button type='button' className='bt-btn bt-btn--quiet' disabled={isSending} onClick={cancel}>
                                                {t('ranked.cancel')}
                                            </button>
                                        ) : (
                                            <button type='button' className='bt-btn bt-btn--big' disabled={!canChoose || team.length !== TEAM_SIZE} onClick={search}>
                                                {t('ranked.search')}
                                            </button>
                                        )}
                                    </div>
                                </section>

                                <p className='bt-callout'>{t('ranked.rules')}</p>
                            </>
                        )}
                    </>
                )}
            </div>
        </Layout>
    );
}
