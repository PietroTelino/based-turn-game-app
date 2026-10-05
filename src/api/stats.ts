import { api } from './client';
import type { CharacterStats } from '@/types/ranked';

/** Os personagens mais usados: por quem está logado e no jogo todo. */
export async function getCharacterStats(): Promise<CharacterStats> {
    const { data } = await api.get<CharacterStats>('/stats/characters');
    return data;
}
