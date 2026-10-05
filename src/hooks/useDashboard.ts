import { useEffect, useState } from 'react';
import { getCharacters } from '@/api/battles';
import { getRankedProfile } from '@/api/ranked';
import { getCharacterStats } from '@/api/stats';
import type { Character } from '@/types/battle';
import type { CharacterStats, RankedProfile } from '@/types/ranked';

/**
 * O que o painel inicial mostra do jogo: o rank do jogador e os personagens
 * mais usados (os dele e os do jogo todo). Os personagens do catálogo vêm
 * junto só para dar nome e rosto a cada linha das listas.
 */
export function useDashboard() {
    const [profile, setProfile] = useState<RankedProfile | null>(null);
    const [stats, setStats] = useState<CharacterStats | null>(null);
    const [characters, setCharacters] = useState<Character[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        let cancelled = false;

        Promise.all([getRankedProfile(), getCharacterStats(), getCharacters()])
            .then(([loadedProfile, loadedStats, loadedCharacters]) => {
                if (cancelled) return;

                setProfile(loadedProfile);
                setStats(loadedStats);
                setCharacters(loadedCharacters);
            })
            .catch(() => {
                if (!cancelled) setHasError(true);
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    return { profile, stats, characters, isLoading, hasError };
}
