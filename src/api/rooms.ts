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

export async function getRoom(code: string): Promise<RoomView> {
    const { data } = await api.get<RoomView>(`/rooms/${code}`);
    return data;
}

/** Entra na sala. Quem já está nela só recebe a sala de volta. */
export async function joinRoom(code: string): Promise<RoomView> {
    const { data } = await api.post<RoomView>(`/rooms/${code}/join`);
    return data;
}

/** Confirma o time e avisa que está pronto. Se o outro já estava, a batalha começa. */
export async function readyInRoom(code: string, team: string[]): Promise<RoomView> {
    const { data } = await api.post<RoomView>(`/rooms/${code}/ready`, { team });
    return data;
}

/** Volta atrás para trocar o time. */
export async function unreadyInRoom(code: string): Promise<RoomView> {
    const { data } = await api.post<RoomView>(`/rooms/${code}/unready`);
    return data;
}

export async function leaveRoom(code: string): Promise<void> {
    await api.post(`/rooms/${code}/leave`);
}
