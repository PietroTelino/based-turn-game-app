import { api } from './client';
import type { BattleActionInput, BattleResponse, BattleSummary, BattleView, Character } from '@/types/battle';

export async function getCharacters(): Promise<Character[]> {
    const { data } = await api.get<Character[]>('/battles/characters');
    return data;
}

export async function listBattles(): Promise<BattleSummary[]> {
    const { data } = await api.get<BattleSummary[]>('/battles');
    return data;
}

export async function createBattle(team: string[]): Promise<BattleResponse> {
    const { data } = await api.post<BattleResponse>('/battles', { team });
    return data;
}

export async function getBattle(id: string): Promise<BattleView> {
    const { data } = await api.get<BattleView>(`/battles/${id}`);
    return data;
}

/**
 * O que aconteceu depois dos `after` primeiros eventos da batalha. É assim que,
 * numa batalha entre jogadores, a tela fica sabendo das jogadas do outro.
 */
export async function getBattleEvents(id: string, after: number): Promise<BattleResponse> {
    const { data } = await api.get<BattleResponse>(`/battles/${id}/events`, { params: { after } });
    return data;
}

export async function sendBattleAction(id: string, action: BattleActionInput): Promise<BattleResponse> {
    const { data } = await api.post<BattleResponse>(`/battles/${id}/actions`, action);
    return data;
}

export async function surrenderBattle(id: string): Promise<BattleResponse> {
    const { data } = await api.post<BattleResponse>(`/battles/${id}/surrender`);
    return data;
}
