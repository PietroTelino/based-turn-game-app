import { api } from './client';
import type { DraftView, Leaderboard, QueueView, RankedProfile } from '@/types/ranked';

/** O placar de líderes da temporada. */
export async function getLeaderboard(): Promise<Leaderboard> {
    const { data } = await api.get<Leaderboard>('/ranked/leaderboard');
    return data;
}

/** Os pontos, o rank e a situação na fila de quem está logado. */
export async function getRankedProfile(): Promise<RankedProfile> {
    const { data } = await api.get<RankedProfile>('/ranked');
    return data;
}

/** Entra na fila. O time é montado depois, na seleção de personagens, à vista do adversário. */
export async function enterRankedQueue(): Promise<QueueView> {
    const { data } = await api.post<QueueView>('/ranked/queue');
    return data;
}

/** Como está a fila. É a consulta que a tela repete enquanto procura: é ela que mantém o jogador na fila. */
export async function getRankedQueue(): Promise<QueueView> {
    const { data } = await api.get<QueueView>('/ranked/queue');
    return data;
}

export async function leaveRankedQueue(): Promise<QueueView> {
    const { data } = await api.delete<QueueView>('/ranked/queue');
    return data;
}

/** A seleção de personagens em que você está. É a consulta que a tela repete durante a seleção. */
export async function getRankedDraft(): Promise<DraftView> {
    const { data } = await api.get<DraftView>('/ranked/draft');
    return data;
}

/** Bane ou escolhe um personagem no passo da vez (que precisa ser seu). */
export async function sendDraftChoice(characterId: string): Promise<DraftView> {
    const { data } = await api.post<DraftView>('/ranked/draft', { characterId });
    return data;
}
