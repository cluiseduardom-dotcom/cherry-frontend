import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import MobileHeader from './MobileHeader';
import './Layout.css';

const pageTitles = {
  '/':               'Dashboard',
  '/venda':          'Nova Venda',
  '/estoque':        'Estoque',
  '/produtos':       'Produtos',
  '/clientes':       'Clientes',
  '/historico':      'Histórico',
  '/relatorios':     'Relatórios',
  '/contas-pagar':   'Contas a Pagar',
  '/contas-receber': 'Contas a Receber',
  '/configuracoes':  'Configurações',
};

export default function Layout() {
  const location = useLocation();
  const title = pageTitles[location.pathname] ?? 'Cherry';

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="app-main">
        <MobileHeader title={title} />
        <Outlet />
      </main>

      <BottomNav />
    </div>
  );
}
