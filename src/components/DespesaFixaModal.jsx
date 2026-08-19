import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { criarDespesaFixa, atualizarDespesaFixa } from '../services/despesasFixas';
import './ProductModal.css';

const CATEGORIAS = [
  { value: 'estrutural', label: 'Estrutural' },
  { value: 'pessoal', label: 'Pessoal' },
  { value: 'administrativa', label: 'Administrativa' },
];

const EMPTY_FORM = { categoria: 'estrutural', descricao: '', valor: '' };

function formFromDespesa(despesa) {
  if (!despesa) return EMPTY_FORM;
  return {
    categoria: despesa.categoria ?? 'estrutural',
    descricao: despesa.descricao ?? '',
    valor: despesa.valor ?? '',
  };
}

function validar(form) {
  if (!form.descricao.trim()) return 'Descrição é obrigatória';

  const valor = Number(form.valor);
  if (form.valor === '' || Number.isNaN(valor) || valor < 0) {
    return 'Valor não pode ser negativo';
  }

  return '';
}

function montarPayload(form) {
  return {
    categoria: form.categoria,
    descricao: form.descricao.trim(),
    valor: Number(form.valor),
  };
}

export default function DespesaFixaModal({ open, mode = 'create', despesa, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(formFromDespesa(despesa));
      setError('');
      setSaving(false);
    }
  }, [open, despesa]);

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
      const despesaSalva = mode === 'create'
        ? await criarDespesaFixa(payload)
        : await atualizarDespesaFixa(despesa.id, payload);
      onSaved(despesaSalva);
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
          <h2 className="modal-title">{mode === 'create' ? 'Nova Despesa Fixa' : 'Editar Despesa Fixa'}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            {error && <div className="modal-error">{error}</div>}

            <div className="modal-form-grid">
              <div className="input-wrapper modal-form-span-2">
                <label className="input-label" htmlFor="dfm-descricao">Descrição *</label>
                <input
                  id="dfm-descricao"
                  type="text"
                  className="input-field"
                  value={form.descricao}
                  onChange={e => updateField('descricao', e.target.value)}
                />
              </div>

              <div className="input-wrapper">
                <label className="input-label" htmlFor="dfm-categoria">Categoria *</label>
                <select
                  id="dfm-categoria"
                  className="input-field"
                  value={form.categoria}
                  onChange={e => updateField('categoria', e.target.value)}
                >
                  {CATEGORIAS.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div className="input-wrapper">
                <label className="input-label" htmlFor="dfm-valor">Valor mensal *</label>
                <input
                  id="dfm-valor"
                  type="number"
                  min="0"
                  step="0.01"
                  className="input-field"
                  value={form.valor}
                  onChange={e => updateField('valor', e.target.value)}
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
