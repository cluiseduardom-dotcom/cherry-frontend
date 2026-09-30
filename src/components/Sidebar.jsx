import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Tag,
  Users,
  History,
  BarChart2,
  Settings,
  Cherry,
  LogOut,
  Wallet,
  HandCoins,
  Target,
  Receipt,
  Building2,
  AlertTriangle,
  PackageX,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ALLOWED_ROLES_BY_PATH, canAccessRoute } from '../config/access';
import { listarEstoqueBaixo } from '../services/estoque';
import './Sidebar.css';

const ROLE_LABEL = {
  admin: 'Administrador(a)',
  vendedor: 'Vendedor(a)',
  estoquista: 'Estoquista',
};

function initials(name) {
  if (!name) return '';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0].toUpperCase())
    .join('');
}

// Metadados de apresentação por rota — access.js decide quem pode ver
// cada path; aqui só decidimos como mostrar as rotas que o papel pode ver.
const NAV_META_BY_PATH = {
  '/':                 { icon: LayoutDashboard, label: 'Dashboard',           section: 'principal' },
  '/venda':            { icon: ShoppingCart,    label: 'Venda',               section: 'principal' },
  '/estoque':          { icon: Package,         label: 'Estoque',             section: 'principal' },
  '/produtos':         { icon: Tag,             label: 'Produtos',            section: 'principal' },
  '/clientes':         { icon: Users,           label: 'Clientes',            section: 'principal' },
  '/fornecedores':     { icon: Building2,       label: 'Fornecedores',        section: 'principal' },
  '/compras':          { icon: ShoppingCart,    label: 'Compras',             section: 'principal' },
  '/historico':        { icon: History,         label: 'Histórico',           section: 'gestao' },
  '/relatorios':       { icon: BarChart2,       label: 'Relatórios',          section: 'gestao' },
  '/contas-pagar':     { icon: Wallet,          label: 'Contas a Pagar',      section: 'gestao' },
  '/contas-receber':   { icon: HandCoins,       label: 'Contas a Receber',    section: 'gestao' },
  '/ponto-equilibrio': { icon: Target,          label: 'Ponto de Equilíbrio', section: 'gestao' },
  '/despesas-fixas':   { icon: Receipt,         label: 'Despesas Fixas',      section: 'gestao' },
  '/configuracoes':    { icon: Settings,        label: 'Configurações',       section: 'gestao' },
};

// Rotas com segmento dinâmico (ex: /produtos/:id/precos) não têm entrada em
// NAV_META_BY_PATH nem fazem sentido como item de menu fixo — são acessadas
// a partir de outra tela (ex: um ícone na lista de Produtos), não pela
// sidebar. /compras/recebimentos é acessada pela aba "Recebimentos" dentro
// do Hub de Compras — não deve virar item próprio de menu (o brief pede
// explicitamente para não criar menus principais separados para
// Recebimentos).
const ROTAS_SEM_ITEM_PROPRIO = ['/mais', '/compras/recebimentos'];

// UX-04 (Issue #48): /produtos/estoque-baixo já retorna todo produto com
// estoque_atual <= estoque_minimo — o mesmo conjunto que Estoque.jsx usa
// para lowStockCount/outCount. Aqui replicamos a mesma regra (não criamos
// endpoint novo nem mudamos o que conta como "baixo"/"esgotado") só para
// decompor a contagem única em dois alertas semanticamente distintos.
export function contarAlertasEstoque(alertas) {
  const lista = Array.isArray(alertas) ? alertas : [];
  return {
    baixo: lista.filter(a => Number(a.estoque_atual) > 0).length,
    esgotado: lista.filter(a => Number(a.estoque_atual) === 0).length,
  };
}

