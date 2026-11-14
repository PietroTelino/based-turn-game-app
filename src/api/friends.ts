import { api } from './client';

export interface PlayerRef {
    id: string;
    name: string;
}

export interface RoomInvite {
    id: string;
    roomCode: string;
    from: PlayerRef;
    createdAt: string;
}

/** Amigos (com a batalha em que cada um está, para assistir), pedidos e convites. */
export interface FriendsView {
    friends: (PlayerRef & { battleId: string | null })[];
    incoming: { requestId: string; user: PlayerRef }[];
    outgoing: { requestId: string; user: PlayerRef }[];
    invites: RoomInvite[];
}

export type SearchResult = PlayerRef & { status: 'none' | 'friend' | 'incoming' | 'outgoing' };

export async function getFriends(): Promise<FriendsView> {
    const { data } = await api.get<FriendsView>('/friends');
    return data;
}

export async function searchPlayers(query: string): Promise<SearchResult[]> {
    const { data } = await api.get<SearchResult[]>('/friends/search', { params: { q: query } });
    return data;
}

/** Manda o pedido de amizade (se o outro já tinha pedido, vocês viram amigos). */
export async function requestFriend(userId: string): Promise<FriendsView> {
    const { data } = await api.post<FriendsView>('/friends', { userId });
    return data;
}

export async function acceptFriend(requestId: string): Promise<FriendsView> {
    const { data } = await api.post<FriendsView>(`/friends/${requestId}/accept`);
    return data;
}

/** Desfaz a amizade, recusa o pedido recebido ou cancela o mandado. */
export async function removeFriend(userId: string): Promise<FriendsView> {
    const { data } = await api.delete<FriendsView>(`/friends/${userId}`);
    return data;
}

/** Os convites para sala que você recebeu (a consulta que a tela repete). */
export async function getInvites(): Promise<RoomInvite[]> {
    const { data } = await api.get<RoomInvite[]>('/friends/invites');
    return data;
}

export async function inviteToRoom(code: string, userId: string): Promise<void> {
    await api.post('/friends/invites', { code, userId });
}

export async function dismissInvite(id: string): Promise<void> {
    await api.delete(`/friends/invites/${id}`);
}
