import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { claimReward } from '@/api/progression';
import type { ClaimTarget, Mission } from '@/api/progression';
import { Amount } from '@/components/battle/Currency';
import { useToast } from '@/contexts/ToastContext';
import { setProgression, useProgression } from '@/hooks/useProgression';

function messageOf(error: unknown): string | undefined {
    return (error as { response?: { data?: { message?: string } } }).response?.data?.message;
}

/** Quanto falta para `when`, em "5h 12min" ou "2d 4h". */
function timeLeft(t: (key: string, options?: Record<string, unknown>) => string, when: string): string {
    const minutes = Math.max(0, Math.round((new Date(when).getTime() - Date.now()) / 60000));
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);

    return days > 0 ? t('missions.leftDays', { days, hours }) : t('missions.leftHours', { hours, minutes: minutes % 60 });
}

/**
 * A aba de missões: 3 do dia e 3 da semana, sorteadas para cada jogador.
 * Completa, a missão ganha o botão de resgatar a recompensa.
 */
export function Missions() {
    const { t } = useTranslation();
    const { showToast } = useToast();
    const progression = useProgression();
    const [busy, setBusy] = useState<string | null>(null);

    if (!progression) return <p className='bt-message'>{t('missions.loading')}</p>;

    const { missions } = progression;

    async function claim(target: ClaimTarget, key: string) {
        setBusy(key);

        try {
            setProgression(await claimReward(target));
            showToast(t('missions.claimed'), 'success');
        } catch (error) {
            showToast(messageOf(error) ?? t('errors.genericError'), 'error');
        } finally {
            setBusy(null);
        }
    }

    const renderList = (type: 'daily' | 'weekly', list: Mission[]) => (
        <ul className='bt-achievements__list'>
            {list.map((mission) => {
                const key = `${type}:${mission.id}`;
                const done = mission.progress >= mission.goal;
                const percent = Math.round((mission.progress / mission.goal) * 100);

                return (
                    <li key={mission.id} className={`bt-achievement ${mission.claimed ? 'bt-achievement--done' : ''}`}>
                        <span className='bt-achievement__seal' aria-hidden='true'>
                            {mission.claimed ? '✓' : done ? '★' : '☆'}
                        </span>
                        <div className='bt-achievement__body'>
                            <h3 className='bt-achievement__name'>{t(`missions.metric.${mission.metric}`, { count: mission.goal, role: mission.role ? t(`play.roles.${mission.role}`) : '' })}</h3>
                            <div className='bt-achievement__bar' role='progressbar' aria-valuemin={0} aria-valuemax={mission.goal} aria-valuenow={mission.progress}>
                                <span style={{ width: `${percent}%` }} />
                            </div>
                            <p className='bt-achievement__status'>{t('achievements.progress', { progress: mission.progress, goal: mission.goal })}</p>
                        </div>
                        <div className='bt-achievement__reward'>
                            <span className='bt-achievement__reward-label'>{t('achievements.reward')}</span>
                            <Amount currency='gold' value={mission.reward.gold} />
                            {mission.reward.diamonds ? <Amount currency='diamonds' value={mission.reward.diamonds} /> : null}
                            {mission.claimed ? (
                                <span className='bt-missions__claimed'>{t('missions.done')}</span>
                            ) : (
                                <button type='button' className='bt-btn bt-btn--small' disabled={!done || busy !== null} onClick={() => claim({ type, id: mission.id }, key)}>
                                    {t('missions.claim')}
                                </button>
                            )}
                        </div>
                    </li>
                );
            })}
        </ul>
    );

    return (
        <div className='bt-mode bt-achievements bt-missions'>
            <section>
                <header className='bt-missions__head'>
                    <h3 className='bt-subtitle'>{t('missions.daily')}</h3>
                    <span className='bt-missions__reset'>{t('missions.resetsIn', { time: timeLeft(t, missions.dailyResetsAt) })}</span>
                </header>
                {renderList('daily', missions.daily)}
            </section>
            <section>
                <header className='bt-missions__head'>
                    <h3 className='bt-subtitle'>{t('missions.weekly')}</h3>
                    <span className='bt-missions__reset'>{t('missions.resetsIn', { time: timeLeft(t, missions.weeklyResetsAt) })}</span>
                </header>
                {renderList('weekly', missions.weekly)}
            </section>
        </div>
    );
}
