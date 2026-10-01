import { useEffect, useRef } from 'react';
import { TriangleAlert } from 'lucide-react';
import { useConfirmarFechamentoModal } from '../hooks/useConfirmarFechamentoModal';
import './ConfirmDialog.css';

// UX-05 (Issue #50): substitui window.confirm por um diálogo acessível para
// ações destrutivas/transacionais (exclusão, cancelamento, aprovação,
// movimentação, financeiro). Generaliza o mesmo padrão do
// ConfirmarDescarteDialog (UX-01) — mesma estrutura de overlay/dialog,
// mesmo hook de ESC/clique-fora seguro — mas com título, mensagem e rótulos
// variáveis por chamada, em vez do texto fixo de "alterações não salvas".
//
// Cancelar, ESC ou clique fora SEMPRE chamam onCancel, nunca onConfirm —
// quem decide executar a ação é exclusivamente o clique em "Confirmar".
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'warning',
  onConfirm,
  onCancel,
}) {
  const cancelButtonRef = useRef(null);

  // Diálogo de confirmação não tem dado de formulário a proteger
  // (isDirty sempre falso) — reaproveita o hook só pelo ESC/clique-fora
  // padronizados (Issue #42), igual ao CancelarCompraModal já faz.
  const { solicitarFechamento } = useConfirmarFechamentoModal({
    open,
    isDirty: false,
    onClose: onCancel,
  });

  useEffect(() => {
    if (open) cancelButtonRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="confirm-dialog-overlay"
      onMouseDown={e => e.target === e.currentTarget && solicitarFechamento()}
    >
      <div
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-titulo"
        aria-describedby="confirm-dialog-texto"
      >
        <div className={`confirm-dialog-icon confirm-dialog-icon--${tone}`}>
          <TriangleAlert size={20} />
        </div>
        <h3 id="confirm-dialog-titulo">{title}</h3>
        <p id="confirm-dialog-texto">{message}</p>
        <div className="confirm-dialog-actions">
          <button type="button" className={`btn ${tone === 'danger' ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
          <button type="button" className="btn btn-ghost" onClick={solicitarFechamento} ref={cancelButtonRef}>
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
