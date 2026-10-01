import { useEffect, useMemo, useState } from 'react';
import { Building2, Edit, Mail, Phone, Plus, Search, UserRound, X } from 'lucide-react';
import { atualizarFornecedor, listarFornecedores, removerFornecedor } from '../services/fornecedores';
import FornecedorModal from '../components/FornecedorModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useConfirmAction } from '../hooks/useConfirmAction';
import { aplicarMascaraCpfCnpj, aplicarMascaraTelefone, somenteDigitos } from '../utils/mascaras';
import './Fornecedores.css';

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

  const { acaoPendente, pedirConfirmacao, confirmar, cancelar } = useConfirmAction();

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
    // Compara também por dígitos: registros salvos antes desta mudança podem
    // ter cnpj_cpf com pontuação, os novos são normalizados (só dígitos) —
    // a busca funciona nos dois formatos independente de como o usuário digitar.
    const termoDigitos = somenteDigitos(term);
    return fornecedores.filter(f =>
      String(f.nome ?? '').toLowerCase().includes(term) ||
      String(f.contato ?? '').toLowerCase().includes(term) ||
      String(f.cnpj_cpf ?? '').toLowerCase().includes(term) ||
      (termoDigitos && somenteDigitos(f.cnpj_cpf).includes(termoDigitos))
    );
  }, [fornecedores, search]);

  function openCreate() {
    setEditing(null);
    setActionError('');
    setModalOpen(true);
  }

  function openEdit(fornecedor) {
    setEditing(fornecedor);
    setActionError('');
    setModalOpen(true);
  }

  function handleSaved(saved) {
    setFornecedores(prev => {
      if (!editing) return [saved, ...prev];
      return prev.map(item => item.id === saved.id ? saved : item);
    });
    setModalOpen(false);
    setActionSuccess(editing ? 'Fornecedor atualizado com sucesso.' : 'Fornecedor cadastrado com sucesso.');
    window.setTimeout(() => setActionSuccess(''), 4000);
  }

  function handleToggleStatus(fornecedor) {
    const ativo = fornecedor.ativo !== false;
    const action = ativo ? 'desativar' : 'reativar';

    pedirConfirmacao({
      title: ativo ? 'Desativar fornecedor' : 'Reativar fornecedor',
      message: `Deseja ${action} o fornecedor "${fornecedor.nome}"?`,
      confirmLabel: ativo ? 'Desativar' : 'Reativar',
      tone: ativo ? 'danger' : 'warning',
      execute: () => executarToggleStatus(fornecedor, ativo),
    });
  }

  async function executarToggleStatus(fornecedor, ativo) {
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

  function handleRemove(fornecedor) {
    pedirConfirmacao({
      title: 'Remover fornecedor',
      message: `Remover o fornecedor "${fornecedor.nome}"? Essa ação depende das regras de integridade do backend.`,
      confirmLabel: 'Remover',
      tone: 'danger',
      execute: () => executarRemove(fornecedor),
    });
  }

  async function executarRemove(fornecedor) {
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
                  <div><Building2 size={13} /><span>{fornecedor.cnpj_cpf ? aplicarMascaraCpfCnpj(fornecedor.cnpj_cpf) : 'Documento não informado'}</span></div>
                  <div><UserRound size={13} /><span>{fornecedor.contato || 'Contato não informado'}</span></div>
                  <div><Phone size={13} /><span>{fornecedor.telefone ? aplicarMascaraTelefone(fornecedor.telefone) : 'Telefone não informado'}</span></div>
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

      <FornecedorModal
        open={modalOpen}
        fornecedor={editing}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        open={acaoPendente !== null}
        title={acaoPendente?.title}
        message={acaoPendente?.message}
        confirmLabel={acaoPendente?.confirmLabel}
        tone={acaoPendente?.tone}
        onConfirm={confirmar}
        onCancel={cancelar}
      />
    </div>
  );
}
