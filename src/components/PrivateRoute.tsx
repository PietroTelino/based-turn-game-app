import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { startModelPreload, useModelPreload } from '@/battle/preloadModels';
import { ModelLoadingScreen } from './ModelLoadingScreen';

export function PrivateRoute() {
    const { isAuthenticated, isLoading } = useAuth();
    const preload = useModelPreload();

    // Logado: antes de liberar o jogo, todos os personagens 3D são baixados e montados.
    useEffect(() => {
        if (isAuthenticated) startModelPreload();
    }, [isAuthenticated]);

    if (isLoading) {
        return null;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />
    }

    if (preload.status !== 'ready') {
        return <ModelLoadingScreen progress={preload.progress} />
    }

    return <Outlet />
}
