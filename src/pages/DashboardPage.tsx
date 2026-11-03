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
        <Layout title={t('nav.dashboard')} heading={false}>
            <header className='bt bt-hero bt-dashboard__hero'>
                <div className='bt-hero__text'>
                    <h2 className='bt-title'>{t('dashboard.greeting', { name: user?.name })}</h2>
                    <p className='bt-lead'>
                        {t('dashboard.welcome')} <b>{user?.role}</b>.
                    </p>
                </div>
            </header>

            {/* O que o jogo tem para mostrar do jogador: o rank e os personagens mais usados. */}
            <div className='bt bt-play bt-dashboard'>
                {isLoading && <p className='bt-message'>{t('dashboard.loading')}</p>}
                {hasError && <p className='bt-message bt-message--error'>{t('dashboard.loadError')}</p>}

                {!isLoading && !hasError && profile && stats && (
                    <>
                        <section className='bt-panel bt-dashboard__rank' aria-label={t('ranked.yourRank')}>
                            <h3 className='bt-subtitle'>{t('dashboard.rankTitle')}</h3>
                            <RankProgress profile={profile} />
                            <Link to='/multiplayer/ranked' className='bt-btn'>
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
