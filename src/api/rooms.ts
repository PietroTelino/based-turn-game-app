import { api } from './client';
import type { OpenRoom, RoomView } from '@/types/room';

/** Salas esperando alguém entrar (a do próprio jogador não aparece). */
export async function listOpenRooms(): Promise<OpenRoom[]> {
    const { data } = await api.get<OpenRoom[]>('/rooms');
    return data;
}

export async function createRoom(): Promise<RoomView> {
    const { data } = await api.post<RoomView>('/rooms');
    return data;
}

/** A sala, com a seleção de personagens em dia. */
export async function getRoom(code: string): Promise<RoomView> {
    const { data } = await api.get<RoomView>(`/rooms/${code}`);
    return data;
}

/** Entra na sala. Quem já está nela só recebe a sala de volta. */
export async function joinRoom(code: string): Promise<RoomView> {
    const { data } = await api.post<RoomView>(`/rooms/${code}/join`);
    return data;
}

/** Bane ou escolhe `characterId` no passo da vez da seleção da sala. */
export async function sendRoomDraftChoice(code: string, characterId: string): Promise<RoomView> {
    const { data } = await api.post<RoomView>(`/rooms/${code}/draft`, { characterId });
    return data;
}

export async function leaveRoom(code: string): Promise<void> {
    await api.post(`/rooms/${code}/leave`);
}
