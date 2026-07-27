import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { criarCliente } from '../services/clientes';
import './ProductModal.css';

const EMPTY_FORM = {
  nome: '',
  telefone: '',
  email: '',
};

function validar(form) {
  if (!form.nome.trim()) return 'Nome é obrigatório';

  if (form.email.trim()) {
    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
    if (!emailValido) return 'Email inválido';
  }

  return '';
}

function montarPayload(form) {
  return {
    nome: form.nome.trim(),
    telefone: form.telefone.trim() || undefined,
    email: form.email.trim() || undefined,
  };
}

export default function ClienteModal({ open, onClose, onSaved }) {
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
      const clienteSalvo = await criarCliente(montarPayload(form));
      onSaved(clienteSalvo);
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
          <h2 className="modal-title">Novo Cliente</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            {error && <div className="modal-error">{error}</div>}

            <div className="modal-form-grid">
              <div className="input-wrapper modal-form-span-2">
                <label className="input-label" htmlFor="cm-nome">Nome *</label>
                <input
                  id="cm-nome"
                  type="text"
                  className="input-field"
                  value={form.nome}
                  onChange={e => updateField('nome', e.target.value)}
                />
              </div>

              <div className="input-wrapper">
                <label className="input-label" htmlFor="cm-telefone">Telefone</label>
                <input
                  id="cm-telefone"
                  type="text"
                  className="input-field"
                  value={form.telefone}
                  onChange={e => updateField('telefone', e.target.value)}
                />
              </div>

              <div className="input-wrapper">
                <label className="input-label" htmlFor="cm-email">Email</label>
                <input
                  id="cm-email"
                  type="email"
                  className="input-field"
                  value={form.email}
                  onChange={e => updateField('email', e.target.value)}
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
