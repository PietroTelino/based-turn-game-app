import { api } from './client';
import type { User, PaginatedResponse } from '@/types';

export async function getUsers(): Promise<User[]> {
    const { data } = await api.get<User[]>('/users');
    return data;
}

export async function getDeletedUsers(): Promise<User[]> {
    const { data } = await api.get<User[]>('/users/deleted-users');
    return data;
}

export async function getUserById(id:string): Promise<User> {
    const { data } = await api.get<User>(`/users/${id}`);
    return data;
}

export async function registerUser(payload: {
    name: string,
    email: string,
    password: string
}): Promise<Pick<User, 'id' | 'email' | 'createdAt'>> {
    const { data } = await api.post('/users', payload);
    return data;
}

export async function createUser(payload: {
    name: string
    email: string
    password: string
    role?: string
}): Promise<User> {
    const { data } = await api.post<User>('/users/create', payload);
    return data;
}

export async function updateUser(
    id: string,
    payload: { name?: string; email?: string }
): Promise<User> {
    const { data } = await api.put<User>(`/users/${id}`, payload);
    return data;
}

export async function changeMyPassword(payload: {
    currentPassword: string
    newPassword: string
}): Promise<void> {
    await api.patch('/users/me/password', payload);
}

export async function updateMyPreferences(theme: 'light' | 'dark'): Promise<void> {
    await api.patch('/users/me/preferences', { theme });
}

export async function selfDelete(password: string): Promise<void> {
    await api.delete('/users/me/delete', { data: { password } });
}

export async function deleteUser(id: string): Promise<void> {
    await api.delete(`/users/${id}`);
}

export async function restoreUser(id: string): Promise<void> {
    await api.patch(`/users/${id}/restore`);
}

export async function hardDeleteUser(id: string): Promise<void> {
    await api.delete(`/users/${id}/hard`);
}

export async function inactivateUser(id: string): Promise<void> {
    await api.patch(`/users/${id}/inactivate`);
}

export async function reactivateUser(id: string): Promise<void> {
    await api.patch(`/users/${id}/reactivate`);
}


export async function adminResetPassword(id: string): Promise<void> {
    await api.post(`/users/${id}/reset-password`);
}

export async function forgotPassword(email: string): Promise<void> {
    await api.post('/password-reset/request', { email });
}

export async function resetPassword(token: string, password: string): Promise<void> {
    await api.post('/password-reset/confirm', { token, password });
}