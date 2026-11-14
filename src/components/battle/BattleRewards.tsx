import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getBattleReward } from '@/api/progression';
import type { BattleReward } from '@/api/progression';
import { Amount } from '@/components/battle/Currency';
import { refreshProgression } from '@/hooks/useProgression';

/** No fim da batalha: o ouro ganho e as conquistas completadas nela. */
export function BattleRewards({ battleId }: { battleId: string }) {
    const { t } = useTranslation();
    const [reward, setReward] = useState<BattleReward | null>(null);

    useEffect(() => {
        let cancelled = false;

        getBattleReward(battleId)
            .then((data) => {
                if (!cancelled) setReward(data);
                void refreshProgression();
            })
            .catch(() => undefined);

        return () => {
            cancelled = true;
        };
    }, [battleId]);

    if (!reward || (reward.gold === 0 && reward.achievements.length === 0)) return null;

    return (
        <div className='bt-result__rewards'>
            {reward.gold > 0 && (
                <p className='bt-result__gold'>
                    {t('progression.earned')} <Amount currency='gold' value={reward.gold} />
                </p>
            )}
            {reward.achievements.map((id) => (
                <p key={id} className='bt-result__achievement'>
                    ★ {t('progression.achievementDone', { name: t(`achievements.items.${id}`) })}
                </p>
            ))}
        </div>
    );
}
