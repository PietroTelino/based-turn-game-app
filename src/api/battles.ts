import { api } from './client';
import type { BattleActionInput, BattleResponse, BattleSummary, BattleView, Character, ReplayResponse } from '@/types/battle';

export async function getCharacters(): Promise<Character[]> {
    const { data } = await api.get<Character[]>('/battles/characters');
    return data;
}

export async function listBattles(): Promise<BattleSummary[]> {
    const { data } = await api.get<BattleSummary[]>('/battles');
    return data;
}

/**
 * Cria uma batalha contra a IA. Sem `enemyTeam` o time inimigo é sorteado.
 * O tutorial informa o time inimigo e pede `training`: a batalha de treino é
 * sempre a mesma e nela a IA joga fraco de propósito.
 */
export async function createBattle(team: string[], options: { enemyTeam?: string[]; training?: boolean } = {}): Promise<BattleResponse> {
    const { data } = await api.post<BattleResponse>('/battles', { team, ...options });
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

/** Partida ranqueada: o adversário passou do prazo sem jogar, e quem espera pede a vitória. */
export async function claimBattleTimeout(id: string): Promise<BattleResponse> {
    const { data } = await api.post<BattleResponse>(`/battles/${id}/timeout`);
    return data;
}

/** Uma batalha encerrada, do começo ao fim, para assistir de novo. */
export async function getBattleReplay(id: string): Promise<ReplayResponse> {
    const { data } = await api.get<ReplayResponse>(`/battles/${id}/replay`);
    return data;
}
