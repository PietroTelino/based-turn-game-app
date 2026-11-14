import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { buyCharacter } from '@/api/progression';
import type { Currency } from '@/api/progression';
import { CharacterArt } from '@/components/battle/CharacterArt';
import { Amount } from '@/components/battle/Currency';
import { achievementGoal } from '@/components/battle/Achievements';
import { useConfirm } from '@/contexts/ConfirmContext';
import { setProgression, useProgression } from '@/hooks/useProgression';
import type { Character } from '@/types/battle';

/**
 * A loja: os personagens bloqueados, cada um com o preço em ouro e em
 * diamantes e a conquista que também o libera. Comprar pede confirmação.
 */
export function Shop({ characters }: { characters: Character[] }) {
    const { t } = useTranslation();
    const { confirm } = useConfirm();
    const progression = useProgression();
    const [buying, setBuying] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    if (!progression) return <p className='bt-message'>{t('shop.loading')}</p>;

    async function buy(characterId: string, currency: Currency, price: number) {
        const name = characters.find((c) => c.id === characterId)?.name ?? characterId;
        const ok = await confirm({
            title: t('shop.confirmTitle', { name }),
            message: t('shop.confirmMessage', { name, price: price.toLocaleString(), currency: t(`progression.${currency}`) }),
            confirmLabel: t('shop.buy'),
            variant: 'info',
        });

        if (!ok) return;

        setBuying(characterId);
        setError(null);

        try {
            setProgression(await buyCharacter(characterId, currency));
        } catch (err) {
            const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
            setError(message ?? t('shop.error'));
        } finally {
            setBuying(null);
        }
    }

    return (
        <div className='bt-mode bt-shop'>
            <div className='bt-shop__wallet'>
                <span>{t('shop.balance')}</span>
                <Amount currency='gold' value={progression.gold} />
                <Amount currency='diamonds' value={progression.diamonds} />
            </div>
            {error && <p className='bt-message bt-message--error'>{error}</p>}
            <ul className='bt-shop__grid'>
                {progression.shop.map((item) => {
                    const character = characters.find((c) => c.id === item.characterId);
                    const achievement = progression.achievements.find((a) => a.id === item.achievementId);

                    if (!character) return null;

                    return (
                        <li key={item.characterId} className={`bt-shop__item ${item.owned ? 'bt-shop__item--owned' : ''}`}>
                            <span className='bt-shop__art'>
                                <CharacterArt characterId={character.id} kind='card' className='bt-shop__sprite' />
                            </span>
                            <h3 className='bt-shop__name'>{character.name}</h3>
                            <p className='bt-shop__role'>{t(`play.roles.${character.role}`)}</p>
                            {item.owned ? (
                                <p className='bt-shop__owned'>{t('shop.owned')}</p>
                            ) : (
                                <>
                                    <div className='bt-shop__buttons'>
                                        {(['gold', 'diamonds'] as const).map((currency) => (
                                            <button
                                                key={currency}
                                                type='button'
                                                className={`bt-btn bt-shop__buy bt-shop__buy--${currency}`}
                                                disabled={buying !== null || progression[currency] < item[currency]}
                                                onClick={() => buy(item.characterId, currency, item[currency])}
                                                title={progression[currency] < item[currency] ? t(`shop.notEnough.${currency}`) : undefined}
                                            >
                                                <Amount currency={currency} value={item[currency]} />
                                            </button>
                                        ))}
                                    </div>
                                    {achievement && <p className='bt-shop__or'>{t('shop.orAchievement', { goal: achievementGoal(t, achievement, characters) })}</p>}
                                </>
                            )}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
