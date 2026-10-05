import { api } from './client';
import type { QueueView, RankedProfile } from '@/types/ranked';

/** Os pontos, o rank e a situação na fila de quem está logado. */
export async function getRankedProfile(): Promise<RankedProfile> {
    const { data } = await api.get<RankedProfile>('/ranked');
    return data;
}

/** Entra na fila com o time escolhido. Se já houver alguém esperando, a resposta já traz a partida. */
export async function enterRankedQueue(team: string[]): Promise<QueueView> {
    const { data } = await api.post<QueueView>('/ranked/queue', { team });
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
