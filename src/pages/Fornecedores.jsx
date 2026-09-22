import { useEffect, useMemo, useState } from 'react';
import { Building2, Edit, Mail, Phone, Plus, Search, UserRound, X } from 'lucide-react';
import {
  atualizarFornecedor,
  criarFornecedor,
  listarFornecedores,
  removerFornecedor,
} from '../services/fornecedores';
import './Fornecedores.css';

const EMPTY_FORM = {
  nome: '',
  contato: '',
  telefone: '',
  email: '',
  cnpj_cpf: '',
  observacoes: '',
};

function formatDocument(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return value || '—';
}

function initials(nome) {
  return String(nome || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0].toUpperCase())
    .join('');
}

export default function Fornecedores() {
  const [fornecedores, setFornecedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await listarFornecedores({ pageSize: 100 });
      setFornecedores(data.items ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return fornecedores;
    return fornecedores.filter(f =>
      String(f.nome ?? '').toLowerCase().includes(term) ||
      String(f.contato ?? '').toLowerCase().includes(term) ||
      String(f.cnpj_cpf ?? '').toLowerCase().includes(term)
    );
  }, [fornecedores, search]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setActionError('');
    setModalOpen(true);
  }

  function openEdit(fornecedor) {
    setEditing(fornecedor);
    setForm({
      nome: fornecedor.nome ?? '',
      contato: fornecedor.contato ?? '',
      telefone: fornecedor.telefone ?? '',
      email: fornecedor.email ?? '',
      cnpj_cpf: fornecedor.cnpj_cpf ?? '',
      observacoes: fornecedor.observacoes ?? '',
    });
    setActionError('');
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
  }

  function setField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setActionError('');
    try {
      const payload = {
        nome: form.nome.trim(),
        contato: form.contato.trim() || undefined,
        telefone: form.telefone.trim() || undefined,
        email: form.email.trim() || undefined,
        cnpj_cpf: form.cnpj_cpf.trim() || undefined,
        observacoes: form.observacoes.trim() || undefined,
      };

      const saved = editing
        ? await atualizarFornecedor(editing.id, payload)
        : await criarFornecedor(payload);

      setFornecedores(prev => {
        if (!editing) return [saved, ...prev];
        return prev.map(item => item.id === saved.id ? saved : item);
      });

      setModalOpen(false);
      setActionSuccess(editing ? 'Fornecedor atualizado com sucesso.' : 'Fornecedor cadastrado com sucesso.');
      window.setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(fornecedor) {
    const ativo = fornecedor.ativo !== false;
    const action = ativo ? 'desativar' : 'reativar';

    if (!window.confirm(`Deseja ${action} o fornecedor "${fornecedor.nome}"?`)) return;

    setActionError('');
    try {
      const updated = await atualizarFornecedor(fornecedor.id, { ativo: !ativo });
      setFornecedores(prev => prev.map(item => item.id === updated.id ? updated : item));
      setActionSuccess(ativo ? 'Fornecedor desativado.' : 'Fornecedor reativado.');
      window.setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      setActionError(err.message);
    }
  }

  async function handleRemove(fornecedor) {
    if (!window.confirm(`Remover o fornecedor "${fornecedor.nome}"? Essa ação depende das regras de integridade do backend.`)) return;

    setActionError('');
    try {
      await removerFornecedor(fornecedor.id);
      setFornecedores(prev => prev.filter(item => item.id !== fornecedor.id));
      setActionSuccess('Fornecedor removido.');
      window.setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      setActionError(err.message);
    }
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Fornecedores</h1>
          <p className="page-subtitle">{fornecedores.length} fornecedores cadastrados</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={16} />
          Novo Fornecedor
        </button>
      </div>

      {actionError && <div className="fornecedor-feedback fornecedor-feedback--error">{actionError}</div>}
      {actionSuccess && <div className="fornecedor-feedback fornecedor-feedback--success">{actionSuccess}</div>}

      <div className="fornecedores-toolbar">
        <div className="input-icon-wrapper fornecedores-search">
          <Search size={16} className="input-icon" />
          <input
            className="input-field"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar fornecedor, contato ou CNPJ/CPF..."
          />
        </div>
      </div>

      {loading && <div className="empty-state"><p className="text-sm text-secondary">Carregando fornecedores...</p></div>}

      {!loading && error && (
        <div className="empty-state">
          <div className="empty-state-title">Não foi possível carregar os fornecedores</div>
          <p className="text-sm text-secondary">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="fornecedores-grid">
          {filtered.map(fornecedor => {
            const ativo = fornecedor.ativo !== false;
            return (
              <div key={fornecedor.id} className={`fornecedor-card card card-padding ${!ativo ? 'fornecedor-card--inactive' : ''}`}>
                <div className="fornecedor-card-header">
                  <div className="fornecedor-avatar">{initials(fornecedor.nome)}</div>
                  <div className="fornecedor-card-title">
                    <div className="fornecedor-name">{fornecedor.nome}</div>
                    <span className={`badge ${ativo ? 'badge-success' : 'badge-danger'}`}>
                      {ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>

                <div className="fornecedor-details">
                  <div><Building2 size={13} /><span>{formatDocument(fornecedor.cnpj_cpf)}</span></div>
                  <div><UserRound size={13} /><span>{fornecedor.contato || 'Contato não informado'}</span></div>
                  <div><Phone size={13} /><span>{fornecedor.telefone || 'Telefone não informado'}</span></div>
                  <div><Mail size={13} /><span>{fornecedor.email || 'Email não informado'}</span></div>
                </div>

                {fornecedor.observacoes && (
                  <div className="fornecedor-observacoes">{fornecedor.observacoes}</div>
                )}

                <div className="fornecedor-actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => openEdit(fornecedor)}>
                    <Edit size={14} />
                    Editar
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleToggleStatus(fornecedor)}>
                    {ativo ? 'Desativar' : 'Reativar'}
                  </button>
                  <button className="fornecedor-remove" onClick={() => handleRemove(fornecedor)} aria-label="Remover fornecedor">
                    <X size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon"><Search size={24} /></div>
          <div className="empty-state-title">Nenhum fornecedor encontrado</div>
          <p className="text-sm text-secondary">Cadastre o primeiro fornecedor para começar a estruturar as compras.</p>
        </div>
      )}

      {modalOpen && (
        <div className="fornecedor-modal-backdrop" role="presentation" onMouseDown={closeModal}>
          <div className="fornecedor-modal card" role="dialog" aria-modal="true" aria-labelledby="fornecedor-modal-title" onMouseDown={e => e.stopPropagation()}>
            <div className="fornecedor-modal-header">
              <div>
                <h2 id="fornecedor-modal-title">{editing ? 'Editar fornecedor' : 'Novo fornecedor'}</h2>
                <p>Os dados serão usados também no fluxo de compras.</p>
              </div>
              <button className="fornecedor-modal-close" onClick={closeModal} aria-label="Fechar"><X size={18} /></button>
            </div>

            <form onSubmit={handleSave}>
              <div className="fornecedor-form-grid">
                <div className="input-wrapper fornecedor-form-full">
                  <label className="input-label">Nome / Razão social *</label>
                  <input className="input-field" value={form.nome} onChange={e => setField('nome', e.target.value)} required maxLength={200} />
                </div>
                <div className="input-wrapper">
                  <label className="input-label">CNPJ / CPF</label>
                  <input className="input-field" value={form.cnpj_cpf} onChange={e => setField('cnpj_cpf', e.target.value)} inputMode="numeric" />
                </div>
                <div className="input-wrapper">
                  <label className="input-label">Contato</label>
                  <input className="input-field" value={form.contato} onChange={e => setField('contato', e.target.value)} />
                </div>
                <div className="input-wrapper">
                  <label className="input-label">Telefone</label>
                  <input className="input-field" value={form.telefone} onChange={e => setField('telefone', e.target.value)} />
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

              {actionError && <div className="fornecedor-feedback fornecedor-feedback--error">{actionError}</div>}

              <div className="fornecedor-modal-actions">
                <button type="button" className="btn btn-ghost" onClick={closeModal} disabled={saving}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving || !form.nome.trim()}>
                  {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Cadastrar fornecedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
