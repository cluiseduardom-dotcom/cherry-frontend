import { NavLink, useLocation } from 'react-router-dom';
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
} from 'lucide-react';
import './Sidebar.css';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard',   path: '/' },
  { icon: ShoppingCart,    label: 'Venda',        path: '/venda' },
  { icon: Package,         label: 'Estoque',      path: '/estoque' },
  { icon: Tag,             label: 'Produtos',     path: '/produtos' },
  { icon: Users,           label: 'Clientes',     path: '/clientes' },
  { icon: History,         label: 'Histórico',    path: '/historico' },
  { icon: BarChart2,       label: 'Relatórios',   path: '/relatorios' },
  { icon: Settings,        label: 'Configurações',path: '/configuracoes' },
];

export default function Sidebar() {
  const location = useLocation();

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
        {menuItems.slice(0, 5).map(({ icon: Icon, label, path }) => (
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
        {menuItems.slice(5).map(({ icon: Icon, label, path }) => (
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
        <div className="sidebar-user-avatar">MS</div>
        <div className="sidebar-user-info">
          <span className="sidebar-user-name">Maria Silva</span>
          <span className="role-badge role-badge--admin">Administradora</span>
        </div>
      </div>
    </aside>
  );
}
