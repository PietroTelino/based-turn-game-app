import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { User } from '@/types';

interface RoleRouteProps {
    allowedRoles: User['role'][];
}

export function RoleRoute({ allowedRoles }: RoleRouteProps) {
    const { user, isLoading } = useAuth();

    if (isLoading) return null;

    if (!user || !allowedRoles.includes(user.role)) {
        return <Navigate to="/403" replace />;
    }

    return <Outlet />
}