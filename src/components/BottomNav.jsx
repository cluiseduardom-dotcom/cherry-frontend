import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  History,
  MoreHorizontal,
} from 'lucide-react';
import './BottomNav.css';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: ShoppingCart,    label: 'Venda',     path: '/venda' },
  { icon: Package,         label: 'Estoque',   path: '/estoque' },
  { icon: History,         label: 'Histórico', path: '/historico' },
  { icon: MoreHorizontal,  label: 'Mais',      path: '/mais' },
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {navItems.map(({ icon: Icon, label, path }) => (
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
