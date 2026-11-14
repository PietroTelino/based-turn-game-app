import { api } from './client';
import type { AiDifficulty, BattleActionInput, BattleResponse, BattleSummary, BattleView, CampaignStage, Character, ReplayResponse, TowerView } from '@/types/battle';

export async function getCharacters(): Promise<Character[]> {
    const { data } = await api.get<Character[]>('/battles/characters');
    return data;
}

export async function listBattles(): Promise<BattleSummary[]> {
    const { data } = await api.get<BattleSummary[]>('/battles');
    return data;
}

/** As fases da campanha, com o que o jogador já abriu e venceu. */
export async function getCampaign(): Promise<CampaignStage[]> {
    const { data } = await api.get<CampaignStage[]>('/battles/campaign');
    return data;
}

/** O que dá para pedir ao criar uma batalha contra a IA, além do time. */
export interface CreateBattleOptions {
    /** O time da IA. Sem ele, é sorteado (numa fase da campanha, é o da fase). */
    enemyTeam?: string[];
    /** A batalha de treino do tutorial: sempre a mesma, e a IA joga fraco de propósito. */
    training?: boolean;
    /** O nível da IA. Sem ele, normal. */
    difficulty?: AiDifficulty;
    /** Uma fase da campanha: o time inimigo e o cenário são os dela. */
    campaignStage?: number;
    /** Um andar da torre (o próximo do jogador): time, nível e cenário são os do andar. */
    towerFloor?: number;
}

/** A torre: até onde o jogador chegou e o próximo andar. */
export async function getTower(): Promise<TowerView> {
    const { data } = await api.get<TowerView>('/battles/tower');
    return data;
}

/** Assistir à batalha de um amigo: a batalha (do lado A) e o que aconteceu depois dos `after` primeiros eventos. */
export async function watchBattle(id: string, after: number): Promise<BattleResponse> {
    const { data } = await api.get<BattleResponse>(`/battles/${id}/watch`, { params: { after } });
    return data;
}

/** Cria uma batalha contra a IA. */
export async function createBattle(team: string[], options: CreateBattleOptions = {}): Promise<BattleResponse> {
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

/** Uma batalha encerrada, do começo ao fim, para assistir de novo. */
export async function getBattleReplay(id: string): Promise<ReplayResponse> {
    const { data } = await api.get<ReplayResponse>(`/battles/${id}/replay`);
    return data;
}
