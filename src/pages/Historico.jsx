import { useEffect, useMemo, useState } from 'react';
import { Search, Filter, Calendar } from 'lucide-react';
import { listarVendas, cancelarVenda } from '../services/vendas';
import { listarClientes } from '../services/clientes';
import { useAuth } from '../context/AuthContext';
import './Historico.css';

const STATUS_LABEL = {
  finalizada: 'Concluída',
  cancelada: 'Cancelada',
};

const CANAL_LABEL = {
  loja_fisica: 'Loja física',
  online: 'Online',
};

export default function Historico() {
  const { user } = useAuth();
  const podeCancelar = user?.role === 'admin';

  const [vendas, setVendas] = useState([]);
  const [clientesPorId, setClientesPorId] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [cancelandoId, setCancelandoId] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const [vendasData, clientesData] = await Promise.all([
          listarVendas(),
          listarClientes(),
        ]);
        if (!cancelled) {
          setVendas(vendasData.items);
          setClientesPorId(new Map(clientesData.map(c => [c.id, c.nome])));
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return vendas.filter(v => {
      const nomeCliente = (clientesPorId.get(v.cliente_id) ?? '').toLowerCase();
      return nomeCliente.includes(term) || String(v.id).includes(term);
    });
  }, [vendas, clientesPorId, search]);

  const concluidas = vendas.filter(v => v.status === 'finalizada');
  const canceladas = vendas.filter(v => v.status === 'cancelada');
  const totalRevenue = concluidas.reduce((sum, v) => sum + Number(v.total), 0);
  const ticketMedio = concluidas.length > 0 ? totalRevenue / concluidas.length : 0;

  async function handleCancelar(venda) {
    if (!window.confirm(`Cancelar a venda #${venda.id}? O estoque dos itens será estornado automaticamente.`)) return;

    setActionError('');
    setCancelandoId(venda.id);
    try {
      const vendaAtualizada = await cancelarVenda(venda.id);
      setVendas(prev => prev.map(v => (v.id === venda.id ? { ...v, status: vendaAtualizada.status } : v)));
      setActionSuccess(`Venda #${venda.id} cancelada com sucesso.`);
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setCancelandoId(null);
    }
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Histórico de Vendas</h1>
          <p className="page-subtitle">{vendas.length} vendas registradas</p>
        </div>
        <button className="btn btn-ghost">
          <Calendar size={16} />
          Este mês
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

      {/* Summary */}
      <div className="historico-summary">
        <div className="card card-padding historico-stat">
          <div className="historico-stat-label">Faturamento total</div>
          <div className="historico-stat-value">
            {totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </div>
        </div>
        <div className="card card-padding historico-stat">
          <div className="historico-stat-label">Vendas concluídas</div>
          <div className="historico-stat-value">{concluidas.length}</div>
        </div>
        <div className="card card-padding historico-stat">
          <div className="historico-stat-label">Canceladas</div>
          <div className="historico-stat-value historico-stat-value--danger">{canceladas.length}</div>
        </div>
        <div className="card card-padding historico-stat">
          <div className="historico-stat-label">Ticket médio</div>
          <div className="historico-stat-value">
            {ticketMedio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="historico-toolbar">
        <div className="input-icon-wrapper" style={{ flex: 1, maxWidth: 380 }}>
          <Search size={16} className="input-icon" />
          <input
            type="text"
            className="input-field"
            placeholder="Buscar venda ou cliente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button className="btn btn-ghost">
          <Filter size={16} />
          Filtros
        </button>
      </div>

      {loading && (
        <div className="empty-state">
          <p className="text-sm text-secondary">Carregando vendas...</p>
        </div>
      )}

      {!loading && error && (
        <div className="empty-state">
          <div className="empty-state-title">Não foi possível carregar o histórico</div>
          <p className="text-sm text-secondary">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="card">
          <table className="historico-table">
            <thead>
              <tr>
                <th>Nº Venda</th>
                <th>Data</th>
                <th>Cliente</th>
                <th>Canal</th>
                <th>Total</th>
                <th>Status</th>
                {podeCancelar && <th></th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(venda => {
                const nomeCliente = clientesPorId.get(venda.cliente_id);
                return (
                  <tr key={venda.id} className="historico-row">
                    <td>
                      <span className="historico-id">#{venda.id}</span>
                    </td>
                    <td className="historico-date">
                      {new Date(venda.data).toLocaleDateString('pt-BR')}
                    </td>
                    <td>
                      {nomeCliente ? (
                        <div className="historico-customer">
                          <div className="historico-avatar">
                            {nomeCliente.split(' ').slice(0, 2).map(w => w[0]).join('')}
                          </div>
                          {nomeCliente}
                        </div>
                      ) : (
                        <span className="text-sm text-secondary">—</span>
                      )}
                    </td>
                    <td className="historico-items">{CANAL_LABEL[venda.canal] ?? venda.canal}</td>
                    <td className="historico-total">
                      {Number(venda.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td>
                      <span className={`badge ${venda.status === 'finalizada' ? 'badge-success' : 'badge-danger'}`}>
                        {STATUS_LABEL[venda.status] ?? venda.status}
                      </span>
                    </td>
                    {podeCancelar && (
                      <td>
                        {venda.status === 'finalizada' && (
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--color-danger)' }}
                            disabled={cancelandoId === venda.id}
                            onClick={() => handleCancelar(venda)}
                          >
                            {cancelandoId === venda.id ? 'Cancelando...' : 'Cancelar'}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon"><Search size={24} /></div>
              <div className="empty-state-title">Nenhuma venda encontrada</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
