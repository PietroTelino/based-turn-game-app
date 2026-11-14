import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { claimReward } from '@/api/progression';
import { Amount } from '@/components/battle/Currency';
import { useToast } from '@/contexts/ToastContext';
import { setProgression, useProgression } from '@/hooks/useProgression';

/** As estrelas de uma fase: ★★☆. */
export function StageStars({ stars }: { stars: number }) {
    const { t } = useTranslation();

    return (
        <span className='bt-stars' title={t('campaign.starsOf', { count: stars })}>
            {[1, 2, 3].map((n) => (
                <span key={n} className={n <= stars ? 'bt-stars__on' : 'bt-stars__off'} aria-hidden='true'>
                    ★
                </span>
            ))}
            <span className='bt-visually-hidden'>{t('campaign.starsOf', { count: stars })}</span>
        </span>
    );
}

/**
 * A faixa das estrelas da campanha: o total, a barra e os baús. Fácil vale 1
 * estrela, normal 2 e difícil 3 (conta a melhor vitória de cada fase).
 */
export function StarChests() {
    const { t } = useTranslation();
    const { showToast } = useToast();
    const progression = useProgression();
    const [busy, setBusy] = useState(false);

    if (!progression) return null;

    const { stars } = progression;

    async function open(at: number) {
        setBusy(true);

        try {
            setProgression(await claimReward({ type: 'chest', at }));
            showToast(t('campaign.chestOpened'), 'success');
        } catch (error) {
            showToast((error as { response?: { data?: { message?: string } } }).response?.data?.message ?? t('errors.genericError'), 'error');
        } finally {
            setBusy(false);
        }
    }

    return (
        <section className='bt-panel bt-chests' aria-label={t('campaign.starsTitle')}>
            <div className='bt-chests__total'>
                <span className='bt-chests__star' aria-hidden='true'>
                    ★
                </span>
                <strong>{t('campaign.starsTotal', { total: stars.total, max: stars.max })}</strong>
                <span className='bt-chests__hint'>{t('campaign.starsHint')}</span>
            </div>
            <ol className='bt-chests__track'>
                {stars.chests.map((chest) => {
                    const ready = stars.total >= chest.at && !chest.claimed;

                    return (
                        <li key={chest.at} className={['bt-chest', chest.claimed && 'bt-chest--open', ready && 'bt-chest--ready'].filter(Boolean).join(' ')}>
                            <span className='bt-chest__at'>★ {chest.at}</span>
                            <span className='bt-chest__reward'>
                                <Amount currency='gold' value={chest.gold} />
                                {chest.diamonds ? <Amount currency='diamonds' value={chest.diamonds} /> : null}
                            </span>
                            {chest.claimed ? (
                                <span className='bt-chest__state'>{t('campaign.chestDone')}</span>
                            ) : (
                                <button type='button' className='bt-btn bt-btn--small' disabled={!ready || busy} onClick={() => open(chest.at)}>
                                    {t('campaign.chestOpen')}
                                </button>
                            )}
                        </li>
                    );
                })}
            </ol>
        </section>
    );
}
