import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { criarCliente, atualizarCliente } from '../services/clientes';
import { useConfirmarFechamentoModal } from '../hooks/useConfirmarFechamentoModal';
import { formularioAlterado } from '../utils/formularioAlterado';
import ConfirmarDescarteDialog from './ConfirmarDescarteDialog';
import {
  aplicarMascaraTelefone,
  aplicarMascaraCpfCnpj,
  aplicarMascaraCEP,
  cpfCnpjValido,
  somenteDigitos,
} from '../utils/mascaras';
import CampoMascarado from './CampoMascarado';
import './ProductModal.css';

const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

function formVazio() {
  return {
    nome: '',
    telefone: '',
    email: '',
    cpf_cnpj: '',
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
    data_nascimento: '',
    observacoes: '',
    ativo: true,
  };
}

function formFromCliente(cliente) {
  if (!cliente) return formVazio();
  return {
    nome: cliente.nome ?? '',
    telefone: cliente.telefone ?? '',
    email: cliente.email ?? '',
    cpf_cnpj: cliente.cpf_cnpj ?? '',
    cep: cliente.cep ?? '',
    endereco: cliente.endereco ?? '',
    numero: cliente.numero ?? '',
    complemento: cliente.complemento ?? '',
    bairro: cliente.bairro ?? '',
    cidade: cliente.cidade ?? '',
    uf: cliente.uf ?? '',
    data_nascimento: cliente.data_nascimento ? String(cliente.data_nascimento).slice(0, 10) : '',
    observacoes: cliente.observacoes ?? '',
    ativo: cliente.ativo ?? true,
  };
}

export function validar(form) {
  if (!form.nome.trim()) return 'Nome é obrigatório';

  if (form.email.trim()) {
    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
    if (!emailValido) return 'Email inválido';
  }

  if (form.cpf_cnpj.trim() && !cpfCnpjValido(form.cpf_cnpj)) {
    return 'CPF/CNPJ inválido';
  }

  return '';
}

export function montarPayload(form, mode) {
  const payload = {
    nome: form.nome.trim(),
    telefone: form.telefone.trim() ? somenteDigitos(form.telefone) : undefined,
    email: form.email.trim() || undefined,
    cpf_cnpj: form.cpf_cnpj.trim() ? somenteDigitos(form.cpf_cnpj) : undefined,
    cep: form.cep.trim() ? somenteDigitos(form.cep) : undefined,
    endereco: form.endereco.trim() || undefined,
    numero: form.numero.trim() || undefined,
    complemento: form.complemento.trim() || undefined,
    bairro: form.bairro.trim() || undefined,
    cidade: form.cidade.trim() || undefined,
    uf: form.uf || undefined,
    data_nascimento: form.data_nascimento || undefined,
    observacoes: form.observacoes.trim() || undefined,
  };

  if (mode === 'edit') {
    payload.ativo = form.ativo;
  }

  return payload;
}

