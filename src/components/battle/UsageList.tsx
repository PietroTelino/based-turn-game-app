import { useTranslation } from 'react-i18next';
import { CharacterArt } from '@/components/battle/CharacterArt';
import type { Character } from '@/types/battle';
import type { UsageRanking } from '@/types/ranked';

/** Quantos personagens a lista mostra: os mais usados. */
const TOP = 8;

interface UsageListProps {
    title: string;
    /** Uma linha embaixo do título, dizendo de onde vêm os números. */
    note: string;
    /** O que aparece quando ainda não há nenhum time para contar. */
    emptyText: string;
    ranking: UsageRanking;
    /** O catálogo, para dar nome a cada personagem. */
    characters: Character[];
}

/**
 * Uma lista de personagens mais usados: o rosto, o nome, uma barra com a
 * fração dos times em que ele entrou e a contagem. Do mais para o menos usado.
 */
export function UsageList({ title, note, emptyText, ranking, characters }: UsageListProps) {
    const { t } = useTranslation();
    const top = ranking.characters.slice(0, TOP);

    return (
        <section className='bt-panel bt-usage'>
            <h3 className='bt-subtitle'>{title}</h3>
            <p className='bt-usage__note'>{note}</p>

            {top.length === 0 ? (
                <p className='bt-panel__text'>{emptyText}</p>
            ) : (
                <>
                    <ol className='bt-usage__list'>
                        {top.map((item, index) => {
                            // Um personagem que saiu do catálogo ainda aparece, pelo id.
                            const name = characters.find((character) => character.id === item.characterId)?.name ?? item.characterId;
                            const percent = Math.round(item.share * 100);

                            return (
                                <li key={item.characterId} className='bt-usage__item'>
                                    <span className='bt-usage__place' aria-hidden='true'>
                                        {index + 1}
                                    </span>
                                    <span className='bt-usage__face'>
                                        <CharacterArt characterId={item.characterId} kind='face' className='bt-queue__sprite' />
                                    </span>
                                    <span className='bt-usage__body'>
                                        <span className='bt-usage__row'>
                                            <span className='bt-usage__name'>{name}</span>
                                            <span className='bt-usage__count'>{t('dashboard.usage.count', { count: item.picks, percent })}</span>
                                        </span>
                                        <span className='bt-usage__track' aria-hidden='true'>
                                            <span className='bt-usage__fill' style={{ width: `${percent}%` }} />
                                        </span>
                                    </span>
                                </li>
                            );
                        })}
                    </ol>
                    <p className='bt-usage__total'>{t('dashboard.usage.teams', { count: ranking.teams })}</p>
                </>
            )}
        </section>
    );
}
