import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { homeRouteForRole, canAccessRoute, podeComCapacidade, rotaForaDoPlano, MENSAGEM_SEM_FUNCIONALIDADE } from '../config/access';

const ROTA_TROCA_SENHA = '/conta/seguranca';

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

  // Senha temporária (definida por um admin): só a tela de troca de senha está liberada. O invólucro
  // do Layout não tem `path`: sem a checagem de `path` o redirecionamento entraria em laço.
  if (user.senha_temporaria && path && path !== ROTA_TROCA_SENHA) {
    return <Navigate to={ROTA_TROCA_SENHA} replace />;
  }

  // Fora do plano: explica em vez de redirecionar em silêncio (vale até para admin). O backend também barra (403).
  if (path && rotaForaDoPlano(path, user)) {
    return (
      <div className="page-content">
        <div className="empty-state">
          <div className="empty-state-title">Funcionalidade não incluída no seu plano</div>
          <p className="text-sm text-secondary">{MENSAGEM_SEM_FUNCIONALIDADE}</p>
        </div>
      </div>
    );
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
