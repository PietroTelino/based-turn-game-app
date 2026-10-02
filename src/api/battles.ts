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

export async function sendBattleAction(id: string, action: BattleActionInput): Promise<BattleResponse> {
    const { data } = await api.post<BattleResponse>(`/battles/${id}/actions`, action);
    return data;
}

export async function surrenderBattle(id: string): Promise<BattleResponse> {
    const { data } = await api.post<BattleResponse>(`/battles/${id}/surrender`);
    return data;
}
