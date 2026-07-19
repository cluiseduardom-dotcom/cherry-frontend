import { Bell, Menu, Cherry } from 'lucide-react';
import './MobileHeader.css';

export default function MobileHeader({ title = 'Cherry' }) {
  return (
    <header className="mobile-header">
      <div className="mobile-header-logo">
        <div className="mobile-header-icon">
          <Cherry size={18} strokeWidth={2.2} />
        </div>
        <span className="mobile-header-title">{title}</span>
      </div>
      <div className="mobile-header-actions">
        <button className="mobile-header-btn" aria-label="Notificações">
          <Bell size={20} strokeWidth={2} />
          <span className="mobile-header-notif-dot" />
        </button>
        <button className="mobile-header-btn" aria-label="Menu">
          <Menu size={20} strokeWidth={2} />
        </button>
      </div>
    </header>
  );
}
