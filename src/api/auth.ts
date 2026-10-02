import { api } from './client';
import type { AuthResponse } from '@/types';

export async function login(email: string, password: string): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
    return data;
}

export async function logout(refreshToken: string): Promise<void> {
    await api.post('/auth/logout', { refreshToken });
}

export async function logoutAll(): Promise<void> {
    await api.post('/auth/logout-all');
}