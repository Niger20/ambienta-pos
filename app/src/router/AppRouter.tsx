import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import MainLayout from '../layout/MainLayout';
import { useAuth } from '../context/AuthContext';

// Pages
import Login from '../pages/Login';
import Products from '../pages/Products';

// Pantalla provisional de inicio: el panel principal se incorpora en la última etapa.
const Inicio = () => {
    const { user } = useAuth();
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem', textAlign: 'center' }}>
            <h2 style={{ fontWeight: 700, fontSize: '1.3rem' }}>Ambienta POS</h2>
            <p style={{ color: 'var(--text-secondary)' }}>
                Sesión iniciada como {user?.nombreusuario ?? 'usuario'}. Los módulos se habilitan en el menú conforme avanza la reconstrucción.
            </p>
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
    const { isAuthenticated, user } = useAuth();
    const rol = user?.rol;
    const isAtLeastEmpleado = rol === 'administrador' || rol === 'empleado';

    const Denied = () => (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
            <div style={{ fontSize: '3rem' }}>🔒</div>
            <h2 style={{ fontWeight: 700, fontSize: '1.3rem' }}>Acceso denegado</h2>
            <p style={{ color: 'var(--text-secondary)' }}>No tienes permisos para acceder a esta sección.</p>
            <a href="/" style={{ color: 'var(--accent-primary)', fontWeight: 600, textDecoration: 'none' }}>Volver al inicio</a>
        </div>
    );

    return (
        <Routes>
            {/* Public Route */}
            <Route
                path="/login"
                element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
            />

            {/* Protected Routes encapsulated in MainLayout */}
            <Route element={<ProtectedRoute />}>
                <Route element={<MainLayout />}>
                    {/* Pantalla provisional de inicio */}
                    <Route path="/" element={<Inicio />} />

                    {/* Empleado + Admin */}
                    <Route path="/products" element={isAtLeastEmpleado ? <Products /> : <Denied />} />
                </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

export default AppRouter;
