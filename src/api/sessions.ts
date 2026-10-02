import { api } from './client';
import type { Session } from '@/types';

export async function getMySessions(): Promise<Session[]> {
    const { data } = await api.get<Session[]>('/sessions/me');
    return data;
}

export async function logoutSession(sessionId: string): Promise<void> {
    await api.delete(`/sessions/me/${sessionId}`);
}