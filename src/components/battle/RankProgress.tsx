import { useTranslation } from 'react-i18next';
import { RankBadge } from '@/components/battle/RankBadge';
import type { RankedProfile } from '@/types/ranked';

/**
 * O resumo da ranqueada de um jogador: o emblema e o nome do rank, os pontos,
 * a barra até o próximo rank e o placar de vitórias e derrotas.
 */
export function RankProgress({ profile }: { profile: RankedProfile }) {
    const { t } = useTranslation();
    const { points, rankFloor, next } = profile;
    // A barra vai do começo do rank atual até o começo do próximo. No último rank ela fica cheia.
    const percent = next ? Math.round(((points - rankFloor) / (next.at - rankFloor)) * 100) : 100;

    return (
        <div className='bt-rankcard'>
            <RankBadge rank={profile.rank} iconOnly className='bt-rankcard__badge' />

            <div className='bt-rankcard__body'>
                <p className='bt-rankcard__rank'>{t(`ranked.ranks.${profile.rank}`)}</p>
                <p className='bt-rankcard__points'>{t('ranked.points', { count: points })}</p>

                <div
                    className='bt-rankcard__track'
                    role='progressbar'
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={percent}
                    aria-label={t('ranked.progress')}
                >
                    <span className='bt-rankcard__fill' style={{ width: `${percent}%` }} />
                </div>

                <p className='bt-rankcard__next'>
                    {next
                        ? t('ranked.toNext', { count: next.at - points, rank: t(`ranked.ranks.${next.rank}`) })
                        : t('ranked.topRank')}
                </p>
            </div>

            <dl className='bt-rankcard__record'>
                <div>
                    <dt>{t('ranked.wins')}</dt>
                    <dd>{profile.wins}</dd>
                </div>
                <div>
                    <dt>{t('ranked.losses')}</dt>
                    <dd>{profile.losses}</dd>
                </div>
            </dl>
        </div>
    );
}
