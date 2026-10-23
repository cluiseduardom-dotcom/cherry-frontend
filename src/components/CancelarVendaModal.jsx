import { useEffect, useState } from 'react';
import { AlertCircle, ShieldAlert, TriangleAlert, X } from 'lucide-react';
import { obterPreviaCancelamento, cancelarVenda } from '../services/vendas';
import { useConfirmarFechamentoModal } from '../hooks/useConfirmarFechamentoModal';
import { formularioAlterado } from '../utils/formularioAlterado';
import {
  formInicial,
  validarCancelamento,
  montarPayloadCancelamento,
  formatarErroCancelamento,
} from '../utils/cancelamentoVenda';
import ConfirmarDescarteDialog from './ConfirmarDescarteDialog';
import './ProductModal.css';
import './CancelarVendaModal.css';

export default function CancelarVendaModal({
  open,
  venda,
  nomeCliente,
  onClose,
  onSuccess,
  onVendaJaCancelada,
}) {
  const [form, setForm] = useState(formInicial);
  const [initialForm] = useState(formInicial);
  const [previa, setPrevia] = useState(null);
  const [carregandoPrevia, setCarregandoPrevia] = useState(true);
  const [erroPrevia, setErroPrevia] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!open || !venda?.id) return;

    let cancelado = false;

    async function carregarPrevia() {
      try {
        const dados = await obterPreviaCancelamento(venda.id);
        if (!cancelado) {
          setPrevia(dados);
        }
      } catch (err) {
        if (!cancelado) {
          setErroPrevia(formatarErroCancelamento(err));
        }
      } finally {
        if (!cancelado) {
          setCarregandoPrevia(false);
        }
      }
    }

    carregarPrevia();

    return () => {
      cancelado = true;
    };
  }, [open, venda?.id]);

  const isDirty = formularioAlterado(form, initialForm);
  const { confirmando, solicitarFechamento, confirmarDescarte, continuarEditando } =
    useConfirmarFechamentoModal({ open, isDirty, onClose });

  if (!open || !venda) return null;

  function tentarFechar() {
    if (salvando) return;
    solicitarFechamento();
  }

  function updateField(campo, valor) {
    setForm(prev => ({ ...prev, [campo]: valor }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (salvando || carregandoPrevia) return;
    if (previa && !previa.pode_cancelar) return;

    const erroValidacao = validarCancelamento(form, previa);
    if (erroValidacao) {
      setErro(erroValidacao);
      return;
    }

    setErro('');
    setSalvando(true);

    try {
      const payload = montarPayloadCancelamento(form, previa);
      const vendaCancelada = await cancelarVenda(venda.id, payload);
      onSuccess?.(vendaCancelada);
      onClose();
    } catch (err) {
      const msg = formatarErroCancelamento(err);
      setErro(msg);

      if (err.status === 409) {
        onVendaJaCancelada?.(venda.id);
      }
    } finally {
      setSalvando(false);
    }
  }

  const bloqueado = Boolean(previa && !previa.pode_cancelar);
  const podeSubmeter = !carregandoPrevia && !erroPrevia && !bloqueado && !salvando;

  return (
    <>
      <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && tentarFechar()}>
        <div className="modal-panel card" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="modal-title">Cancelar Venda #{venda.id}</h2>
            <button
              type="button"
              className="modal-close"
              onClick={tentarFechar}
              disabled={salvando}
              aria-label="Fechar"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="cancelar-venda-resumo">
                <div className="cancelar-venda-resumo-item">
                  <span className="cancelar-venda-resumo-label">Venda</span>
                  <span className="cancelar-venda-resumo-value">#{venda.id}</span>
                </div>
                <div className="cancelar-venda-resumo-item">
                  <span className="cancelar-venda-resumo-label">Data</span>
                  <span className="cancelar-venda-resumo-value">
                    {new Date(venda.data).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div className="cancelar-venda-resumo-item">
                  <span className="cancelar-venda-resumo-label">Cliente</span>
                  <span className="cancelar-venda-resumo-value">{nomeCliente || 'Não identificado'}</span>
                </div>
                <div className="cancelar-venda-resumo-item">
                  <span className="cancelar-venda-resumo-label">Total</span>
                  <span className="cancelar-venda-resumo-value">
                    {Number(venda.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              </div>

              {erro && (
                <div className="modal-error" role="alert">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <AlertCircle size={16} />
                    <span>{erro}</span>
                  </div>
                </div>
              )}

              {carregandoPrevia && (
                <div className="empty-state" style={{ padding: 'var(--space-4)' }}>
                  <p className="text-sm text-secondary">Verificando regras de cancelamento...</p>
                </div>
              )}

              {!carregandoPrevia && erroPrevia && (
                <div className="modal-error" role="alert">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <AlertCircle size={16} />
                    <span>Não foi possível verificar a prévia: {erroPrevia}</span>
                  </div>
                </div>
              )}

              {!carregandoPrevia && bloqueado && (
                <div className="cancelar-venda-aviso cancelar-venda-aviso--warning" role="alert">
                  <TriangleAlert size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <strong>Cancelamento indisponível</strong>
                    <p style={{ margin: '4px 0 0 0' }}>
                      {previa.motivo_bloqueio || 'Esta venda não está finalizada e não pode ser cancelada.'}
                    </p>
                  </div>
                </div>
              )}

              {!carregandoPrevia && !bloqueado && (
                <div className="cancelar-venda-aviso cancelar-venda-aviso--info">
                  <TriangleAlert size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    Ao confirmar, o estoque dos itens será estornado automaticamente e o status da venda será alterado para cancelada. Esta ação não pode ser desfeita.
                  </div>
                </div>
              )}

              {!carregandoPrevia && !bloqueado && (
                <div className="modal-form-section">
                  <div className="input-wrapper">
                    <label className="input-label" htmlFor="cancelar-venda-motivo">
                      Motivo do cancelamento <span style={{ color: 'var(--color-danger)' }}>*</span>
                    </label>
                    <textarea
                      id="cancelar-venda-motivo"
                      className="input-field"
                      rows={3}
                      placeholder="Descreva o motivo (mínimo 5 caracteres)"
                      value={form.motivo}
                      onChange={e => updateField('motivo', e.target.value)}
                      disabled={salvando}
                      required
                    />
                    <span className="modal-field-hint">Mínimo de 5 caracteres.</span>
                  </div>
                </div>
              )}

              {!carregandoPrevia && !bloqueado && previa?.exige_autorizacao && (
                <div className="cancelar-venda-autorizacao-box">
                  <div className="cancelar-venda-autorizacao-header">
                    <ShieldAlert size={16} style={{ color: 'var(--color-warning)' }} />
                    <span>
                      Autorização necessária ({previa.autorizador_minimo?.rotulo || 'Supervisor ou superior'})
                    </span>
                  </div>
                  <p className="text-sm text-secondary" style={{ margin: 0 }}>
                    Esta venda exige a autorização de um {previa.autorizador_minimo?.rotulo || 'Supervisor ou superior'}. As credenciais serão validadas na hora.
                  </p>
                  <div className="modal-form-grid">
                    <div className="input-wrapper">
                      <label className="input-label" htmlFor="cancelar-venda-autorizador-email">
                        E-mail do autorizador <span style={{ color: 'var(--color-danger)' }}>*</span>
                      </label>
                      <input
                        id="cancelar-venda-autorizador-email"
                        type="email"
                        className="input-field"
                        placeholder="supervisor@comercio.com"
                        value={form.email}
                        onChange={e => updateField('email', e.target.value)}
                        disabled={salvando}
                        autoComplete="off"
                      />
                    </div>
                    <div className="input-wrapper">
                      <label className="input-label" htmlFor="cancelar-venda-autorizador-senha">
                        Senha do autorizador <span style={{ color: 'var(--color-danger)' }}>*</span>
                      </label>
                      <input
                        id="cancelar-venda-autorizador-senha"
                        type="password"
                        className="input-field"
                        placeholder="••••••••"
                        value={form.senha}
                        onChange={e => updateField('senha', e.target.value)}
                        disabled={salvando}
                        autoComplete="new-password"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={tentarFechar}
                disabled={salvando}
              >
                Voltar
              </button>
              <button
                type="submit"
                className="btn btn-danger"
                disabled={!podeSubmeter}
              >
                {salvando ? 'Cancelando...' : 'Confirmar cancelamento'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {confirmando && (
        <ConfirmarDescarteDialog
          onContinuar={continuarEditando}
          onDescartar={confirmarDescarte}
        />
      )}
    </>
  );
}