import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, AlertTriangle, ChevronLeft, ChevronRight, HandCoins, Search } from 'lucide-react';
import { listarContasReceber, marcarContaReceberComoRecebida } from '../services/contasReceber';
import { listarVendas } from '../services/vendas';
import { listarClientes } from '../services/clientes';
import './Contas.css';

const STATUS_FILTERS = [
  { key: '', label: 'Todos' },
  { key: 'pendente', label: 'Pendente' },
  { key: 'recebido', label: 'Recebido' },
  { key: 'cancelado', label: 'Cancelado' },
];

const STATUS_LABEL = { pendente: 'Pendente', recebido: 'Recebido', cancelado: 'Cancelado' };
const STATUS_BADGE_CLASS = { pendente: 'badge-warning', recebido: 'badge-success', cancelado: 'badge-danger' };

function formatCurrency(value) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(value) {
  if (!value) return '—';
  const [ano, mes, dia] = String(value).slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}

// Cards de resumo precisam do total real (todos os status, todas as páginas),
// não só da página atual — GET /contas-receber pagina em até 100 itens, então
// percorremos todas as páginas para somar os valores corretamente.
async function carregarTodasContasReceber() {
  let pagina = 1;
  let totalPaginas = 1;
  let itens = [];

  do {
    const data = await listarContasReceber({ page: pagina, pageSize: 100 });
    itens = itens.concat(data.items);
    totalPaginas = data.totalPages;
    pagina += 1;
  } while (pagina <= totalPaginas);

  return itens;
}

