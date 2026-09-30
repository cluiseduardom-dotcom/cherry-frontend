import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { atualizarFornecedor, criarFornecedor } from '../services/fornecedores';
import { useConfirmarFechamentoModal } from '../hooks/useConfirmarFechamentoModal';
import { formularioAlterado } from '../utils/formularioAlterado';
import ConfirmarDescarteDialog from './ConfirmarDescarteDialog';
import { aplicarMascaraCpfCnpj, aplicarMascaraTelefone, cpfCnpjValido, somenteDigitos } from '../utils/mascaras';
import CampoMascarado from './CampoMascarado';
import '../pages/Fornecedores.css';

function formVazio() {
  return {
    nome: '',
    contato: '',
    telefone: '',
    email: '',
    cnpj_cpf: '',
    observacoes: '',
  };
}

function formFromFornecedor(fornecedor) {
  if (!fornecedor) return formVazio();
  return {
    nome: fornecedor.nome ?? '',
    contato: fornecedor.contato ?? '',
    telefone: fornecedor.telefone ?? '',
    email: fornecedor.email ?? '',
    cnpj_cpf: fornecedor.cnpj_cpf ?? '',
    observacoes: fornecedor.observacoes ?? '',
  };
}

export function montarPayload(form) {
  return {
    nome: form.nome.trim(),
    contato: form.contato.trim() || undefined,
    telefone: form.telefone.trim() ? somenteDigitos(form.telefone) : undefined,
    email: form.email.trim() || undefined,
    cnpj_cpf: form.cnpj_cpf.trim() ? somenteDigitos(form.cnpj_cpf) : undefined,
    observacoes: form.observacoes.trim() || undefined,
  };
}

// UX-01 (VERTUMNO-UX-FOUNDATION-P0): extraído de Fornecedores.jsx, que
// mantinha o modal inline. Regras de negócio, payload, validação e RBAC
// preservados exatamente como estavam — só a organização em componente
// próprio mudou, seguindo o mesmo padrão de ClienteModal/ProductModal.
export default function FornecedorModal({ open, fornecedor, onClose, onSaved }) {
  const [form, setForm] = useState(formVazio);
  const [initialForm, setInitialForm] = useState(formVazio);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const dados = formFromFornecedor(fornecedor);
      setForm(dados);
      setInitialForm(dados);
      setError('');
      setSaving(false);
    }
  }, [open, fornecedor]);

  // Issue #42: nunca fechar silenciosamente (clique fora, ESC, X ou
  // Cancelar) com dados alterados e não salvos.
  const isDirty = formularioAlterado(form, initialForm);
  const { confirmando, solicitarFechamento, confirmarDescarte, continuarEditando } =
    useConfirmarFechamentoModal({ open, isDirty, onClose });

  if (!open) return null;

  function tentarFechar() {
    if (saving) return;
    solicitarFechamento();
  }

  function setField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSave(event) {
    event.preventDefault();

    if (form.cnpj_cpf.trim() && !cpfCnpjValido(form.cnpj_cpf)) {
      setError('CNPJ/CPF inválido.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = montarPayload(form);
      const saved = fornecedor
        ? await atualizarFornecedor(fornecedor.id, payload)
        : await criarFornecedor(payload);
      onSaved(saved);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fornecedor-modal-backdrop" role="presentation" onMouseDown={e => e.target === e.currentTarget && tentarFechar()}>
      <div className="fornecedor-modal card" role="dialog" aria-modal="true" aria-labelledby="fornecedor-modal-title" onMouseDown={e => e.stopPropagation()}>
        <div className="fornecedor-modal-header">
          <div>
            <h2 id="fornecedor-modal-title">{fornecedor ? 'Editar fornecedor' : 'Novo fornecedor'}</h2>
            <p>Os dados serão usados também no fluxo de compras.</p>
          </div>
          <button className="fornecedor-modal-close" onClick={tentarFechar} aria-label="Fechar"><X size={18} /></button>
        </div>

        <form onSubmit={handleSave}>
          <div className="fornecedor-form-grid">
            <div className="input-wrapper fornecedor-form-full">
              <label className="input-label">Nome / Razão social *</label>
              <input className="input-field" value={form.nome} onChange={e => setField('nome', e.target.value)} required maxLength={200} />
            </div>
            <div className="input-wrapper">
              <label className="input-label">CNPJ / CPF</label>
              <CampoMascarado
                mascara={aplicarMascaraCpfCnpj}
                value={form.cnpj_cpf}
                onChange={valor => setField('cnpj_cpf', valor)}
                inputMode="numeric"
                maxLength={18}
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
              />
            </div>
            <div className="input-wrapper">
              <label className="input-label">Contato</label>
              <input className="input-field" value={form.contato} onChange={e => setField('contato', e.target.value)} />
            </div>
            <div className="input-wrapper">
              <label className="input-label">Telefone</label>
              <CampoMascarado
                mascara={aplicarMascaraTelefone}
                value={form.telefone}
                onChange={valor => setField('telefone', valor)}
                inputMode="numeric"
                maxLength={15}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="input-wrapper">
              <label className="input-label">Email</label>
              <input className="input-field" type="email" value={form.email} onChange={e => setField('email', e.target.value)} />
            </div>
            <div className="input-wrapper fornecedor-form-full">
              <label className="input-label">Observações</label>
              <textarea className="input-field fornecedor-textarea" value={form.observacoes} onChange={e => setField('observacoes', e.target.value)} rows={3} />
            </div>
          </div>

          {error && <div className="fornecedor-feedback fornecedor-feedback--error">{error}</div>}

          <div className="fornecedor-modal-actions">
            <button type="button" className="btn btn-ghost" onClick={tentarFechar} disabled={saving}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving || !form.nome.trim()}>
              {saving ? 'Salvando...' : fornecedor ? 'Salvar alterações' : 'Cadastrar fornecedor'}
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
