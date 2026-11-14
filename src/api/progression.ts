import { api } from './client';

export type Currency = 'gold' | 'diamonds';

export interface AchievementReward {
    gold?: number;
    diamonds?: number;
    character?: string;
}

export interface Achievement {
    id: string;
    metric: 'wins' | 'played' | 'winsHard' | 'campaign' | 'campaignHard' | 'pvpWins' | 'rankedWins' | 'characterWins';
    characterId: string | null;
    goal: number;
    progress: number;
    completed: boolean;
    completedAt: string | null;
    reward: AchievementReward;
}

export interface ShopItem {
    characterId: string;
    gold: number;
    diamonds: number;
    owned: boolean;
    achievementId: string | null;
}

export interface Mission {
    id: string;
    metric: 'play' | 'win' | 'winRole' | 'winHard' | 'winCampaign' | 'winTower' | 'playVersus' | 'winVersus' | 'playRanked';
    /** Nas missões de categoria: qual (mage, support...). */
    role: string | null;
    goal: number;
    progress: number;
    reward: { gold: number; diamonds: number };
    claimed: boolean;
}

export interface Stars {
    total: number;
    max: number;
    /** Estrelas de cada fase, pelo número da fase. */
    byStage: Record<string, number>;
    chests: { at: number; gold: number; diamonds: number; claimed: boolean }[];
}

/** Saldo, personagens do jogador, conquistas, missões, estrelas e a loja. */
export interface Progression {
    gold: number;
    diamonds: number;
    starters: string[];
    owned: string[];
    achievements: Achievement[];
    shop: ShopItem[];
    missions: { daily: Mission[]; weekly: Mission[]; dailyResetsAt: string; weeklyResetsAt: string };
    stars: Stars;
}

/** O que dá para resgatar: uma missão do dia ou da semana, ou um baú de estrelas. */
export type ClaimTarget = { type: 'daily' | 'weekly'; id: string } | { type: 'chest'; at: number };

export async function claimReward(target: ClaimTarget): Promise<Progression> {
    const { data } = await api.post<Progression>('/progression/claim', target);
    return data;
}

export interface BattleReward {
    gold: number;
    achievements: string[];
}

export async function getProgression(): Promise<Progression> {
    const { data } = await api.get<Progression>('/progression');
    return data;
}

export async function buyCharacter(characterId: string, currency: Currency): Promise<Progression> {
    const { data } = await api.post<Progression>('/progression/shop', { characterId, currency });
    return data;
}

export async function getBattleReward(battleId: string): Promise<BattleReward> {
    const { data } = await api.get<BattleReward>(`/progression/battles/${battleId}`);
    return data;
}

/** Administrador: dá (ou tira, com número negativo) ouro e diamantes de um jogador. */
export async function grantResources(userId: string, gold: number, diamonds: number): Promise<void> {
    await api.post(`/progression/users/${userId}/grant`, { gold, diamonds });
}