export default function ContasReceber() {
  const [contas, setContas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [workingId, setWorkingId] = useState(null);

  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [resumoContas, setResumoContas] = useState([]);
  const [nomeClientePorVendaId, setNomeClientePorVendaId] = useState(new Map());

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await listarContasReceber({ page, status: statusFilter || undefined });
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

  // Contas a receber só guardam venda_id — resolve o nome do cliente
  // localmente juntando vendas + clientes, mesmo padrão de Historico.jsx.
  useEffect(() => {
    let cancelled = false;

    async function loadClientes() {
      try {
        const [vendasData, clientesData] = await Promise.all([listarVendas(), listarClientes()]);
        if (cancelled) return;
        const nomePorClienteId = new Map(clientesData.map(c => [c.id, c.nome]));
        setNomeClientePorVendaId(
          new Map(vendasData.items.map(v => [v.id, nomePorClienteId.get(v.cliente_id) ?? '']))
        );
      } catch {
        // Busca por cliente é um extra sobre a listagem principal — se essa
        // busca falhar, a tabela de contas a receber continua funcionando
        // normalmente (só sem nome de cliente e sem busca por nome).
      }
    }

    loadClientes();
    return () => { cancelled = true; };
  }, []);

  async function atualizarResumo() {
    try {
      setResumoContas(await carregarTodasContasReceber());
    } catch {
      // Idem: cards de resumo não bloqueiam a listagem principal se falharem.
    }
  }

  useEffect(() => {
    atualizarResumo();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return contas;
    return contas.filter(c => {
      const nomeCliente = (nomeClientePorVendaId.get(c.venda_id) ?? '').toLowerCase();
      return nomeCliente.includes(term) || String(c.id).includes(term) || String(c.venda_id).includes(term);
    });
  }, [contas, search, nomeClientePorVendaId]);

  const totalPendente = useMemo(
    () => resumoContas.filter(c => c.status === 'pendente').reduce((soma, c) => soma + Number(c.valor), 0),
    [resumoContas]
  );
  const totalRecebido = useMemo(
    () => resumoContas.filter(c => c.status === 'recebido').reduce((soma, c) => soma + Number(c.valor), 0),
    [resumoContas]
  );
  const totalCancelado = useMemo(
    () => resumoContas.filter(c => c.status === 'cancelado').reduce((soma, c) => soma + Number(c.valor), 0),
    [resumoContas]
  );
  const taxaRecebimento = useMemo(() => {
    const totalGeral = resumoContas.reduce((soma, c) => soma + Number(c.valor), 0);
    return totalGeral > 0 ? (totalRecebido / totalGeral) * 100 : 0;
  }, [resumoContas, totalRecebido]);

  function handleStatusFilterChange(key) {
    setStatusFilter(key);
    setPage(1);
  }

  async function handleReceber(conta) {
    if (!window.confirm(`Marcar a conta "${conta.descricao}" (venda #${conta.venda_id}) como recebida?`)) return;

    setActionError('');
    setWorkingId(conta.id);
    try {
      const contaAtualizada = await marcarContaReceberComoRecebida(conta.id);
      if (statusFilter && statusFilter !== contaAtualizada.status) {
        setContas(prev => prev.filter(c => c.id !== contaAtualizada.id));
        setTotal(prev => Math.max(0, prev - 1));
      } else {
        setContas(prev => prev.map(c => (c.id === contaAtualizada.id ? contaAtualizada : c)));
      }
      setActionSuccess('Conta marcada como recebida.');
      setTimeout(() => setActionSuccess(''), 4000);
      atualizarResumo();
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
          <h1 className="page-title">Contas a Receber</h1>
          <p className="page-subtitle">{total} contas cadastradas</p>
        </div>
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

      <div className="contas-summary">
        <div className="card card-padding contas-stat">
          <div className="contas-stat-label">Total Pendente</div>
          <div className="contas-stat-value">{formatCurrency(totalPendente)}</div>
        </div>
        <div className="card card-padding contas-stat">
          <div className="contas-stat-label">Total Recebido</div>
          <div className="contas-stat-value contas-stat-value--success">{formatCurrency(totalRecebido)}</div>
        </div>
        <div className="card card-padding contas-stat">
          <div className="contas-stat-label">Total Cancelado</div>
          <div className="contas-stat-value contas-stat-value--danger">{formatCurrency(totalCancelado)}</div>
        </div>
        <div className="card card-padding contas-stat">
          <div className="contas-stat-label">Taxa de Recebimento</div>
          <div className="contas-stat-value">{taxaRecebimento.toFixed(1)}%</div>
        </div>
      </div>

      <div className="contas-toolbar">
        <div className="input-icon-wrapper contas-search">
          <Search size={16} className="input-icon" />
          <input
            type="text"
            className="input-field"
            placeholder="Buscar conta ou cliente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input-field contas-status-select"
          value={statusFilter}
          onChange={e => handleStatusFilterChange(e.target.value)}
        >
          {STATUS_FILTERS.map(f => (
            <option key={f.key} value={f.key}>{f.label}</option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="empty-state">
          <p className="text-sm text-secondary">Carregando contas...</p>
        </div>
      )}

      {!loading && error && (
        <div className="empty-state">
          <div className="empty-state-title">Não foi possível carregar as contas a receber</div>
          <p className="text-sm text-secondary">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="card">
          <table className="contas-table">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Cliente</th>
                <th>Venda</th>
                <th>Vencimento</th>
                <th>Valor</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(conta => (
                <tr key={conta.id} className={`contas-row ${conta.atrasado ? 'contas-row--atrasado' : ''}`}>
                  <td className="contas-descricao">{conta.descricao}</td>
                  <td>{nomeClientePorVendaId.get(conta.venda_id) || '—'}</td>
                  <td><span className="contas-venda-id">#{conta.venda_id}</span></td>
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
                          className="contas-action-btn contas-action-btn--success"
                          aria-label="Marcar como recebida"
                          title="Marcar como recebida"
                          disabled={workingId === conta.id}
                          onClick={() => handleReceber(conta)}
                        >
                          <CheckCircle size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon"><HandCoins size={24} /></div>
              {contas.length === 0 ? (
                <div className="empty-state-title">Nenhuma conta a receber</div>
              ) : (
                <div className="empty-state-title">Nenhuma conta encontrada para essa busca</div>
              )}
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
    </div>
  );
}