const menuItems = Object.keys(ALLOWED_ROLES_BY_PATH)
  .filter(path => !path.includes(':') && !ROTAS_SEM_ITEM_PROPRIO.includes(path))
  .map(path => ({ path, ...NAV_META_BY_PATH[path] }));

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [estoqueAlertas, setEstoqueAlertas] = useState([]);

  useEffect(() => {
    if (!canAccessRoute('/estoque', user?.role)) {
      setEstoqueAlertas([]);
      return undefined;
    }

    let cancelled = false;
    listarEstoqueBaixo()
      .then(alertas => {
        if (!cancelled) setEstoqueAlertas(Array.isArray(alertas) ? alertas : []);
      })
      .catch(() => {
        if (!cancelled) setEstoqueAlertas([]);
      });

    return () => { cancelled = true; };
  }, [user?.role]);

  const alertasEstoque = contarAlertasEstoque(estoqueAlertas);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const visibleItems = menuItems.filter(({ path }) => canAccessRoute(path, user?.role));
  const principalItems = visibleItems.filter(({ section }) => section === 'principal');
  const gestaoItems = visibleItems.filter(({ section }) => section === 'gestao');

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Cherry size={22} strokeWidth={2.2} />
        </div>
        <div className="sidebar-logo-text">
          <span className="sidebar-logo-brand">Cherry</span>
          <span className="sidebar-logo-sub">SEMIJOIAS</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="sidebar-nav-label">Menu Principal</div>
        {principalItems.map(({ icon: Icon, label, path }) => (
          <div key={path}>
            <NavLink
              to={path}
              end={path === '/'}
              className={({ isActive }) =>
                `sidebar-nav-item ${isActive ? 'sidebar-nav-item--active' : ''}`
              }
            >
              <span className="sidebar-nav-icon">
                <Icon size={18} strokeWidth={2} />
              </span>
              <span className="sidebar-nav-label-text">{label}</span>
            </NavLink>

            {/* UX-04 (Issue #48): dois alertas independentes — cada um com
                sua própria contagem, ícone, texto e deeplink para o filtro
                correspondente em Estoque. Um tipo não esconde o outro; só
                não renderiza quando a contagem daquele tipo é zero. Nunca
                dependem só de cor: sempre têm texto + ícone diferentes. */}
            {path === '/estoque' && (alertasEstoque.baixo > 0 || alertasEstoque.esgotado > 0) && (
              <div className="sidebar-stock-alerts">
                {alertasEstoque.baixo > 0 && (
                  <Link
                    to="/estoque?filtro=baixo"
                    className="sidebar-stock-alert sidebar-stock-alert--baixo"
                    aria-label={`${alertasEstoque.baixo} ${alertasEstoque.baixo === 1 ? 'produto com' : 'produtos com'} estoque baixo. Ver lista filtrada em Estoque.`}
                    title={`${alertasEstoque.baixo} ${alertasEstoque.baixo === 1 ? 'produto com' : 'produtos com'} estoque baixo`}
                  >
                    <AlertTriangle size={14} strokeWidth={2} />
                    <span>Estoque baixo: {alertasEstoque.baixo}</span>
                  </Link>
                )}
                {alertasEstoque.esgotado > 0 && (
                  <Link
                    to="/estoque?filtro=esgotado"
                    className="sidebar-stock-alert sidebar-stock-alert--esgotado"
                    aria-label={`${alertasEstoque.esgotado} ${alertasEstoque.esgotado === 1 ? 'produto esgotado' : 'produtos esgotados'}. Ver lista filtrada em Estoque.`}
                    title={`${alertasEstoque.esgotado} ${alertasEstoque.esgotado === 1 ? 'produto esgotado' : 'produtos esgotados'}`}
                  >
                    <PackageX size={14} strokeWidth={2} />
                    <span>Esgotados: {alertasEstoque.esgotado}</span>
                  </Link>
                )}
              </div>
            )}
          </div>
        ))}

        <div className="sidebar-nav-label" style={{ marginTop: 'var(--space-4)' }}>Gestão</div>
        {gestaoItems.map(({ icon: Icon, label, path }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `sidebar-nav-item ${isActive ? 'sidebar-nav-item--active' : ''}`
            }
          >
            <span className="sidebar-nav-icon">
              <Icon size={18} strokeWidth={2} />
            </span>
            <span className="sidebar-nav-label-text">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user-avatar">{initials(user?.nome)}</div>
        <div className="sidebar-user-info">
          <span className="sidebar-user-name">{user?.nome}</span>
          <span className={`role-badge role-badge--${user?.role}`}>{ROLE_LABEL[user?.role]}</span>
        </div>
        <button
          type="button"
          className="sidebar-logout-btn"
          onClick={handleLogout}
          aria-label="Sair"
          title="Sair"
        >
          <LogOut size={16} strokeWidth={2} />
        </button>
      </div>
    </aside>
  );
}
