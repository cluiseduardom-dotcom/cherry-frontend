import { useState } from 'react';
import { TriangleAlert, X } from 'lucide-react';
import './CancelarCompraModal.css';

const money = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Substitui window.confirm por um modal real: mostra # da compra,
// fornecedor e valor antes de qualquer ação irreversível, e só chama
// PATCH /compras/:id/cancelar (via onConfirm) depois de confirmação
// explícita. Nenhuma regra de estorno é feita aqui — o backend
// (comprasRepository.cancelar) já estorna o estoque e cancela a conta a
// pagar vinculada na mesma transação.
export default function CancelarCompraModal({ compra, onConfirm, onClose }) {
  const [cancelando, setCancelando] = useState(false);
  const [erro, setErro] = useState('');

  async function handleConfirmar() {
    setCancelando(true);
    setErro('');
    try {
      await onConfirm();
    } catch (err) {
      setErro(err.message);
      setCancelando(false);
    }
  }

  return (
    <div className="compra-modal-backdrop" onMouseDown={e => e.target === e.currentTarget && !cancelando && onClose()}>
      <div className="compra-modal cancelar-compra-modal">
        <div className="compra-modal-header">
          <h2>Cancelar compra #{compra.id}</h2>
          <button type="button" className="produto-action-btn" onClick={onClose} disabled={cancelando}><X size={16} /></button>
        </div>

        {erro && <div className="compra-alert error">{erro}</div>}

        <dl className="cancelar-compra-resumo">
          <div><dt>Compra</dt><dd>#{compra.id}</dd></div>
          <div><dt>Fornecedor</dt><dd>{compra.fornecedor_nome || `Fornecedor #${compra.fornecedor_id}`}</dd></div>
          <div><dt>Valor total</dt><dd>{money(compra.valor_total)}</dd></div>
        </dl>

        <div className="cancelar-compra-aviso">
          <TriangleAlert size={18} />
          <p>
            Ao confirmar, o estoque desta compra será <strong>estornado</strong> (saída equivalente à entrada
            original) e a conta a pagar vinculada, se houver, será cancelada. Essa ação não pode ser desfeita.
          </p>
        </div>

        <div className="compra-modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={cancelando}>Voltar</button>
          <button type="button" className="btn btn-danger" onClick={handleConfirmar} disabled={cancelando}>
            {cancelando ? 'Cancelando...' : 'Confirmar cancelamento'}
          </button>
        </div>
      </div>
    </div>
  );
}
