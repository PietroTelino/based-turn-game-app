import React, { createContext, useContext, useEffect, useState } from 'react';
import { login as loginRequest, logout as logoutRequest } from '@/api/auth';
import { clearProgression } from '@/hooks/useProgression';
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

/**
 * O jogo tem uma aparência só, a escura (a mesma da seleção de personagens):
 * a preferência de tema que a conta guardou não muda mais a tela. A função
 * continua aqui para quem ainda a chama.
 */
function applyTheme(_theme: 'light' | 'dark') {
    document.documentElement.classList.add('dark');
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
        clearProgression();
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