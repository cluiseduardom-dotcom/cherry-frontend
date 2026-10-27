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
import Transferencias from './pages/Transferencias';
import MinhaMaleta from './pages/MinhaMaleta';
import AcertoEstoque from './pages/AcertoEstoque';
import Consumo from './pages/Consumo';
import Produtos from './pages/Produtos';
import PrecificacaoProduto from './pages/PrecificacaoProduto';
import Clientes from './pages/Clientes';
import Fornecedores from './pages/Fornecedores';
import Compras from './pages/Compras';
import CompraDetalhe from './pages/CompraDetalhe';
import Recebimentos from './pages/Recebimentos';
import RecebimentoDetalhe from './pages/RecebimentoDetalhe';
import Historico from './pages/Historico';
import Comissoes from './pages/Comissoes';
import Usuarios from './pages/Usuarios';
import Mais from './pages/Mais';
import Avisos from './pages/Avisos';
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
  '/transferencias': Transferencias,
  '/acerto-estoque': AcertoEstoque,
  '/consumo': Consumo,
  '/minha-maleta': MinhaMaleta,
  '/produtos': Produtos,
  '/produtos/:id/precos': PrecificacaoProduto,
  '/clientes': Clientes,
  '/fornecedores': Fornecedores,
  '/compras': Compras,
  '/compras/:id': CompraDetalhe,
  '/compras/recebimentos': Recebimentos,
  '/compras/recebimentos/:id': RecebimentoDetalhe,
  '/historico': Historico,
  '/comissoes': Comissoes,
  '/usuarios': Usuarios,
  '/mais': Mais,
  '/avisos': Avisos,
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

const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    element: <ProtectedRoute><Layout /></ProtectedRoute>,
    children: registeredPaths.map(path => {
      const Component = ROUTE_COMPONENTS[path];
      return {
        path,
        element: (
          <ProtectedRoute allowedRoles={ALLOWED_ROLES_BY_PATH[path]} path={path}>
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
    <ToastProvider>
      <AuthProvider>
        <ThemeProvider>
          <RouterProvider router={router} />
        </ThemeProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
