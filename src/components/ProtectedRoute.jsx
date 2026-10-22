import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { homeRouteForRole, canAccessRoute, podeComCapacidade } from '../config/access';

export default function ProtectedRoute({
  children,
  allowedRoles,
  requiredCapability,
  requiredCapabilities,
  path,
}) {
  const { isAuthenticated, user, loading, temCapacidade } = useAuth();
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

  const role = user.role || user.perfil;
  const rotaDestino = homeRouteForRole(role);

  // Admin efetivo sempre tem acesso
  const isAdmin =
    role === 'admin' ||
    user.perfil === 'admin' ||
    (temCapacidade && temCapacidade('administrador')) ||
    podeComCapacidade(user, 'administrador');

  if (isAdmin) {
    return children;
  }

  // Regra por capacidades explícitas passadas na prop
  const capsRequeridas = requiredCapabilities || (requiredCapability ? [requiredCapability] : null);
  if (capsRequeridas && capsRequeridas.length > 0) {
    const temPermissao = capsRequeridas.some(cap =>
      temCapacidade ? temCapacidade(cap) : podeComCapacidade(user, cap)
    );
    if (!temPermissao) {
      return <Navigate to={rotaDestino} replace />;
    }
  }

  // Regra por path explícito
  if (path && !canAccessRoute(path, user)) {
    return <Navigate to={rotaDestino} replace />;
  }

  // Regra por allowedRoles legado
  if (allowedRoles && !allowedRoles.includes(role)) {
    const rotaAtual = path || location.pathname;
    const isGerenteHistorico = rotaAtual === '/historico' && user.cargo === 'gerente';
    const isPermitidoPorCapacidade = canAccessRoute(rotaAtual, user);

    if (!isGerenteHistorico && !isPermitidoPorCapacidade) {
      return <Navigate to={rotaDestino} replace />;
    }
  }

  return children;
}
