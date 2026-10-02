export interface User {
    id: string;
    name: string;
    email: string;
    role: 'user' | 'administrator' | 'god';
    preferences: { theme?: 'light' | 'dark' } | null;
    inactivatedAt: string | null;
    deletedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface AuthResponse {
    user: User;
    accessToken: string;
    refreshToken: string;
}

export interface Session {
    id: string;
    createdAt: string;
    expiresAt: string;
    userAgent: string | null;
    ipAddress: string | null;
}

export interface AuditLog {
    id: string;
    userId: string | null;
    performedById: string | null;
    action: string;
    entity: string;
    entityId: string | null;
    details: Record<string, unknown> | null;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: string;
    user: Pick<User, 'id' | 'name' | 'email' | 'role'> | null;
    performedBy: Pick<User, 'id' | 'name' | 'email' | 'role'> | null;
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        total: number,
        limit: number,
        offset: number,
    };
}