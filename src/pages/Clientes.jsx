import { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Phone, Mail, Star, TrendingUp, Edit, Users, UserCheck, ShoppingBag } from 'lucide-react';
import { listarClientes, listarRankingClientes } from '../services/clientes';
import ClienteModal from '../components/ClienteModal';
import ClienteHistoricoModal from '../components/ClienteHistoricoModal';
import { aplicarMascaraTelefone, formatarMoeda, somenteDigitos } from '../utils/mascaras';
import './Clientes.css';

function mesclarComRanking(clientes, ranking) {
  const statsPorId = new Map(ranking.map(r => [r.id, r]));

  return clientes.map(c => {
    const stats = statsPorId.get(c.id);
    return {
      ...c,
      total_compras: Number(stats?.total_compras ?? 0),
      total_gasto: Number(stats?.total_gasto ?? 0),
      ticket_medio: Number(stats?.ticket_medio ?? 0),
    };
  });
}

// KPIs do hub — todos calculados sobre dados já carregados (listarClientes +
// listarRankingClientes), sem exigir nenhuma consulta nova. "Total vendido"
// é histórico completo (a API de ranking não aceita filtro de período hoje)
// — por isso não rotulamos como "no período".
export function calcularKpisClientes(clientes) {
  const lista = Array.isArray(clientes) ? clientes : [];
  return {
    total: lista.length,
    ativos: lista.filter(c => c.ativo !== false).length,
    comCompras: lista.filter(c => c.total_compras > 0).length,
    totalVendido: lista.reduce((soma, c) => soma + Number(c.total_gasto || 0), 0),
  };
}

export function filtrarClientesPorBusca(clientes, termo) {
  const lista = Array.isArray(clientes) ? clientes : [];
  const query = (termo || '').trim().toLowerCase();
  if (!query) return lista;

  const termoDigitos = somenteDigitos(query);

  return lista.filter(c => {
    const nome = (c.nome || '').toLowerCase();
    const email = (c.email || '').toLowerCase();
    if (nome.includes(query) || email.includes(query)) return true;
    if (!termoDigitos) return false;
    return somenteDigitos(c.telefone).includes(termoDigitos) || somenteDigitos(c.cpf_cnpj).includes(termoDigitos);
  });
}

export function filtrarClientesPorStatus(clientes, status) {
  const lista = Array.isArray(clientes) ? clientes : [];
  if (status === 'ativos') return lista.filter(c => c.ativo !== false);
  if (status === 'inativos') return lista.filter(c => c.ativo === false);
  return lista;
}

