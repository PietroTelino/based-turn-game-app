import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getCharacters } from '@/api/battles';
import { CharacterCard } from '@/components/battle/CharacterCard';
import type { Character, CharacterRole } from '@/types/battle';

/** Busca o catálogo de personagens quando `enabled` (a página não o tem). */
function useCatalog(enabled: boolean) {
    const [characters, setCharacters] = useState<Character[]>([]);
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(enabled ? 'loading' : 'ready');

    useEffect(() => {
        if (!enabled) return;

        let cancelled = false;

        getCharacters()
            .then((loaded) => {
                if (cancelled) return;
                setCharacters(loaded);
                setStatus('ready');
            })
            .catch(() => {
                if (!cancelled) setStatus('error');
            });

        return () => {
            cancelled = true;
        };
    }, [enabled]);

    return { characters, status };
}

/** A ordem dos filtros de categoria na coleção (só aparecem as que algum personagem tem). */
const ROLE_ORDER: CharacterRole[] = ['tank', 'fighter', 'attacker', 'assassin', 'mage', 'support', 'shapeshifter'];

/** "Súcubo" -> "sucubo": a busca ignora acento e maiúscula. */
function normalize(text: string): string {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/**
 * A coleção: a carta de cada personagem do jogo, só para ler (a frente tem os
 * atributos; o verso, as habilidades). Dá para filtrar por categoria e buscar
 * pelo nome. É a mesma aba em Um Jogador e em Multijogador. `characters`: o
 * catálogo, se a página já o carregou; sem ele, a coleção busca sozinha.
 */
export function Collection({ characters: given }: { characters?: Character[] }) {
    const { t } = useTranslation();
    const catalog = useCatalog(given === undefined);
    const characters = given ?? catalog.characters;
    const [query, setQuery] = useState('');
    const [role, setRole] = useState<CharacterRole | null>(null);
    const roles = useMemo(() => ROLE_ORDER.filter((item) => characters.some((character) => character.role === item)), [characters]);
    const visible = useMemo(() => {
        const search = normalize(query.trim());

        return characters.filter((character) => (!role || character.role === role) && (!search || normalize(character.name).includes(search)));
    }, [characters, query, role]);

    if (given === undefined && catalog.status === 'loading') return <p className='bt-message'>{t('play.loading')}</p>;
    if (given === undefined && catalog.status === 'error') return <p className='bt-message bt-message--error'>{t('play.loadError')}</p>;

    return (
        <div className='bt-collection'>
            <div className='bt-collection__bar'>
                <p className='bt-lead'>{t('singlePlayer.collectionLead', { count: characters.length })}</p>

                <div className='bt-collection__tools'>
                    <div className='bt-collection__filters' role='group' aria-label={t('ranked.draft.filterLabel')}>
                        <button type='button' className='bt-collection__filter' aria-pressed={role === null} onClick={() => setRole(null)}>
                            {t('ranked.draft.allRoles')}
                        </button>
                        {roles.map((item) => (
                            <button key={item} type='button' className='bt-collection__filter' aria-pressed={role === item} onClick={() => setRole(role === item ? null : item)}>
                                {t(`play.roles.${item}`)}
                            </button>
                        ))}
                    </div>

                    <label className='bt-collection__search'>
                        <span className='bt-visually-hidden'>{t('ranked.draft.searchLabel')}</span>
                        <input type='search' value={query} placeholder={t('ranked.draft.searchPlaceholder')} onChange={(event) => setQuery(event.target.value)} />
                    </label>
                </div>
            </div>

            {visible.length === 0 ? (
                <p className='bt-lead'>{t('ranked.draft.noneFound')}</p>
            ) : (
                <div className='bt-roster'>
                    {visible.map((character) => (
                        <CharacterCard key={character.id} character={character} position={-1} isLocked={false} isReadOnly onToggle={() => undefined} />
                    ))}
                </div>
            )}
        </div>
    );
}
