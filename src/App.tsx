import { Routes, Route, Navigate } from 'react-router-dom';
import { PrivateRoute } from '@/components/PrivateRoute';
import { RoleRoute } from '@/components/RoleRoute';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { UsersPage } from '@/pages/UsersPage';
import { AuditPage } from '@/pages/AuditPage';
import { SessionsPage } from '@/pages/SessionsPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { PublicRoute } from './components/PublicRoute';
import { ForbiddenPage } from './pages/ForbiddenPage';
import { NotFoundPage } from './pages/NotFoundPage';

export default function App() {
    return (
        <Routes>
            {/* Rotas públicas — redireciona para dashboard se já estiver logado */}
            <Route element={<PublicRoute />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} /> 
            </Route>

            {/* Rotas privadas — exigem login */}
            <Route element={<PrivateRoute />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/sessions" element={<SessionsPage />} />
                <Route path="/profile" element={<ProfilePage />} />

                {/* Rotas restritas — exigem administrator ou god */}
                <Route element={<RoleRoute allowedRoles={['administrator', 'god']}/>}>
                    <Route path="/users" element={<UsersPage />} />
                    <Route path="/audit" element={<AuditPage />} />
                </Route>
            </Route>

            {/* Páginas de erro */}
            <Route path="/403" element={<ForbiddenPage />} />
            <Route path="/404" element={<NotFoundPage />} />

            {/* Qualquer rota desconhecida vai para o 404 */}
            <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
    );
}