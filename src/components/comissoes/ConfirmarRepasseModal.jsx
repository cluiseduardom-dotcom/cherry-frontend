import { useState } from 'react';
import { HandCoins, X, AlertTriangle, AlertCircle } from 'lucide-react';
import { confirmarRepasse } from '../../services/comissoes';
import { formatarMoeda } from '../../utils/mascaras';

export default function ConfirmarRepasseModal({ repasse, open, onClose, onSuccess }) {
  const [observacao, setObservacao] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!open || !repasse) return null;

  async function handleConfirm(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await confirmarRepasse(repasse.id, {
        observacao: observacao.trim() || undefined,
      });
      if (onSuccess) onSuccess(res);
      onClose();
    } catch (err) {
      setError(err.message || 'Erro ao confirmar repasse.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="confirm-dialog-overlay" onMouseDown={e => e.target === e.currentTarget && !submitting && onClose()}>
      <div className="confirm-dialog comissoes-modal" role="dialog" aria-modal="true">
        <div className="comissoes-modal-header">
          <div className="comissoes-modal-title-row">
            <HandCoins size={20} className="text-warning" />
            <h2 className="comissoes-modal-title">Confirmar Recebimento de Repasse</h2>
          </div>
          <button
            type="button"
            className="btn btn-ghost comissoes-modal-close"
            onClick={onClose}
            disabled={submitting}
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleConfirm}>
          <div className="comissoes-modal-body">
            {error && (
              <div className="comissoes-error-banner" role="alert">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <div className="comissoes-alerta-info">
              <AlertTriangle size={20} className="text-warning flex-shrink-0" />
              <div className="text-sm">
                <strong>Confirmação de entrada física de caixa:</strong>
                <p>
                  Ao confirmar, você atesta que o valor em dinheiro recebido pelo vendedor foi devidamente entregue à loja. Isso liberará a comissão pendente desta venda.
                </p>
              </div>
            </div>

            <div className="comissoes-repasse-card card card-padding">
              <div className="comissoes-resumo-grid">
                <div>
                  <span className="comissoes-resumo-label">Vendedor</span>
                  <span className="comissoes-resumo-value">{repasse.vendedor_nome}</span>
                </div>
                <div>
                  <span className="comissoes-resumo-label">Venda</span>
                  <span className="comissoes-resumo-value">#{repasse.venda_id}</span>
                </div>
                <div>
                  <span className="comissoes-resumo-label">Valor a Confirmar</span>
                  <span className="comissoes-resumo-value font-semibold text-lg text-primary">
                    {formatarMoeda(repasse.valor)}
                  </span>
                </div>
              </div>
            </div>

            <div className="input-wrapper" style={{ marginTop: 'var(--space-4)' }}>
              <label htmlFor="observacao-repasse" className="input-label">
                Observação (opcional, máx. 300 caracteres)
              </label>
              <textarea
                id="observacao-repasse"
                className="input-field"
                rows={3}
                maxLength={300}
                placeholder="Ex.: Recebido em mãos no balcão da loja"
                value={observacao}
                onChange={e => setObservacao(e.target.value)}
                disabled={submitting}
              />
              <span className="text-xs text-secondary" style={{ textAlign: 'right' }}>
                {observacao.length}/300
              </span>
            </div>
          </div>

          <div className="comissoes-modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Confirmando...' : 'Confirmar recebimento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
