import { useState } from 'react';
import { Wallet, X, AlertCircle, AlertTriangle } from 'lucide-react';
import { registrarPagamentoComissao } from '../../services/comissoes';
import { formatarMoeda } from '../../utils/mascaras';
import {
  FORM_PAGAMENTO_VAZIO, FORMAS_PAGAMENTO_COMISSAO, hojeISO, validarPagamentoComissao,
} from '../../utils/pagamentosComissao';

// Registra que a empresa JÁ pagou o vendedor. O sistema não move dinheiro: o Pix/transferência é
// feito por fora e confirmado aqui. O valor enviado é o que a tela mostrou; se mudou (estorno, nova
// liberação), o backend recusa com 409 e a lista é recarregada.
export default function PagarComissaoModal({ linha, open, onClose, onSuccess, onConflito }) {
  const [form, setForm] = useState(() => ({ ...FORM_PAGAMENTO_VAZIO, pagoEm: hojeISO() }));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!open || !linha) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;

    const validacao = validarPagamentoComissao(linha, form);
    if (!validacao.valido) {
      setError(validacao.erro);
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const res = await registrarPagamentoComissao(validacao.dados);
      onSuccess?.(res);
      onClose();
    } catch (err) {
      setError(err.message || 'Erro ao registrar o pagamento.');
      // 409 = o valor mudou: recarrega a lista para a pessoa ver o valor atual.
      if (err.status === 409) onConflito?.();
    } finally {
      setSubmitting(false);
    }
  }

  const temDesconto = Number(linha.descontos) < 0;

  return (
    <div className="confirm-dialog-overlay" onMouseDown={e => e.target === e.currentTarget && !submitting && onClose()}>
      <div className="confirm-dialog comissoes-modal" role="dialog" aria-modal="true" aria-labelledby="pagar-comissao-titulo">
        <div className="comissoes-modal-header">
          <div className="comissoes-modal-title-row">
            <Wallet size={20} className="text-primary" />
            <h2 className="comissoes-modal-title" id="pagar-comissao-titulo">Registrar pagamento de comissão</h2>
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
                <strong>Este registro não faz a transferência.</strong>
                <p>Faça o Pix ou a transferência ao vendedor primeiro e registre aqui em seguida. Depois de registrado, não dá para alterar.</p>
              </div>
            </div>

            <div className="comissoes-repasse-card card card-padding">
              <div className="comissoes-resumo-grid">
                <div>
                  <span className="comissoes-resumo-label">Vendedor</span>
                  <span className="comissoes-resumo-value">{linha.vendedor_nome}</span>
                </div>
                <div>
                  <span className="comissoes-resumo-label">Comissões</span>
                  <span className="comissoes-resumo-value">{linha.quantidade_comissoes}</span>
                </div>
                <div>
                  <span className="comissoes-resumo-label">Valor a pagar</span>
                  <span className="comissoes-resumo-value font-semibold text-lg text-primary">{formatarMoeda(linha.a_pagar)}</span>
                </div>
              </div>
              {temDesconto && (
                <p className="text-xs text-secondary" style={{ marginTop: 'var(--space-2)' }}>
                  Inclui desconto de {formatarMoeda(Math.abs(Number(linha.descontos)))} por vendas canceladas depois de já pagas.
                </p>
              )}
            </div>

            <div className="input-wrapper" style={{ marginTop: 'var(--space-4)' }}>
              <label htmlFor="pc-forma" className="input-label">Forma de pagamento *</label>
              <select id="pc-forma" className="input-field" value={form.forma} disabled={submitting}
                onChange={e => setForm(prev => ({ ...prev, forma: e.target.value }))}>
                {FORMAS_PAGAMENTO_COMISSAO.map(f => <option key={f.valor} value={f.valor}>{f.rotulo}</option>)}
              </select>
            </div>

            <div className="input-wrapper" style={{ marginTop: 'var(--space-3)' }}>
              <label htmlFor="pc-data" className="input-label">Data do pagamento *</label>
              <input id="pc-data" type="date" className="input-field" max={hojeISO()} value={form.pagoEm} disabled={submitting}
                onChange={e => setForm(prev => ({ ...prev, pagoEm: e.target.value }))} />
            </div>

            <div className="input-wrapper" style={{ marginTop: 'var(--space-3)' }}>
              <label htmlFor="pc-obs" className="input-label">Observação (opcional, máx. 300 caracteres)</label>
              <textarea id="pc-obs" className="input-field" rows={2} maxLength={300} value={form.observacao} disabled={submitting}
                placeholder="Ex.: Pix para a chave do CPF, comprovante 123"
                onChange={e => setForm(prev => ({ ...prev, observacao: e.target.value }))} />
            </div>
          </div>

          <div className="comissoes-modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Registrando...' : 'Registrar pagamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
