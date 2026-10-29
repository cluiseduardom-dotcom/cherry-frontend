import { useState } from 'react';
import { AlertCircle, AlertTriangle, Undo2, X } from 'lucide-react';
import { devolverPix } from '../../services/pixDevolucao';
import { formatarMoeda } from '../../utils/mascaras';
import { MOTIVO_MAX, MINUTOS_PIX_RECENTE, pixRecente, rotuloOrigemPix, validarMotivoDevolucao } from '../../utils/pixDevolucao';

// Confirmação da devolução de um Pix pago: dinheiro saindo da loja de volta ao pagador, sem desfazer.
export default function DevolverPixModal({ item, open, onClose, onSuccess }) {
  const [motivo, setMotivo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!open || !item) return null;

  async function handleSubmit(e) {
    e.preventDefault();

    const validacao = validarMotivoDevolucao(motivo);
    if (!validacao.valido) {
      setError(validacao.erro);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const resultado = await devolverPix(item.codigo, { motivo: validacao.motivo });
      onSuccess?.(resultado);
      onClose();
    } catch (err) {
      setError(err.message || 'Não foi possível devolver o Pix.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="confirm-dialog-overlay">
      <div className="confirm-dialog comissoes-modal" role="dialog" aria-modal="true" aria-labelledby="devolver-pix-titulo">
        <div className="comissoes-modal-header">
          <div className="comissoes-modal-title-row">
            <Undo2 size={20} className="text-warning" />
            <h2 className="comissoes-modal-title" id="devolver-pix-titulo">Devolver Pix ao pagador</h2>
          </div>
          <button type="button" className="btn btn-ghost comissoes-modal-close" onClick={onClose} disabled={submitting} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
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
                <strong>Esta ação não pode ser desfeita.</strong>
                <p>
                  O valor integral volta ao pagador pelo Mercado Pago, e a conta da loja precisa ter saldo para isso.
                  A devolução fica registrada com o seu nome e o motivo.
                </p>
              </div>
            </div>

            {pixRecente(item) && (
              <div className="comissoes-alerta-info" role="status">
                <AlertTriangle size={20} className="text-warning flex-shrink-0" />
                <div className="text-sm">
                  <strong>Pix recebido há menos de {MINUTOS_PIX_RECENTE} minutos.</strong>
                  <p>Confirme que a venda não está sendo concluída em outro caixa antes de devolver.</p>
                </div>
              </div>
            )}

            <div className="comissoes-repasse-card card card-padding">
              <div className="comissoes-resumo-grid">
                <div>
                  <span className="comissoes-resumo-label">Origem</span>
                  <span className="comissoes-resumo-value">{rotuloOrigemPix(item)}</span>
                </div>
                <div>
                  <span className="comissoes-resumo-label">Valor a devolver</span>
                  <span className="comissoes-resumo-value font-semibold text-lg text-primary">{formatarMoeda(item.valor)}</span>
                </div>
              </div>
            </div>

            <div className="input-wrapper" style={{ marginTop: 'var(--space-4)' }}>
              <label htmlFor="motivo-devolucao-pix" className="input-label">Motivo da devolução</label>
              <textarea
                id="motivo-devolucao-pix"
                className="input-field"
                rows={3}
                maxLength={MOTIVO_MAX}
                placeholder="Ex.: Cliente desistiu da compra"
                value={motivo}
                onChange={e => { setMotivo(e.target.value); setError(''); }}
                disabled={submitting}
                autoFocus
              />
              <span className="text-xs text-secondary" style={{ textAlign: 'right' }}>{motivo.length}/{MOTIVO_MAX}</span>
            </div>
          </div>

          <div className="comissoes-modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Devolvendo...' : `Devolver ${formatarMoeda(item.valor)}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
