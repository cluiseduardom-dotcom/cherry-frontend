import { useState, useEffect } from 'react';
import { Percent, X, AlertTriangle, AlertCircle } from 'lucide-react';
import { atualizarPercentual } from '../../services/comissoes';
import { validarPercentualInput } from '../../utils/formatarComissao';

export default function EditarPercentualModal({ alvo, open, onClose, onSuccess }) {
  const [modo, setModo] = useState('definir'); // 'definir' | 'herdar' | 'remover'
  const [valorInput, setValorInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !alvo) {
      setValorInput('');
      setError('');
      return;
    }

    if (alvo.tipo === 'padrao') {
      if (alvo.padraoAtual !== null && alvo.padraoAtual !== undefined) {
        setModo('definir');
        setValorInput(String(Number(alvo.padraoAtual)));
      } else {
        setModo('definir');
        setValorInput('');
      }
    } else {
      const u = alvo.usuario;
      if (u.percentual !== null && u.percentual !== undefined) {
        setModo('definir');
        setValorInput(String(Number(u.percentual)));
      } else {
        setModo('herdar');
        setValorInput('');
      }
    }
  }, [open, alvo]);

  if (!open || !alvo) return null;

  const isPadrao = alvo.tipo === 'padrao';
  const usuario = alvo.usuario;
  const isAdminUser = usuario?.cargo === 'admin';

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    let novoPercentual = null;

    if (modo === 'definir') {
      const validacao = validarPercentualInput(valorInput);
      if (!validacao.valido) {
        setError(validacao.erro);
        setSubmitting(false);
        return;
      }
      novoPercentual = validacao.valor;
    } else {
      // modo 'herdar' ou 'remover': percentual é null
      novoPercentual = null;
    }

    try {
      const res = await atualizarPercentual({
        usuario_id: isPadrao ? null : usuario.usuario_id,
        percentual: novoPercentual,
      });

      if (onSuccess) onSuccess(res);
      onClose();
    } catch (err) {
      setError(err.message || 'Erro ao atualizar percentual.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="confirm-dialog-overlay" onMouseDown={e => e.target === e.currentTarget && !submitting && onClose()}>
      <div className="confirm-dialog comissoes-modal" role="dialog" aria-modal="true">
        <div className="comissoes-modal-header">
          <div className="comissoes-modal-title-row">
            <Percent size={20} className="text-primary" />
            <h2 className="comissoes-modal-title">
              {isPadrao ? 'Configurar Padrão da Empresa' : `Configurar Comissão de ${usuario.nome}`}
            </h2>
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
                <strong>Válido apenas para vendas futuras:</strong>
                <p>
                  A alteração deste percentual não altera vendas ou comissões que já foram calculadas e registradas no passado.
                </p>
              </div>
            </div>

            {isPadrao ? (
              <div className="comissoes-opcoes-modo">
                <label className="comissoes-radio-label">
                  <input
                    type="radio"
                    name="modoPadrao"
                    value="definir"
                    checked={modo === 'definir'}
                    onChange={() => setModo('definir')}
                    disabled={submitting}
                  />
                  <span>Definir percentual padrão</span>
                </label>

                <label className="comissoes-radio-label">
                  <input
                    type="radio"
                    name="modoPadrao"
                    value="remover"
                    checked={modo === 'remover'}
                    onChange={() => setModo('remover')}
                    disabled={submitting}
                  />
                  <span>Deixar sem padrão (empresa sem comissão padrão)</span>
                </label>
              </div>
            ) : (
              <div className="comissoes-opcoes-modo">
                <label className="comissoes-radio-label">
                  <input
                    type="radio"
                    name="modoUsuario"
                    value="definir"
                    checked={modo === 'definir'}
                    onChange={() => setModo('definir')}
                    disabled={submitting}
                  />
                  <span>Definir percentual próprio para este vendedor</span>
                </label>

                <label className="comissoes-radio-label">
                  <input
                    type="radio"
                    name="modoUsuario"
                    value="herdar"
                    checked={modo === 'herdar'}
                    onChange={() => setModo('herdar')}
                    disabled={submitting}
                  />
                  <span>
                    {isAdminUser
                      ? 'Sem comissão (perfil administrador não herda o padrão)'
                      : 'Herdar comissão padrão da empresa'}
                  </span>
                </label>
              </div>
            )}

            {modo === 'definir' && (
              <div className="input-wrapper" style={{ marginTop: 'var(--space-4)' }}>
                <label htmlFor="percentual-input" className="input-label">
                  Percentual de comissão (%)
                </label>
                <div className="input-icon-wrapper">
                  <input
                    id="percentual-input"
                    type="number"
                    step="0.0001"
                    min="0"
                    max="100"
                    className="input-field"
                    placeholder="Ex.: 5 ou 7.5"
                    value={valorInput}
                    onChange={e => setValorInput(e.target.value)}
                    disabled={submitting}
                    required
                  />
                  <Percent size={16} className="input-icon" />
                </div>
                <span className="text-xs text-secondary">
                  Valor entre 0 e 100 com até 4 casas decimais. (Percentual 0 desliga a comissão deste vendedor).
                </span>
              </div>
            )}
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
              {submitting ? 'Salvando...' : 'Salvar percentual'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
