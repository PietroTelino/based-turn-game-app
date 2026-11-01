import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DraftBoard } from '@/components/battle/DraftBoard';
import { RankBadge } from '@/components/battle/RankBadge';
import { RankProgress } from '@/components/battle/RankProgress';
import { useRanked } from '@/hooks/useRanked';
import { RANK_IDS } from '@/types/ranked';

/** 75 -> "1:15": há quanto tempo a tela está procurando. */
function formatClock(seconds: number): string {
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/**
 * A aba ranqueada do multiplayer: o rank do jogador, a fila com pareamento
 * automático e, depois dele, a seleção de personagens contra o adversário.
 */
export function RankedLobby() {
    const { t } = useTranslation();
    const { profile, characters, phase, queue, waited, isSending, isSearching, isDrafting, canSearch, search, cancel, draft, deadline, isChoosing, choose } = useRanked();

    return (
        <>
            {!isDrafting && <p className='bt-lead'>{t('ranked.subtitle')}</p>}

            {phase === 'loading' && <p className='bt-message'>{t('ranked.loading')}</p>}
            {phase === 'error' && <p className='bt-message bt-message--error'>{t('ranked.loadError')}</p>}

            {phase === 'ready' && profile && queue && (
                <>
                    {/* Na seleção de personagens, a tela é toda dela. */}
                    {!isDrafting && (
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
                    )}

                    {queue.status === 'matched' && queue.battleId ? (
                        <section className='bt-panel' aria-live='polite'>
                            <h3 className='bt-subtitle'>{t('ranked.inBattleTitle')}</h3>
                            <p className='bt-panel__text'>{t('ranked.inBattleText')}</p>
                            <Link to={`/battle/${queue.battleId}`} className='bt-btn'>
                                {t('ranked.backToBattle')}
                            </Link>
                        </section>
                    ) : isDrafting ? (
                        draft ? (
                            <DraftBoard draft={draft} deadline={deadline} characters={characters} isChoosing={isChoosing} onChoose={choose} />
                        ) : (
                            <p className='bt-message'>{t('ranked.draft.loading')}</p>
                        )
                    ) : (
                        <>
                            <section className='bt-panel bt-room__bar bt-ranked__queue' aria-label={t('ranked.queueLabel')}>
                                <p className='bt-room__note' aria-live='polite'>
                                    {isSearching ? (
                                        <>
                                            <span className='bt-ranked__pulse' aria-hidden='true' />
                                            {t('ranked.searching', { time: formatClock(waited) })}
                                        </>
                                    ) : (
                                        t('ranked.readyToSearch')
                                    )}
                                </p>
                                <div className='bt-room__buttons'>
                                    {isSearching ? (
                                        <button type='button' className='bt-btn bt-btn--quiet' disabled={isSending} onClick={cancel}>
                                            {t('ranked.cancel')}
                                        </button>
                                    ) : (
                                        <button type='button' className='bt-btn bt-btn--big' disabled={!canSearch} onClick={search}>
                                            {t('ranked.search')}
                                        </button>
                                    )}
                                </div>
                            </section>

                            <p className='bt-callout'>{t('ranked.draft.howItWorks')}</p>
                            <p className='bt-callout'>{t('ranked.rules')}</p>
                        </>
                    )}
                </>
            )}
        </>
    );
}
