import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { criarNivelCategoria, atualizarNivelCategoria } from '../services/niveisCategoria';
import './ProductModal.css';

function formVazio() {
  return { nivel: '', nome: '' };
}

function formFromNivel(nivel) {
  if (!nivel) return formVazio();
  return { nivel: String(nivel.nivel), nome: nivel.nome ?? '' };
}

function validar(form, mode) {
  if (mode === 'create') {
    const nivel = Number(form.nivel);
    if (form.nivel === '' || !Number.isInteger(nivel) || nivel <= 0) {
      return 'Nível deve ser um número inteiro positivo';
    }
  }
  if (!form.nome.trim()) return 'Nome é obrigatório';
  return '';
}

function montarPayload(form, mode) {
  if (mode === 'create') {
    return { nivel: Number(form.nivel), nome: form.nome.trim() };
  }
  return { nome: form.nome.trim() };
}

export default function NivelCategoriaModal({ open, mode = 'create', nivel, onClose, onSaved }) {
  const [form, setForm] = useState(formVazio);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(formFromNivel(nivel));
      setError('');
      setSaving(false);
    }
  }, [open, nivel]);

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

    const validationError = validar(form, mode);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setSaving(true);
    try {
      const payload = montarPayload(form, mode);
      const salvo = mode === 'create'
        ? await criarNivelCategoria(payload)
        : await atualizarNivelCategoria(nivel.id, payload);
      onSaved(salvo);
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
          <h2 className="modal-title">{mode === 'create' ? 'Novo nível de categoria' : 'Renomear nível'}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            {error && <div className="modal-error">{error}</div>}

            <p className="modal-field-hint" style={{ marginBottom: 'var(--space-4)' }}>
              Renomear é seguro — é só o rótulo de exibição, não afeta categorias nem SKUs existentes.
            </p>

            <div className="modal-form-grid">
              {mode === 'create' && (
                <div className="input-wrapper">
                  <label className="input-label" htmlFor="ncm-nivel">Nível *</label>
                  <input
                    id="ncm-nivel"
                    type="number"
                    min="1"
                    step="1"
                    className="input-field"
                    value={form.nivel}
                    onChange={e => updateField('nivel', e.target.value)}
                  />
                </div>
              )}

              <div className="input-wrapper modal-form-span-2">
                <label className="input-label" htmlFor="ncm-nome">Nome *</label>
                <input
                  id="ncm-nome"
                  type="text"
                  className="input-field"
                  placeholder="ex.: Família"
                  value={form.nome}
                  onChange={e => updateField('nome', e.target.value)}
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