export function filtrarClientesPorCompras(clientes, opcao) {
  const lista = Array.isArray(clientes) ? clientes : [];
  if (opcao === 'com') return lista.filter(c => c.total_compras > 0);
  if (opcao === 'sem') return lista.filter(c => !(c.total_compras > 0));
  return lista;
}

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('ativos');
  const [comprasFiltro, setComprasFiltro] = useState('todos');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);
  const [historicoCliente, setHistoricoCliente] = useState(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [clientesData, rankingData] = await Promise.all([
        listarClientes(),
        listarRankingClientes(),
      ]);
      setClientes(mesclarComRanking(clientesData, rankingData));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const kpis = useMemo(() => calcularKpisClientes(clientes), [clientes]);

  const filtered = useMemo(() => {
    const porStatus = filtrarClientesPorStatus(clientes, statusFiltro);
    const porCompras = filtrarClientesPorCompras(porStatus, comprasFiltro);
    return filtrarClientesPorBusca(porCompras, search);
  }, [clientes, statusFiltro, comprasFiltro, search]);

  function openCreate() {
    setEditingCliente(null);
    setModalOpen(true);
  }

  function openEdit(cliente) {
    setEditingCliente(cliente);
    setModalOpen(true);
  }

  function handleSaved(clienteSalvo) {
    setClientes(prev => {
      if (!editingCliente) {
        return [{ ...clienteSalvo, total_compras: 0, total_gasto: 0, ticket_medio: 0 }, ...prev];
      }
      return prev.map(c => c.id === clienteSalvo.id ? { ...c, ...clienteSalvo } : c);
    });
    setModalOpen(false);
    setActionSuccess(editingCliente ? 'Cliente atualizado com sucesso.' : 'Cliente criado com sucesso.');
    setTimeout(() => setActionSuccess(''), 4000);
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="page-subtitle">{clientes.length} clientes cadastrados</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={16} />
          Novo Cliente
        </button>
      </div>

      {actionSuccess && (
        <p className="text-sm" style={{ color: 'var(--color-success)', marginBottom: 'var(--space-3)' }}>
          {actionSuccess}
        </p>
      )}

      {!loading && !error && (
        <div className="clientes-kpis">
          <button
            type="button"
            className={`clientes-kpi-card ${statusFiltro === 'todos' ? 'clientes-kpi-card--active' : ''}`}
            onClick={() => setStatusFiltro('todos')}
          >
            <Users size={16} />
            <div className="clientes-kpi-value">{kpis.total}</div>
            <div className="clientes-kpi-label">Total de clientes</div>
          </button>
          <button
            type="button"
            className={`clientes-kpi-card ${statusFiltro === 'ativos' ? 'clientes-kpi-card--active' : ''}`}
            onClick={() => setStatusFiltro('ativos')}
          >
            <UserCheck size={16} />
            <div className="clientes-kpi-value">{kpis.ativos}</div>
            <div className="clientes-kpi-label">Ativos</div>
          </button>
          <button
            type="button"
            className={`clientes-kpi-card ${comprasFiltro === 'com' ? 'clientes-kpi-card--active' : ''}`}
            onClick={() => setComprasFiltro(comprasFiltro === 'com' ? 'todos' : 'com')}
          >
            <ShoppingBag size={16} />
            <div className="clientes-kpi-value">{kpis.comCompras}</div>
            <div className="clientes-kpi-label">Com compras</div>
          </button>
          <div className="clientes-kpi-card" style={{ cursor: 'default' }}>
            <TrendingUp size={16} />
            <div className="clientes-kpi-value">{formatarMoeda(kpis.totalVendido)}</div>
            <div className="clientes-kpi-label">Total vendido (histórico)</div>
          </div>
        </div>
      )}

      <div className="clientes-filtros">
        <div className="input-icon-wrapper" style={{ flex: 1, minWidth: 260, maxWidth: 400 }}>
          <Search size={16} className="input-icon" />
          <input
            type="text"
            className="input-field"
            placeholder="Buscar por nome, telefone, email ou documento..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="input-field" style={{ maxWidth: 160 }} value={statusFiltro} onChange={e => setStatusFiltro(e.target.value)}>
          <option value="todos">Todos os status</option>
          <option value="ativos">Ativos</option>
          <option value="inativos">Inativos</option>
        </select>
        <select className="input-field" style={{ maxWidth: 180 }} value={comprasFiltro} onChange={e => setComprasFiltro(e.target.value)}>
          <option value="todos">Com ou sem compras</option>
          <option value="com">Com compras</option>
          <option value="sem">Sem compras</option>
        </select>
      </div>

      {loading && (
        <div className="empty-state">
          <p className="text-sm text-secondary">Carregando clientes...</p>
        </div>
      )}

      {!loading && error && (
        <div className="empty-state">
          <div className="empty-state-title">Não foi possível carregar os clientes</div>
          <p className="text-sm text-secondary">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="clientes-grid">
            {filtered.map(c => {
              const initials = c.nome.split(' ').slice(0, 2).map(w => w[0]).join('');
              const isVip = c.total_gasto >= 1000;
              const ativo = c.ativo !== false;
              return (
                <div key={c.id} className={`cliente-card card card-padding ${!ativo ? 'cliente-card--inactive' : ''}`}>
                  <div className="cliente-card-header">
                    <div className="cliente-avatar">
                      {initials}
                      {isVip && (
                        <div className="cliente-vip-badge">
                          <Star size={8} fill="currentColor" />
                        </div>
                      )}
                    </div>
                    <div className="cliente-info">
                      <div className="cliente-name">{c.nome}</div>
                      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        {isVip && <span className="badge badge-warning">VIP</span>}
                        {!ativo && <span className="badge badge-danger">Inativo</span>}
                      </div>
                    </div>
                  </div>

                  <div className="cliente-contact">
                    <div className="cliente-contact-item">
                      <Mail size={12} />
                      <span>{c.email || '—'}</span>
                    </div>
                    <div className="cliente-contact-item">
                      <Phone size={12} />
                      <span>{c.telefone ? aplicarMascaraTelefone(c.telefone) : '—'}</span>
                    </div>
                  </div>

                  <div className="cliente-stats">
                    <div className="cliente-stat">
                      <div className="cliente-stat-value">{c.total_compras}</div>
                      <div className="cliente-stat-label">Compras</div>
                    </div>
                    <div className="cliente-stat-divider" />
                    <div className="cliente-stat">
                      <div className="cliente-stat-value cliente-stat-value--price">
                        {formatarMoeda(c.total_gasto)}
                      </div>
                      <div className="cliente-stat-label">Total gasto</div>
                    </div>
                    <div className="cliente-stat-divider" />
                    <div className="cliente-stat">
                      <div className="cliente-stat-value">
                        {formatarMoeda(c.ticket_medio)}
                      </div>
                      <div className="cliente-stat-label">Ticket médio</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                    <button className="btn btn-secondary btn-full" onClick={() => setHistoricoCliente(c)}>
                      <TrendingUp size={14} />
                      Ver detalhes
                    </button>
                    <button className="btn btn-ghost" title="Editar cliente" onClick={() => openEdit(c)}>
                      <Edit size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon"><Search size={24} /></div>
              <div className="empty-state-title">Nenhum cliente encontrado</div>
              <p className="text-sm text-secondary">Ajuste a busca ou os filtros selecionados.</p>
            </div>
          )}
        </>
      )}

      <ClienteModal
        open={modalOpen}
        mode={editingCliente ? 'edit' : 'create'}
        cliente={editingCliente}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
      />

      <ClienteHistoricoModal
        open={historicoCliente !== null}
        cliente={historicoCliente}
        onClose={() => setHistoricoCliente(null)}
      />
    </div>
  );
}
