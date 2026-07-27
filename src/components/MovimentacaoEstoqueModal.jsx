import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { registrarMovimentacaoEstoque } from '../services/estoque';
import './ProductModal.css';

const EMPTY_FORM = {
  produtoId: '',
  tipo: 'entrada',
  quantidade: '',
  motivo: '',
};

const TIPO_LABEL = {
  entrada: 'Entrada',
  saida: 'Saída',
  ajuste: 'Ajuste (define o estoque)',
};

function validar(form, produtoSelecionado) {
  if (!form.produtoId) return 'Selecione um produto';
  if (!produtoSelecionado) return 'Produto inválido';

  const quantidade = Number(form.quantidade);
  if (form.quantidade === '' || Number.isNaN(quantidade) || !Number.isInteger(quantidade)) {
    return 'Quantidade inválida';
  }

  if (form.tipo === 'ajuste') {
    if (quantidade < 0) return 'Quantidade inválida';
  } else {
    if (quantidade <= 0) return 'Quantidade deve ser maior que zero';
    if (form.tipo === 'saida' && quantidade > produtoSelecionado.estoque_atual) {
      return `Estoque insuficiente (disponível: ${produtoSelecionado.estoque_atual})`;
    }
  }

  return '';
}

export default function MovimentacaoEstoqueModal({ open, produtos, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(EMPTY_FORM);
      setError('');
      setSaving(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const produtoSelecionado = produtos.find(p => String(p.id) === form.produtoId) ?? null;

  function updateField(field, value) {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'tipo' && value === 'ajuste' && prev.quantidade === '' && produtoSelecionado) {
        next.quantidade = String(produtoSelecionado.estoque_atual);
      }
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const validationError = validar(form, produtoSelecionado);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setSaving(true);
    try {
      const payload = {
        tipo: form.tipo,
        quantidade: Number(form.quantidade),
        motivo: form.motivo.trim() || undefined,
      };
      const movimentacao = await registrarMovimentacaoEstoque(Number(form.produtoId), payload);
      onSaved(movimentacao);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Registrar Movimentação de Estoque</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            {error && <div className="modal-error">{error}</div>}

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
                  {Object.entries(TIPO_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
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

              <div className="input-wrapper modal-form-span-2">
                <label className="input-label" htmlFor="mm-motivo">Motivo</label>
                <input
                  id="mm-motivo"
                  type="text"
                  className="input-field"
                  maxLength={255}
                  value={form.motivo}
                  onChange={e => updateField('motivo', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
