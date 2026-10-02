import React, { createContext, useContext, useEffect, useState } from 'react';
import { login as loginRequest, logout as logoutRequest } from '@/api/auth';
import type { User } from '@/types';

interface AuthContextData {
    user: User | null;
    accessToken: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    applyTheme: (theme: 'light' | 'dark') => void;
    updateUser: (updated: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextData | null>(null);

function applyTheme(theme: 'light' | 'dark') {
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const storedToken = localStorage.getItem('accessToken');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
            const parsedUser: User = JSON.parse(storedUser);
            setAccessToken(storedToken);
            setUser(JSON.parse(storedUser));

            const theme = parsedUser.preferences?.theme ?? 'light';
            applyTheme(theme);
        }

        setIsLoading(false);
    }, []);

    async function login(email: string, password: string) {
        const data = await loginRequest(email, password);

        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.user));

        setAccessToken(data.accessToken);
        setUser(data.user);

        const theme = data.user.preferences?.theme ?? 'light';
        applyTheme(theme);
    }

    async function logout() {
        const refreshToken = localStorage.getItem('refreshToken');

        if (refreshToken) {
            try {
                await logoutRequest(refreshToken);
            } catch {
                console.warn('Erro ao notificar API no logout');
            }
        }

        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');

        setAccessToken(null);
        setUser(null);

        applyTheme('light');
    }

    async function updateUser(updated: Partial<User>) {
        setUser((prev) => {
            if (!prev) return prev;
            const newUser = { ...prev, ...updated };
            localStorage.setItem('user', JSON.stringify(newUser));
            return newUser;
        })
    }
    
    return (
        <AuthContext.Provider
            value={{
                user,
                accessToken,
                isAuthenticated: !!user,
                isLoading,
                login,
                logout,
                applyTheme,
                updateUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth deve ser usado dentro de um AuthProvider');
    }

    return context;
}