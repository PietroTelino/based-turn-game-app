import { api } from './client';

/** Se o jogador já terminou o tutorial. Enquanto não terminou, as outras partidas ficam travadas. */
export interface TutorialStatus {
    completed: boolean;
    completedAt: string | null;
}

export async function getTutorialStatus(): Promise<TutorialStatus> {
    const { data } = await api.get<TutorialStatus>('/tutorial');
    return data;
}
