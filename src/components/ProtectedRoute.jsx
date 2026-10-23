import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { homeRouteForRole, canAccessRoute, podeComCapacidade } from '../config/access';

// A decisão de acesso mora em access.js (perfil legado OU capacidade). Quem tem a capacidade
// `administrador` (cargo Admin ou concedida) passa em tudo. Isto só decide o que o front
// mostra: a fronteira de segurança continua sendo o backend.
export default function ProtectedRoute({ children, allowedRoles, path }) {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="page-content">
        <div className="empty-state">
          <p className="text-sm text-secondary">Carregando sessão...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (podeComCapacidade(user, 'administrador')) {
    return children;
  }

  const permitido = path
    ? canAccessRoute(path, user)
    : !allowedRoles || allowedRoles.includes(user.role);

  if (!permitido) {
    return <Navigate to={homeRouteForRole(user.role)} replace />;
  }

  return children;
}
