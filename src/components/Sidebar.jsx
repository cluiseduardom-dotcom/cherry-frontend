import { NavLink, useLocation, useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ALLOWED_ROLES_BY_PATH, canAccessRoute } from '../config/access';
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
  '/historico':        { icon: History,         label: 'Histórico',           section: 'gestao' },
  '/relatorios':       { icon: BarChart2,       label: 'Relatórios',          section: 'gestao' },
  '/contas-pagar':     { icon: Wallet,          label: 'Contas a Pagar',      section: 'gestao' },
  '/contas-receber':   { icon: HandCoins,       label: 'Contas a Receber',    section: 'gestao' },
  '/ponto-equilibrio': { icon: Target,          label: 'Ponto de Equilíbrio', section: 'gestao' },
  '/despesas-fixas':   { icon: Receipt,         label: 'Despesas Fixas',      section: 'gestao' },
  '/configuracoes':    { icon: Settings,        label: 'Configurações',       section: 'gestao' },
};

const menuItems = Object.keys(ALLOWED_ROLES_BY_PATH).map(path => ({ path, ...NAV_META_BY_PATH[path] }));

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

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
          <NavLink
            key={path}
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
            {path === '/estoque' && (
              <span className="sidebar-nav-badge">3</span>
            )}
          </NavLink>
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
