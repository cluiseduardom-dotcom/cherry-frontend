import { useEffect, useRef } from 'react';
import { TriangleAlert } from 'lucide-react';
import './ConfirmarDescarteDialog.css';

// Renderizado por cima de um modal já aberto quando o usuário tenta
// fechá-lo (clique fora, ESC, X ou Cancelar) com alterações não salvas
// (Issue #42). O foco vai para "Continuar editando" por padrão — a ação
// segura — nunca para "Descartar".
export default function ConfirmarDescarteDialog({ onContinuar, onDescartar }) {
  const botaoContinuarRef = useRef(null);

  useEffect(() => {
    botaoContinuarRef.current?.focus();
  }, []);

  return (
    <div
      className="confirmar-descarte-overlay"
      onMouseDown={e => e.stopPropagation()}
    >
      <div
        className="confirmar-descarte-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmar-descarte-titulo"
        aria-describedby="confirmar-descarte-texto"
      >
        <div className="confirmar-descarte-icon"><TriangleAlert size={20} /></div>
        <h3 id="confirmar-descarte-titulo">Alterações não salvas</h3>
        <p id="confirmar-descarte-texto">
          Há dados preenchidos neste formulário que ainda não foram salvos. Se você sair agora, essas informações serão perdidas.
        </p>
        <div className="confirmar-descarte-actions">
          <button type="button" className="btn btn-danger" onClick={onDescartar}>
            Descartar alterações
          </button>
          <button type="button" className="btn btn-primary" onClick={onContinuar} ref={botaoContinuarRef}>
            Continuar editando
          </button>
        </div>
      </div>
    </div>
  );
}
