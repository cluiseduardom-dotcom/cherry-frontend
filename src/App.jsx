import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { homeRouteForRole, ALLOWED_ROLES_BY_PATH } from './config/access';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Venda from './pages/Venda';
import Estoque from './pages/Estoque';
import Produtos from './pages/Produtos';
import Clientes from './pages/Clientes';
import Historico from './pages/Historico';
import Relatorios from './pages/Relatorios';
import Configuracoes from './pages/Configuracoes';
import ContasPagar from './pages/ContasPagar';
import ContasReceber from './pages/ContasReceber';
import PontoEquilibrio from './pages/PontoEquilibrio';
import DespesasFixas from './pages/DespesasFixas';

const ROUTE_COMPONENTS = {
  '/': Dashboard,
  '/venda': Venda,
  '/estoque': Estoque,
  '/produtos': Produtos,
  '/clientes': Clientes,
  '/historico': Historico,
  '/relatorios': Relatorios,
  '/contas-pagar': ContasPagar,
  '/contas-receber': ContasReceber,
  '/ponto-equilibrio': PontoEquilibrio,
  '/despesas-fixas': DespesasFixas,
  '/configuracoes': Configuracoes,
};

// access.js e ROUTE_COMPONENTS precisam concordar exatamente. Uma rota
// registrada sem componente mapeado (ou vice-versa) quebra o app no
// carregamento, em vez de silenciosamente não renderizar.
const registeredPaths = Object.keys(ALLOWED_ROLES_BY_PATH);
for (const path of registeredPaths) {
  if (!ROUTE_COMPONENTS[path]) {
    throw new Error(`access.js registra "${path}" mas nenhum componente foi mapeado em App.jsx`);
  }
}
for (const path of Object.keys(ROUTE_COMPONENTS)) {
  if (!ALLOWED_ROLES_BY_PATH[path]) {
    throw new Error(`App.jsx mapeia um componente para "${path}" mas access.js não registra essa rota`);
  }
}

function Fallback() {
  const { isAuthenticated, user } = useAuth();
  return <Navigate to={isAuthenticated ? homeRouteForRole(user.role) : '/login'} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Auth */}
      <Route path="/login" element={<Login />} />

      {/* Main app layout */}
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        {registeredPaths.map(path => {
          const Component = ROUTE_COMPONENTS[path];
          return (
            <Route
              key={path}
              path={path}
              element={
                <ProtectedRoute allowedRoles={ALLOWED_ROLES_BY_PATH[path]}>
                  <Component />
                </ProtectedRoute>
              }
            />
          );
        })}
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Fallback />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
