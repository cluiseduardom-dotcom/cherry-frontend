import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './theme/ThemeProvider';
import ProtectedRoute from './components/ProtectedRoute';
import { homeRouteForRole, ALLOWED_ROLES_BY_PATH } from './config/access';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Venda from './pages/Venda';
import Estoque from './pages/Estoque';
import Produtos from './pages/Produtos';
import PrecificacaoProduto from './pages/PrecificacaoProduto';
import Clientes from './pages/Clientes';
import Fornecedores from './pages/Fornecedores';
import Compras from './pages/Compras';
import CompraDetalhe from './pages/CompraDetalhe';
import Recebimentos from './pages/Recebimentos';
import RecebimentoDetalhe from './pages/RecebimentoDetalhe';
import Historico from './pages/Historico';
import Mais from './pages/Mais';
import Relatorios from './pages/Relatorios';
import Configuracoes from './pages/Configuracoes';
import ContasPagar from './pages/ContasPagar';
import ContasReceber from './pages/ContasReceber';
import PontoEquilibrio from './pages/PontoEquilibrio';
import DespesasFixas from './pages/DespesasFixas';
import CategoriasProduto from './pages/CategoriasProduto';
import ConfiguracaoSku from './pages/ConfiguracaoSku';

const ROUTE_COMPONENTS = {
  '/': Dashboard,
  '/venda': Venda,
  '/estoque': Estoque,
  '/produtos': Produtos,
  '/produtos/:id/precos': PrecificacaoProduto,
  '/clientes': Clientes,
  '/fornecedores': Fornecedores,
  '/compras': Compras,
  '/compras/:id': CompraDetalhe,
  '/compras/recebimentos': Recebimentos,
  '/compras/recebimentos/:id': RecebimentoDetalhe,
  '/historico': Historico,
  '/mais': Mais,
  '/relatorios': Relatorios,
  '/contas-pagar': ContasPagar,
  '/contas-receber': ContasReceber,
  '/ponto-equilibrio': PontoEquilibrio,
  '/despesas-fixas': DespesasFixas,
  '/configuracoes': Configuracoes,
  '/configuracoes/categorias': CategoriasProduto,
  '/configuracoes/sku': ConfiguracaoSku,
};

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

// UX-06 mantém o ToastProvider acima do roteador. ThemeProvider fica dentro
// do AuthProvider para reagir ao tema devolvido pelo backend após o login.
export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <ThemeProvider>
          <RouterProvider router={createBrowserRouter([
            { path: '/login', element: <Login /> },
            {
              element: <ProtectedRoute><Layout /></ProtectedRoute>,
              children: registeredPaths.map(path => {
                const Component = ROUTE_COMPONENTS[path];
                return {
                  path,
                  element: (
                    <ProtectedRoute allowedRoles={ALLOWED_ROLES_BY_PATH[path]}>
                      <Component />
                    </ProtectedRoute>
                  ),
                };
              }),
            },
            { path: '*', element: <Fallback /> },
          ])} />
        </ThemeProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