export default function ClienteModal({ open, mode = 'create', cliente, onClose, onSaved }) {
  const [form, setForm] = useState(formVazio);
  const [initialForm, setInitialForm] = useState(formVazio);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const dados = formFromCliente(cliente);
      setForm(dados);
      setInitialForm(dados);
      setError('');
      setSaving(false);
    }
  }, [open, cliente]);

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
      const payload = montarPayload(form, mode);
      const clienteSalvo = mode === 'create'
        ? await criarCliente(payload)
        : await atualizarCliente(cliente.id, payload);
      onSaved(clienteSalvo);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={tentarFechar}>
      <div className="modal-panel card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{mode === 'create' ? 'Novo Cliente' : 'Editar Cliente'}</h2>
          <button type="button" className="modal-close" onClick={tentarFechar} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            {error && <div className="modal-error">{error}</div>}

            <div className="modal-form-section">
              <h3 className="modal-form-section-title">Dados pessoais</h3>
              <div className="modal-form-grid">
                <div className="input-wrapper modal-form-span-2">
                  <label className="input-label" htmlFor="cm-nome">Nome completo *</label>
                  <input
                    id="cm-nome"
                    type="text"
                    className="input-field"
                    value={form.nome}
                    onChange={e => updateField('nome', e.target.value)}
                  />
                </div>

                <div className="input-wrapper">
                  <label className="input-label" htmlFor="cm-cpf-cnpj">CPF/CNPJ</label>
                  <CampoMascarado
                    id="cm-cpf-cnpj"
                    mascara={aplicarMascaraCpfCnpj}
                    value={form.cpf_cnpj}
                    onChange={valor => updateField('cpf_cnpj', valor)}
                    inputMode="numeric"
                    maxLength={18}
                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  />
                </div>

                <div className="input-wrapper">
                  <label className="input-label" htmlFor="cm-nascimento">Data de nascimento</label>
                  <input
                    id="cm-nascimento"
                    type="date"
                    className="input-field"
                    value={form.data_nascimento}
                    onChange={e => updateField('data_nascimento', e.target.value)}
                  />
                </div>

                <div className="input-wrapper">
                  <label className="input-label" htmlFor="cm-telefone">Telefone/WhatsApp</label>
                  <CampoMascarado
                    id="cm-telefone"
                    mascara={aplicarMascaraTelefone}
                    value={form.telefone}
                    onChange={valor => updateField('telefone', valor)}
                    inputMode="numeric"
                    maxLength={15}
                    placeholder="(00) 00000-0000"
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

            <div className="modal-form-section">
              <h3 className="modal-form-section-title">Endereço <span className="modal-field-hint">(opcional)</span></h3>
              <div className="modal-form-grid">
                <div className="input-wrapper">
                  <label className="input-label" htmlFor="cm-cep">CEP</label>
                  <CampoMascarado
                    id="cm-cep"
                    mascara={aplicarMascaraCEP}
                    value={form.cep}
                    onChange={valor => updateField('cep', valor)}
                    inputMode="numeric"
                    maxLength={9}
                    placeholder="00000-000"
                  />
                </div>

                <div className="input-wrapper">
                  <label className="input-label" htmlFor="cm-endereco">Endereço</label>
                  <input
                    id="cm-endereco"
                    type="text"
                    className="input-field"
                    value={form.endereco}
                    onChange={e => updateField('endereco', e.target.value)}
                  />
                </div>

                <div className="input-wrapper">
                  <label className="input-label" htmlFor="cm-numero">Número</label>
                  <input
                    id="cm-numero"
                    type="text"
                    className="input-field"
                    value={form.numero}
                    onChange={e => updateField('numero', e.target.value)}
                  />
                </div>

                <div className="input-wrapper">
                  <label className="input-label" htmlFor="cm-complemento">Complemento</label>
                  <input
                    id="cm-complemento"
                    type="text"
                    className="input-field"
                    value={form.complemento}
                    onChange={e => updateField('complemento', e.target.value)}
                  />
                </div>

                <div className="input-wrapper">
                  <label className="input-label" htmlFor="cm-bairro">Bairro</label>
                  <input
                    id="cm-bairro"
                    type="text"
                    className="input-field"
                    value={form.bairro}
                    onChange={e => updateField('bairro', e.target.value)}
                  />
                </div>

                <div className="input-wrapper">
                  <label className="input-label" htmlFor="cm-cidade">Cidade</label>
                  <input
                    id="cm-cidade"
                    type="text"
                    className="input-field"
                    value={form.cidade}
                    onChange={e => updateField('cidade', e.target.value)}
                  />
                </div>

                <div className="input-wrapper">
                  <label className="input-label" htmlFor="cm-uf">UF</label>
                  <select
                    id="cm-uf"
                    className="input-field"
                    value={form.uf}
                    onChange={e => updateField('uf', e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="modal-form-section">
              <h3 className="modal-form-section-title">Observações <span className="modal-field-hint">(opcional)</span></h3>
              <div className="modal-form-grid">
                <div className="input-wrapper modal-form-span-2">
                  <textarea
                    id="cm-observacoes"
                    className="input-field"
                    rows={3}
                    value={form.observacoes}
                    onChange={e => updateField('observacoes', e.target.value)}
                  />
                </div>

                {mode === 'edit' && (
                  <label className="modal-checkbox-wrapper modal-form-span-2">
                    <input
                      type="checkbox"
                      checked={form.ativo}
                      onChange={e => updateField('ativo', e.target.checked)}
                    />
                    Cliente ativo
                  </label>
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
