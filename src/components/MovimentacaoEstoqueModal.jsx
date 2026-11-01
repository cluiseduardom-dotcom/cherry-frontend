import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { registrarMovimentacaoEstoque } from '../services/estoque';
import {
  MOTIVOS_ESTOQUE,
  TIPO_LABEL,
  montarPayloadMovimentacao,
  motivosDoTipo,
  podeAjustarParaMais,
  tiposDisponiveis,
  validarMovimentacao,
} from '../utils/movimentacaoEstoque';
import { useConfirmarFechamentoModal } from '../hooks/useConfirmarFechamentoModal';
import { formularioAlterado } from '../utils/formularioAlterado';
import ConfirmarDescarteDialog from './ConfirmarDescarteDialog';
import './ProductModal.css';

const EMPTY_FORM = {
  produtoId: '',
  tipo: 'saida',
  quantidade: '',
  motivoCodigo: '',
  observacao: '',
};

// `user` define o que pode ser oferecido (entrada sem compra e estoque inicial dependem de permissão).
// O backend valida de novo: a tela só evita oferecer o que seria recusado.
export default function MovimentacaoEstoqueModal({ open, produtos, user, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  // Só vale para entrada: depois de salvar, abre a impressão de etiquetas com a quantidade desta entrada.
  const [imprimirEtiquetas, setImprimirEtiquetas] = useState(true);

  useEffect(() => {
    if (open) {
      setForm(EMPTY_FORM);
      setImprimirEtiquetas(true);
      setError('');
      setSaving(false);
    }
  }, [open]);

  // Issue #42: nunca fechar silenciosamente (clique fora, ESC, X ou
  // Cancelar) com dados preenchidos e não salvos.
  const isDirty = formularioAlterado(form, EMPTY_FORM);
  const { confirmando, solicitarFechamento, confirmarDescarte, continuarEditando } =
    useConfirmarFechamentoModal({ open, isDirty, onClose });

  if (!open) return null;

  function tentarFechar() {
    if (saving) return;
    solicitarFechamento();
  }

  const produtoSelecionado = produtos.find(p => String(p.id) === form.produtoId) ?? null;
  const tipos = tiposDisponiveis(user);
  const motivos = motivosDoTipo(form.tipo, user);
  const motivoSelecionado = MOTIVOS_ESTOQUE[form.tipo]?.[form.motivoCodigo];

  function updateField(field, value) {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      // Cada tipo tem a sua lista de motivos: trocar o tipo limpa o motivo escolhido.
      if (field === 'tipo') {
        next.motivoCodigo = '';
        next.observacao = '';
      }
      if (field === 'tipo' && value === 'ajuste' && prev.quantidade === '' && produtoSelecionado) {
        next.quantidade = String(produtoSelecionado.estoque_atual);
      }
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const validationError = validarMovimentacao(form, produtoSelecionado);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setSaving(true);
    try {
      const payload = montarPayloadMovimentacao(form);
      const movimentacao = await registrarMovimentacaoEstoque(Number(form.produtoId), payload);
      onSaved(movimentacao, {
        imprimirEtiquetas: form.tipo === 'entrada' && imprimirEtiquetas,
        quantidade: payload.quantidade,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && tentarFechar()}>
      <div className="modal-panel card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Registrar Movimentação de Estoque</h2>
          <button type="button" className="modal-close" onClick={tentarFechar} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            {error && <div className="modal-error">{error}</div>}

            <p className="modal-field-hint">
              Mercadoria comprada entra pelo estoque registrando uma <Link to="/compras">Compra</Link>
              {' '}(ou um Recebimento). Aqui ficam saídas, ajustes e as entradas sem compra.
            </p>

            <div className="modal-form-grid">
              <div className="input-wrapper modal-form-span-2">
                <label className="input-label" htmlFor="mm-produto">Produto *</label>
                <select
                  id="mm-produto"
                  className="input-field"
                  value={form.produtoId}
                  onChange={e => updateField('produtoId', e.target.value)}
                >
                  <option value="">Selecione um produto</option>
                  {produtos.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nome} {p.sku ? `(${p.sku})` : ''} — estoque atual: {p.estoque_atual}
                    </option>
                  ))}
                </select>
                {produtoSelecionado && (
                  <span className="modal-field-hint">Estoque atual: {produtoSelecionado.estoque_atual}</span>
                )}
              </div>

              <div className="input-wrapper">
                <label className="input-label" htmlFor="mm-tipo">Tipo *</label>
                <select
                  id="mm-tipo"
                  className="input-field"
                  value={form.tipo}
                  onChange={e => updateField('tipo', e.target.value)}
                >
                  {tipos.map(value => (
                    <option key={value} value={value}>{TIPO_LABEL[value]}</option>
                  ))}
                </select>
              </div>

              <div className="input-wrapper">
                <label className="input-label" htmlFor="mm-quantidade">
                  {form.tipo === 'ajuste' ? 'Novo estoque *' : 'Quantidade *'}
                </label>
                <input
                  id="mm-quantidade"
                  type="number"
                  min="0"
                  step="1"
                  className="input-field"
                  value={form.quantidade}
                  onChange={e => updateField('quantidade', e.target.value)}
                />
              </div>

              {form.tipo === 'entrada' && (
                <label className="modal-form-span-2 mm-imprimir-etiquetas">
                  <input type="checkbox" checked={imprimirEtiquetas} onChange={e => setImprimirEtiquetas(e.target.checked)} />
                  {' '}Imprimir etiquetas desta entrada depois de salvar
                </label>
              )}

              <div className="input-wrapper modal-form-span-2">
                <label className="input-label" htmlFor="mm-motivo">Motivo *</label>
                <select
                  id="mm-motivo"
                  className="input-field"
                  value={form.motivoCodigo}
                  onChange={e => updateField('motivoCodigo', e.target.value)}
                >
                  <option value="">Selecione o motivo</option>
                  {motivos.map(m => (
                    <option key={m.codigo} value={m.codigo}>{m.rotulo}</option>
                  ))}
                </select>
              </div>

              <div className="input-wrapper modal-form-span-2">
                <label className="input-label" htmlFor="mm-observacao">
                  {motivoSelecionado?.observacaoObrigatoria ? 'Observação *' : 'Observação'}
                </label>
                <input
                  id="mm-observacao"
                  type="text"
                  className="input-field"
                  maxLength={200}
                  value={form.observacao}
                  onChange={e => updateField('observacao', e.target.value)}
                />
                {form.tipo === 'ajuste' && !podeAjustarParaMais(user) && (
                  <span className="modal-field-hint">
                    Seu cargo pode ajustar o estoque para menos. Ajustar para mais exige permissão do administrador.
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={tentarFechar} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>

        {confirmando && (
          <ConfirmarDescarteDialog onContinuar={continuarEditando} onDescartar={confirmarDescarte} />
        )}
      </div>
    </div>
  );
}
