import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { criarCategoria, atualizarCategoria } from '../services/categorias';
import './ProductModal.css';

function formVazio() {
  return { nivel: '', codigo: '', nome: '' };
}

function formFromCategoria(categoria) {
  if (!categoria) return formVazio();
  return { nivel: String(categoria.nivel), codigo: categoria.codigo ?? '', nome: categoria.nome ?? '' };
}

function validar(form, mode) {
  if (mode === 'create') {
    const nivel = Number(form.nivel);
    if (form.nivel === '' || !Number.isInteger(nivel) || nivel <= 0) {
      return 'Nível deve ser um número inteiro positivo';
    }
    if (!/^[A-Za-z0-9]{1,3}$/.test(form.codigo.trim())) {
      return 'Código deve ter de 1 a 3 letras e/ou números';
    }
  }
  if (!form.nome.trim()) return 'Nome é obrigatório';
  return '';
}

function montarPayload(form, mode) {
  if (mode === 'create') {
    return { nivel: Number(form.nivel), codigo: form.codigo.trim(), nome: form.nome.trim() };
  }
  return { nome: form.nome.trim() };
}

export default function CategoriaProdutoModal({ open, mode = 'create', categoria, onClose, onSaved }) {
  const [form, setForm] = useState(formVazio);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(formFromCategoria(categoria));
      setError('');
      setSaving(false);
    }
  }, [open, categoria]);

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
      const salva = mode === 'create'
        ? await criarCategoria(payload)
        : await atualizarCategoria(categoria.id, payload);
      onSaved(salva);
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
          <h2 className="modal-title">{mode === 'create' ? 'Nova categoria' : 'Renomear categoria'}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            {error && <div className="modal-error">{error}</div>}

            {mode === 'create' && (
              <p className="modal-warning">
                Código e nível não podem ser alterados depois de criados — confira antes de salvar. A única correção possível depois é excluir e recriar a categoria.
              </p>
            )}

            <div className="modal-form-grid">
              {mode === 'create' ? (
                <>
                  <div className="input-wrapper">
                    <label className="input-label" htmlFor="cpm-nivel">Nível *</label>
                    <input
                      id="cpm-nivel"
                      type="number"
                      min="1"
                      step="1"
                      className="input-field"
                      value={form.nivel}
                      onChange={e => updateField('nivel', e.target.value)}
                    />
                  </div>

                  <div className="input-wrapper">
                    <label className="input-label" htmlFor="cpm-codigo">Código *</label>
                    <input
                      id="cpm-codigo"
                      type="text"
                      maxLength={3}
                      className="input-field"
                      placeholder="ex.: BR"
                      value={form.codigo}
                      onChange={e => updateField('codigo', e.target.value)}
                    />
                  </div>
                </>
              ) : (
                <div className="input-wrapper modal-form-span-2">
                  <span className="input-label">Nível {categoria?.nivel} — código {categoria?.codigo} (fixos)</span>
                </div>
              )}

              <div className="input-wrapper modal-form-span-2">
                <label className="input-label" htmlFor="cpm-nome">Nome *</label>
                <input
                  id="cpm-nome"
                  type="text"
                  className="input-field"
                  placeholder="ex.: Brinco"
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
