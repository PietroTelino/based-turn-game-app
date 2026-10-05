import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/Layout';
import { RankProgress } from '@/components/battle/RankProgress';
import { UsageList } from '@/components/battle/UsageList';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboard } from '@/hooks/useDashboard';
import '@/styles/battle.css';

export function DashboardPage() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { profile, stats, characters, isLoading, hasError } = useDashboard();

    return (
        <Layout title={t('nav.dashboard')}>
            <div className='flex flex-col gap-2'>
                <h2 className='text-xl font-semibold text-gray-900 dark:text-white'>
                    {t('dashboard.greeting', { name: user?.name })}
                </h2>
                <p className='text-sm text-gray-500 dark:text-gray-400'>
                    {t('dashboard.welcome')}{' '}
                    <span className='font-medium text-gray-700 dark:text-gray-200'>{user?.role}</span>.
                </p>
            </div>

            {/* O que o jogo tem para mostrar do jogador: o rank e os personagens mais usados. */}
            <div className='bt bt-play bt-dashboard'>
                {isLoading && <p className='bt-message'>{t('dashboard.loading')}</p>}
                {hasError && <p className='bt-message bt-message--error'>{t('dashboard.loadError')}</p>}

                {!isLoading && !hasError && profile && stats && (
                    <>
                        <section className='bt-panel bt-dashboard__rank' aria-label={t('ranked.yourRank')}>
                            <h3 className='bt-subtitle'>{t('dashboard.rankTitle')}</h3>
                            <RankProgress profile={profile} />
                            <Link to='/ranked' className='bt-btn'>
                                {t('dashboard.playRanked')}
                            </Link>
                        </section>

                        <div className='bt-dashboard__usage'>
                            <UsageList
                                title={t('dashboard.usage.mineTitle')}
                                note={t('dashboard.usage.mineNote')}
                                emptyText={t('dashboard.usage.mineEmpty')}
                                ranking={stats.mine}
                                characters={characters}
                            />
                            <UsageList
                                title={t('dashboard.usage.globalTitle')}
                                note={t('dashboard.usage.globalNote')}
                                emptyText={t('dashboard.usage.globalEmpty')}
                                ranking={stats.global}
                                characters={characters}
                            />
                        </div>
                    </>
                )}
            </div>
        </Layout>
    );
}
