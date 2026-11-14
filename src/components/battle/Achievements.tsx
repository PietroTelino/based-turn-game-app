import { useTranslation } from 'react-i18next';
import type { Achievement } from '@/api/progression';
import { CharacterArt } from '@/components/battle/CharacterArt';
import { Amount } from '@/components/battle/Currency';
import { useProgression } from '@/hooks/useProgression';
import type { Character } from '@/types/battle';

/** O que a conquista pede, em uma frase ("Vença 10 partidas com o Criomante"). */
export function achievementGoal(t: (key: string, options?: Record<string, unknown>) => string, achievement: Achievement, characters: Character[]): string {
    const name = characters.find((c) => c.id === achievement.characterId)?.name ?? '';

    return t(`achievements.metric.${achievement.metric}`, { count: achievement.goal, name });
}

/**
 * A aba de conquistas: cada uma com o que pede, a barra de progresso e a
 * recompensa. As que dão personagem mostram o retrato dele. As completas vão
 * para o fim da lista.
 */
export function Achievements({ characters }: { characters: Character[] }) {
    const { t, i18n } = useTranslation();
    const progression = useProgression();

    if (!progression) return <p className='bt-message'>{t('achievements.loading')}</p>;

    const list = [...progression.achievements].sort((a, b) => Number(a.completed) - Number(b.completed) || b.progress / b.goal - a.progress / a.goal);
    const done = progression.achievements.filter((a) => a.completed).length;

    return (
        <div className='bt-mode bt-achievements'>
            <p className='bt-lead'>{t('achievements.summary', { done, total: progression.achievements.length })}</p>
            <ul className='bt-achievements__list'>
                {list.map((achievement) => {
                    const reward = achievement.reward;
                    const character = characters.find((c) => c.id === reward.character);
                    const percent = Math.round((achievement.progress / achievement.goal) * 100);

                    return (
                        <li key={achievement.id} className={`bt-achievement ${achievement.completed ? 'bt-achievement--done' : ''}`}>
                            <span className='bt-achievement__seal' aria-hidden='true'>
                                {character ? <CharacterArt characterId={character.id} kind='face' className='bt-achievement__face' /> : achievement.completed ? '★' : '☆'}
                            </span>
                            <div className='bt-achievement__body'>
                                <h3 className='bt-achievement__name'>{t(`achievements.items.${achievement.id}`)}</h3>
                                <p className='bt-achievement__goal'>{achievementGoal(t, achievement, characters)}</p>
                                <div className='bt-achievement__bar' role='progressbar' aria-valuemin={0} aria-valuemax={achievement.goal} aria-valuenow={achievement.progress}>
                                    <span style={{ width: `${percent}%` }} />
                                </div>
                                <p className='bt-achievement__status'>
                                    {achievement.completed && achievement.completedAt
                                        ? t('achievements.completedOn', { date: new Date(achievement.completedAt).toLocaleDateString(i18n.language) })
                                        : t('achievements.progress', { progress: achievement.progress, goal: achievement.goal })}
                                </p>
                            </div>
                            <div className='bt-achievement__reward'>
                                <span className='bt-achievement__reward-label'>{t('achievements.reward')}</span>
                                {character && <span className='bt-achievement__unlock'>{t('achievements.unlocks', { name: character.name })}</span>}
                                {reward.gold ? <Amount currency='gold' value={reward.gold} /> : null}
                                {reward.diamonds ? <Amount currency='diamonds' value={reward.diamonds} /> : null}
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
