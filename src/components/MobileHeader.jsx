import { Bell, Menu, Cherry } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotificacoes } from '../context/NotificacoesContext';
import { rotuloContador } from '../utils/notificacoes';
import { useTheme } from '../theme/themeContext';
import './MobileHeader.css';

export default function MobileHeader({ title }) {
  const { marca } = useTheme();
  const navigate = useNavigate();
  const { naoLidos } = useNotificacoes();
  const contador = rotuloContador(naoLidos);

  return (
    <header className="mobile-header">
      <div className="mobile-header-logo">
        {marca.simbolo && (
          <span className="mobile-header-symbol">
            <img src={marca.simbolo} alt="" />
          </span>
        )}
        {marca.mostrarIcone && !marca.simbolo && (
          <div className="mobile-header-icon">
            <Cherry size={18} strokeWidth={2.2} />
          </div>
        )}
        <span className="mobile-header-title">{title || marca.nome}</span>
      </div>
      <div className="mobile-header-actions">
        <button
          type="button"
          className="mobile-header-btn"
          aria-label={naoLidos > 0 ? `Avisos (${naoLidos} novos)` : 'Avisos'}
          onClick={() => navigate('/avisos')}
        >
          <Bell size={20} strokeWidth={2} />
          {contador && <span className="mobile-header-notif-count">{contador}</span>}
        </button>
        <button type="button" className="mobile-header-btn" aria-label="Menu" onClick={() => navigate('/mais')}>
          <Menu size={20} strokeWidth={2} />
        </button>
      </div>
    </header>
  );
}
