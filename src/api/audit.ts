import { api } from './client';
import type { AuditLog, PaginatedResponse } from '@/types';

interface AuditFilters {
    userId?: string;
    performedById?: string;
    action?: string;
    entity?: string;
    limit?: number;
    offset?: number;
}

export async function getAuditLogs(
    filters?: AuditFilters
): Promise<PaginatedResponse<AuditLog>> {
    const { data } = await api.get<PaginatedResponse<AuditLog>>('/audit', {
        params: filters,
    });
    return data;
}

export async function getMyAuditLogs(
    filters?: Pick<AuditFilters, 'limit' | 'offset'>
): Promise<PaginatedResponse<AuditLog>> {
    const { data } = await api.get<PaginatedResponse<AuditLog>>('/audit/me', {
        params: filters,
    });
    return data;
}

export async function getAuditLogById(id: string): Promise<AuditLog> {
    const { data } = await api.get<AuditLog>(`/audit/${id}`);
    return data;
}