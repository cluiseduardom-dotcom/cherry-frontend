import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import MobileHeader from './MobileHeader';
import { useTheme } from '../theme/themeContext';
import { useAuth } from '../context/AuthContext';
import { NotificacoesProvider } from '../context/NotificacoesContext';
import './Layout.css';

const pageTitles = {
  '/': 'Dashboard',
  '/venda': 'Nova Venda',
  '/estoque': 'Estoque',
  '/produtos': 'Produtos',
  '/clientes': 'Clientes',
  '/fornecedores': 'Fornecedores',
  '/compras': 'Compras',
  '/historico': 'Histórico',
  '/relatorios': 'Relatórios',
  '/contas-pagar': 'Contas a Pagar',
  '/contas-receber': 'Contas a Receber',
  '/ponto-equilibrio': 'Ponto de Equilíbrio',
  '/despesas-fixas': 'Despesas Fixas',
  '/configuracoes': 'Configurações',
  '/avisos': 'Avisos',
};

export default function Layout() {
  const location = useLocation();
  const { marca } = useTheme();
  const { user } = useAuth();
  const title = pageTitles[location.pathname] ?? marca.nome;

  return (
    <NotificacoesProvider key={user?.id ?? 'anonimo'}>
      <div className="app-layout">
        <Sidebar />
        <main className="app-main">
          <MobileHeader title={title} />
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </NotificacoesProvider>
  );
}
