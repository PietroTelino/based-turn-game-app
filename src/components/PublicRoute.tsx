import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export function PublicRoute() {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) return null;

    if (isAuthenticated) {
        return <Navigate to='/dashboard' replace />
    }

    return <Outlet />
}