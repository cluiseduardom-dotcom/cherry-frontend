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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { canAccessRoute } from '../config/roles';
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

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard',   path: '/' },
  { icon: ShoppingCart,    label: 'Venda',        path: '/venda' },
  { icon: Package,         label: 'Estoque',      path: '/estoque' },
  { icon: Tag,             label: 'Produtos',     path: '/produtos' },
  { icon: Users,           label: 'Clientes',     path: '/clientes' },
  { icon: History,         label: 'Histórico',    path: '/historico' },
  { icon: BarChart2,       label: 'Relatórios',   path: '/relatorios' },
  { icon: Wallet,          label: 'Contas a Pagar',    path: '/contas-pagar' },
  { icon: HandCoins,       label: 'Contas a Receber',  path: '/contas-receber' },
  { icon: Settings,        label: 'Configurações',path: '/configuracoes' },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

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
        {menuItems.slice(0, 5).filter(({ path }) => canAccessRoute(path, user?.role)).map(({ icon: Icon, label, path }) => (
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
        {menuItems.slice(5).filter(({ path }) => canAccessRoute(path, user?.role)).map(({ icon: Icon, label, path }) => (
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
