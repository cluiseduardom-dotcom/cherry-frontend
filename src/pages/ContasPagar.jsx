import { useEffect, useState } from 'react';
import { Plus, Edit, CheckCircle, Ban, AlertTriangle, ChevronLeft, ChevronRight, Wallet } from 'lucide-react';
import { listarContasPagar, marcarContaPagarComoPaga, cancelarContaPagar } from '../services/contasPagar';
import ContaPagarModal from '../components/ContaPagarModal';
import './Contas.css';

const STATUS_FILTERS = [
  { key: '', label: 'Todos' },
  { key: 'pendente', label: 'Pendente' },
  { key: 'pago', label: 'Pago' },
  { key: 'cancelado', label: 'Cancelado' },
];

const STATUS_LABEL = { pendente: 'Pendente', pago: 'Pago', cancelado: 'Cancelado' };
const STATUS_BADGE_CLASS = { pendente: 'badge-warning', pago: 'badge-success', cancelado: 'badge-danger' };

function formatCurrency(value) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(value) {
  if (!value) return '—';
  const [ano, mes, dia] = String(value).slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}

export default function ContasPagar() {
  const [contas, setContas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [workingId, setWorkingId] = useState(null);

  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [editingConta, setEditingConta] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await listarContasPagar({ page, status: statusFilter || undefined });
        if (!cancelled) {
          setContas(data.items);
          setTotalPages(data.totalPages);
          setTotal(data.total);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [page, statusFilter]);

  function handleStatusFilterChange(key) {
    setStatusFilter(key);
    setPage(1);
  }

  function openCreateModal() {
    setModalMode('create');
    setEditingConta(null);
    setModalOpen(true);
  }

  function openEditModal(conta) {
    setModalMode('edit');
    setEditingConta(conta);
    setModalOpen(true);
  }

  function handleSaved(contaSalva) {
    setContas(prev => {
      if (modalMode === 'create') return [contaSalva, ...prev];
      return prev.map(c => (c.id === contaSalva.id ? contaSalva : c));
    });
    if (modalMode === 'create') setTotal(prev => prev + 1);
    setModalOpen(false);
    setActionSuccess(modalMode === 'create' ? 'Conta a pagar criada com sucesso.' : 'Conta a pagar atualizada com sucesso.');
    setTimeout(() => setActionSuccess(''), 4000);
  }

  function aplicarAtualizacaoStatus(contaAtualizada) {
    if (statusFilter && statusFilter !== contaAtualizada.status) {
      setContas(prev => prev.filter(c => c.id !== contaAtualizada.id));
      setTotal(prev => Math.max(0, prev - 1));
      return;
    }
    setContas(prev => prev.map(c => (c.id === contaAtualizada.id ? contaAtualizada : c)));
  }

  async function handlePagar(conta) {
    if (!window.confirm(`Marcar a conta "${conta.descricao}" como paga?`)) return;

    setActionError('');
    setWorkingId(conta.id);
    try {
      const contaAtualizada = await marcarContaPagarComoPaga(conta.id);
      aplicarAtualizacaoStatus(contaAtualizada);
      setActionSuccess('Conta marcada como paga.');
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setWorkingId(null);
    }
  }

  async function handleCancelar(conta) {
    if (!window.confirm(`Cancelar a conta "${conta.descricao}"?`)) return;

    setActionError('');
    setWorkingId(conta.id);
    try {
      const contaAtualizada = await cancelarContaPagar(conta.id);
      aplicarAtualizacaoStatus(contaAtualizada);
      setActionSuccess('Conta cancelada com sucesso.');
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Contas a Pagar</h1>
          <p className="page-subtitle">{total} contas cadastradas</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <Plus size={16} />
          Nova Conta
        </button>
      </div>

      {actionError && (
        <p className="text-sm" style={{ color: 'var(--color-danger)', marginBottom: 'var(--space-3)' }}>
          {actionError}
        </p>
      )}

      {actionSuccess && (
        <p className="text-sm" style={{ color: 'var(--color-success)', marginBottom: 'var(--space-3)' }}>
          {actionSuccess}
        </p>
      )}

      <div className="contas-filters">
        <div className="contas-filter-pills">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.key}
              className={`category-pill ${statusFilter === f.key ? 'category-pill--active' : ''}`}
              onClick={() => handleStatusFilterChange(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="empty-state">
          <p className="text-sm text-secondary">Carregando contas...</p>
        </div>
      )}

      {!loading && error && (
        <div className="empty-state">
          <div className="empty-state-title">Não foi possível carregar as contas a pagar</div>
          <p className="text-sm text-secondary">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="card">
          <table className="contas-table">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Fornecedor</th>
                <th>Categoria</th>
                <th>Vencimento</th>
                <th>Valor</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {contas.map(conta => (
                <tr key={conta.id} className={`contas-row ${conta.atrasado ? 'contas-row--atrasado' : ''}`}>
                  <td className="contas-descricao">{conta.descricao}</td>
                  <td>{conta.fornecedor || '—'}</td>
                  <td>{conta.categoria ? <span className="badge badge-primary">{conta.categoria}</span> : '—'}</td>
                  <td className="contas-date">{formatDate(conta.data_vencimento)}</td>
                  <td className="contas-valor">{formatCurrency(conta.valor)}</td>
                  <td>
                    <span className={`badge ${STATUS_BADGE_CLASS[conta.status]}`}>{STATUS_LABEL[conta.status]}</span>
                    {conta.atrasado && (
                      <span className="badge badge-danger" style={{ marginLeft: 6 }}>
                        <AlertTriangle size={10} />
                        Atrasado
                      </span>
                    )}
                  </td>
                  <td>
                    {conta.status === 'pendente' && (
                      <div className="contas-actions">
                        <button
                          className="contas-action-btn"
                          aria-label="Editar"
                          title="Editar"
                          disabled={workingId === conta.id}
                          onClick={() => openEditModal(conta)}
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          className="contas-action-btn contas-action-btn--success"
                          aria-label="Marcar como paga"
                          title="Marcar como paga"
                          disabled={workingId === conta.id}
                          onClick={() => handlePagar(conta)}
                        >
                          <CheckCircle size={14} />
                        </button>
                        <button
                          className="contas-action-btn contas-action-btn--danger"
                          aria-label="Cancelar"
                          title="Cancelar"
                          disabled={workingId === conta.id}
                          onClick={() => handleCancelar(conta)}
                        >
                          <Ban size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {contas.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon"><Wallet size={24} /></div>
              <div className="empty-state-title">Nenhuma conta a pagar encontrada</div>
            </div>
          )}

          {contas.length > 0 && (
            <div className="contas-pagination">
              <span className="text-sm text-secondary">Página {page} de {totalPages}</span>
              <div className="contas-pagination-actions">
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  <ChevronLeft size={14} />
                  Anterior
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                >
                  Próxima
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <ContaPagarModal
        open={modalOpen}
        mode={modalMode}
        conta={editingConta}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  );
}
