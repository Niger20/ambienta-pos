import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { useAuth } from '../context/AuthContext';

// Pages
import Login from '../pages/Login';

// Pantalla provisional de inicio: el panel principal se incorpora en la última etapa.
const Inicio = () => {
    const { user, logout } = useAuth();
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem', textAlign: 'center' }}>
            <h2 style={{ fontWeight: 700, fontSize: '1.3rem' }}>Ambienta POS</h2>
            <p style={{ color: 'var(--text-secondary)' }}>
                Sesión iniciada como {user?.nombreusuario ?? 'usuario'}. Los módulos se habilitan en el menú conforme avanza la reconstrucción.
            </p>
            <button type="button" onClick={logout}>Cerrar sesión</button>
        </div>
    );
};

/**
 * Role-based access:
 *   administrador → ALL routes
 *   empleado      → all except /usuarios
 *   invitado      → /dashboard and /pos only
 */
const AppRouter = () => {
    const { isAuthenticated } = useAuth();

    return (
        <Routes>
            {/* Public Route */}
            <Route
                path="/login"
                element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
            />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
                {/* Pantalla provisional de inicio */}
                <Route path="/" element={<Inicio />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

export default AppRouter;
