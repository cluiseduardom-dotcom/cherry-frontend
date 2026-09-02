import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  History,
  MoreHorizontal,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { canAccessRoute } from '../config/access';
import './BottomNav.css';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: ShoppingCart,    label: 'Venda',     path: '/venda' },
  { icon: Package,         label: 'Estoque',   path: '/estoque' },
  { icon: History,         label: 'Histórico', path: '/historico' },
  { icon: MoreHorizontal,  label: 'Mais',      path: '/mais' },
];

export default function BottomNav() {
  const { user } = useAuth();
  // '/mais' não é uma rota registrada em access.js (não existe em nenhum
  // lugar de App.jsx) — não é parte do modelo de acesso, então fica sempre
  // visível em vez de ser filtrada pelo fail-closed default.
  const visibleItems = navItems.filter(({ path }) => path === '/mais' || canAccessRoute(path, user?.role));

  return (
    <nav className="bottom-nav">
      {visibleItems.map(({ icon: Icon, label, path }) => (
        <NavLink
          key={path}
          to={path}
          end={path === '/'}
          className={({ isActive }) =>
            `bottom-nav-item ${isActive ? 'bottom-nav-item--active' : ''}`
          }
        >
          <span className="bottom-nav-icon">
            <Icon size={20} strokeWidth={2} />
          </span>
          <span className="bottom-nav-label">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
