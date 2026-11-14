import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getLeaderboard } from '@/api/ranked';
import { seasonName } from '@/battle/rating';
import { RankBadge } from '@/components/battle/RankBadge';
import { useAuth } from '@/contexts/AuthContext';
import type { Leaderboard as Board } from '@/types/ranked';

/** O placar de líderes da temporada ranqueada: os 50 primeiros e a sua posição. */
export function Leaderboard() {
    const { t, i18n } = useTranslation();
    const { user } = useAuth();
    const [board, setBoard] = useState<Board | null>(null);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        let cancelled = false;

        getLeaderboard()
            .then((data) => !cancelled && setBoard(data))
            .catch(() => !cancelled && setHasError(true));

        return () => {
            cancelled = true;
        };
    }, []);

    if (hasError) return <p className='bt-message bt-message--error'>{t('leaderboard.loadError')}</p>;
    if (!board) return <p className='bt-message'>{t('leaderboard.loading')}</p>;

    const ends = new Date(board.endsAt).toLocaleDateString(i18n.language, { day: '2-digit', month: 'long' });

    return (
        <div className='bt-mode bt-leaderboard'>
            <p className='bt-lead'>{t('leaderboard.lead', { season: seasonName(board.season, i18n.language), ends })}</p>
            {board.you && <p className='bt-callout'>{t('leaderboard.you', { position: board.you.position, points: board.you.points })}</p>}

            {board.entries.length === 0 ? (
                <p className='bt-lead'>{t('leaderboard.empty')}</p>
            ) : (
                <table className='bt-leaderboard__table'>
                    <thead>
                        <tr>
                            <th scope='col'>#</th>
                            <th scope='col'>{t('leaderboard.player')}</th>
                            <th scope='col'>{t('leaderboard.rank')}</th>
                            <th scope='col'>{t('leaderboard.points')}</th>
                            <th scope='col'>{t('leaderboard.record')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {board.entries.map((entry) => (
                            <tr key={entry.userId} className={entry.userId === user?.id ? 'bt-leaderboard__me' : ''}>
                                <td className='bt-leaderboard__pos'>{entry.position}</td>
                                <td>{entry.name}</td>
                                <td>
                                    <RankBadge rank={entry.rank} />
                                </td>
                                <td className='bt-leaderboard__points'>{entry.points}</td>
                                <td>{t('leaderboard.wl', { wins: entry.wins, losses: entry.losses })}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
