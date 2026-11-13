import { lazy } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './theme/ThemeProvider';
import ProtectedRoute from './components/ProtectedRoute';
import { homeRouteForRole, ALLOWED_ROLES_BY_PATH } from './config/access';
import Layout from './components/Layout';
import TelaSobDemanda from './components/TelaSobDemanda';
import Login from './pages/Login';
import LoginMarca from './pages/LoginMarca';
import PagamentoRecebido from './pages/PagamentoRecebido';
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Venda = lazy(() => import('./pages/Venda'));
const Estoque = lazy(() => import('./pages/Estoque'));
const Transferencias = lazy(() => import('./pages/Transferencias'));
const MinhaMaleta = lazy(() => import('./pages/MinhaMaleta'));
const AcertoEstoque = lazy(() => import('./pages/AcertoEstoque'));
const Consumo = lazy(() => import('./pages/Consumo'));
const Insumos = lazy(() => import('./pages/Insumos'));
const EstoqueInsumos = lazy(() => import('./pages/EstoqueInsumos'));
const AlterarSenha = lazy(() => import('./pages/AlterarSenha'));
const MinhaConta = lazy(() => import('./pages/MinhaConta'));
const DadosEmpresa = lazy(() => import('./pages/DadosEmpresa'));
const Produtos = lazy(() => import('./pages/Produtos'));
const PrecificacaoProduto = lazy(() => import('./pages/PrecificacaoProduto'));
const Clientes = lazy(() => import('./pages/Clientes'));
const Fornecedores = lazy(() => import('./pages/Fornecedores'));
const Compras = lazy(() => import('./pages/Compras'));
const CompraDetalhe = lazy(() => import('./pages/CompraDetalhe'));
const Recebimentos = lazy(() => import('./pages/Recebimentos'));
const RecebimentoDetalhe = lazy(() => import('./pages/RecebimentoDetalhe'));
const Historico = lazy(() => import('./pages/Historico'));
const Comissoes = lazy(() => import('./pages/Comissoes'));
const Usuarios = lazy(() => import('./pages/Usuarios'));
const Mais = lazy(() => import('./pages/Mais'));
const Avisos = lazy(() => import('./pages/Avisos'));
const Relatorios = lazy(() => import('./pages/Relatorios'));
const Configuracoes = lazy(() => import('./pages/Configuracoes'));
const Bancos = lazy(() => import('./pages/Bancos'));
const PixADevolver = lazy(() => import('./pages/PixADevolver'));
const PedidosLoja = lazy(() => import('./pages/PedidosLoja'));
const LojaProdutos = lazy(() => import('./pages/LojaProdutos'));
const LojaRetratos = lazy(() => import('./pages/LojaRetratos'));
const LojaInstitucional = lazy(() => import('./pages/LojaInstitucional'));
const LojaBanners = lazy(() => import('./pages/LojaBanners'));
const IndicadoresInsumosPage = lazy(() => import('./pages/IndicadoresInsumosPage'));
const DashboardCalculos = lazy(() => import('./pages/DashboardCalculos'));
const ContasPagar = lazy(() => import('./pages/ContasPagar'));
const ContasReceber = lazy(() => import('./pages/ContasReceber'));
const PontoEquilibrio = lazy(() => import('./pages/PontoEquilibrio'));
const DespesasFixas = lazy(() => import('./pages/DespesasFixas'));
const CategoriasProduto = lazy(() => import('./pages/CategoriasProduto'));
const ConfiguracaoSku = lazy(() => import('./pages/ConfiguracaoSku'));

const ROUTE_COMPONENTS = {
  '/': Dashboard,
  '/dashboard/calculos': DashboardCalculos,
  '/venda': Venda,
  '/estoque': Estoque,
  '/transferencias': Transferencias,
  '/acerto-estoque': AcertoEstoque,
  '/consumo': Consumo,
  '/insumos': Insumos,
  '/estoque-insumos': EstoqueInsumos,
  '/indicadores-insumos': IndicadoresInsumosPage,
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
  '/conta/seguranca': AlterarSenha,
  '/conta/perfil': MinhaConta,
  '/relatorios': Relatorios,
  '/bancos': Bancos,
  '/pix-a-devolver': PixADevolver,
  '/pedidos-loja': PedidosLoja,
  '/loja-online': LojaProdutos,
  '/loja-retratos': LojaRetratos,
  '/loja-institucional': LojaInstitucional,
  '/loja-banners': LojaBanners,
  '/contas-pagar': ContasPagar,
  '/contas-receber': ContasReceber,
  '/ponto-equilibrio': PontoEquilibrio,
  '/despesas-fixas': DespesasFixas,
  '/configuracoes': Configuracoes,
  '/configuracoes/categorias': CategoriasProduto,
  '/configuracoes/sku': ConfiguracaoSku,
  '/configuracoes/empresa': DadosEmpresa,
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
  // Login com a marca do cliente (identidade visual vinda do backend pelo endereço).
  { path: '/c/:slug', element: <LoginMarca /> },
  // Pública (cliente final volta do Mercado Pago): sem login, sem API.
  { path: '/pagamento-recebido', element: <PagamentoRecebido /> },
  {
    element: <ProtectedRoute><Layout /></ProtectedRoute>,
    children: registeredPaths.map(path => {
      const Component = ROUTE_COMPONENTS[path];
      return {
        path,
        element: (
          <ProtectedRoute allowedRoles={ALLOWED_ROLES_BY_PATH[path]} path={path}>
            <TelaSobDemanda><Component /></TelaSobDemanda>
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
