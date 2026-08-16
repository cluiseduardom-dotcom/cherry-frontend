import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { criarContaPagar, atualizarContaPagar } from '../services/contasPagar';
import './ProductModal.css';

const EMPTY_FORM = {
  descricao: '',
  fornecedor: '',
  valor: '',
  data_vencimento: '',
  categoria: '',
  observacao: '',
};

function formFromConta(conta) {
  if (!conta) return EMPTY_FORM;
  return {
    descricao: conta.descricao ?? '',
    fornecedor: conta.fornecedor ?? '',
    valor: conta.valor ?? '',
    data_vencimento: conta.data_vencimento ? String(conta.data_vencimento).slice(0, 10) : '',
    categoria: conta.categoria ?? '',
    observacao: conta.observacao ?? '',
  };
}

function validar(form) {
  if (!form.descricao.trim()) return 'Descrição é obrigatória';

  const valor = Number(form.valor);
  if (form.valor === '' || Number.isNaN(valor) || valor <= 0) {
    return 'Valor deve ser maior que zero';
  }

  if (!form.data_vencimento) return 'Data de vencimento é obrigatória';

  return '';
}

function montarPayload(form) {
  return {
    descricao: form.descricao.trim(),
    fornecedor: form.fornecedor.trim() || undefined,
    valor: Number(form.valor),
    data_vencimento: form.data_vencimento,
    categoria: form.categoria.trim() || undefined,
    observacao: form.observacao.trim() || undefined,
  };
}

export default function ContaPagarModal({ open, mode = 'create', conta, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(formFromConta(conta));
      setError('');
      setSaving(false);
    }
  }, [open, conta]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  function updateField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const validationError = validar(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setSaving(true);
    try {
      const payload = montarPayload(form);
      const contaSalva = mode === 'create'
        ? await criarContaPagar(payload)
        : await atualizarContaPagar(conta.id, payload);
      onSaved(contaSalva);
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
          <h2 className="modal-title">{mode === 'create' ? 'Nova Conta a Pagar' : 'Editar Conta a Pagar'}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            {error && <div className="modal-error">{error}</div>}

            <div className="modal-form-grid">
              <div className="input-wrapper modal-form-span-2">
                <label className="input-label" htmlFor="cpm-descricao">Descrição *</label>
                <input
                  id="cpm-descricao"
                  type="text"
                  className="input-field"
                  value={form.descricao}
                  onChange={e => updateField('descricao', e.target.value)}
                />
              </div>

              <div className="input-wrapper">
                <label className="input-label" htmlFor="cpm-fornecedor">Fornecedor</label>
                <input
                  id="cpm-fornecedor"
                  type="text"
                  className="input-field"
                  value={form.fornecedor}
                  onChange={e => updateField('fornecedor', e.target.value)}
                />
              </div>

              <div className="input-wrapper">
                <label className="input-label" htmlFor="cpm-categoria">Categoria</label>
                <input
                  id="cpm-categoria"
                  type="text"
                  className="input-field"
                  value={form.categoria}
                  onChange={e => updateField('categoria', e.target.value)}
                />
              </div>

              <div className="input-wrapper">
                <label className="input-label" htmlFor="cpm-valor">Valor *</label>
                <input
                  id="cpm-valor"
                  type="number"
                  min="0"
                  step="0.01"
                  className="input-field"
                  value={form.valor}
                  onChange={e => updateField('valor', e.target.value)}
                />
              </div>

              <div className="input-wrapper">
                <label className="input-label" htmlFor="cpm-vencimento">Data de vencimento *</label>
                <input
                  id="cpm-vencimento"
                  type="date"
                  className="input-field"
                  value={form.data_vencimento}
                  onChange={e => updateField('data_vencimento', e.target.value)}
                />
              </div>

              <div className="input-wrapper modal-form-span-2">
                <label className="input-label" htmlFor="cpm-observacao">Observação</label>
                <input
                  id="cpm-observacao"
                  type="text"
                  className="input-field"
                  value={form.observacao}
                  onChange={e => updateField('observacao', e.target.value)}
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
