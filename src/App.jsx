import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
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

// VERTUMNO-UX-FOUNDATION-P0 (UX-02/UX-03): migrado de <BrowserRouter>
// declarativo para createBrowserRouter/RouterProvider — mesmas rotas,
// mesmo RBAC, mesmo comportamento, só troca a API de configuração. É a
// única forma de usar useBlocker (bloqueio de navegação nativo do React
// Router): ele exige um data router, não funciona com <BrowserRouter>.
// Sem isso não dá pra impedir que o usuário saia do PDV/Configurador de
// SKU clicando em outro item do menu com dados não salvos.
const router = createBrowserRouter([
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
]);

export default function App() {
  return (
    // UX-06 (Issue #52): ToastProvider acima do RouterProvider para que os
    // toasts sobrevivam à troca de rota — uma ação que navega logo em
    // seguida (ex.: salvar e voltar para a lista) não deve perder o aviso.
    <ToastProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ToastProvider>
  );
}
