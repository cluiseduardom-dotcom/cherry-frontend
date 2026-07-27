import { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Phone, Mail, Star, TrendingUp } from 'lucide-react';
import { listarClientes, listarRankingClientes } from '../services/clientes';
import ClienteModal from '../components/ClienteModal';
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

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const [clientesData, rankingData] = await Promise.all([
          listarClientes(),
          listarRankingClientes(),
        ]);
        if (!cancelled) setClientes(mesclarComRanking(clientesData, rankingData));
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
    return clientes.filter(c =>
      c.nome.toLowerCase().includes(term) ||
      (c.email ?? '').toLowerCase().includes(term)
    );
  }, [clientes, search]);

  function handleSaved(clienteSalvo) {
    setClientes(prev => [
      { ...clienteSalvo, total_compras: 0, total_gasto: 0, ticket_medio: 0 },
      ...prev,
    ]);
    setModalOpen(false);
    setActionSuccess('Cliente criado com sucesso.');
    setTimeout(() => setActionSuccess(''), 4000);
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="page-subtitle">{clientes.length} clientes cadastrados</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <Plus size={16} />
          Novo Cliente
        </button>
      </div>

      {actionSuccess && (
        <p className="text-sm" style={{ color: 'var(--color-success)', marginBottom: 'var(--space-3)' }}>
          {actionSuccess}
        </p>
      )}

      {/* Search */}
      <div className="input-icon-wrapper" style={{ maxWidth: 400, marginBottom: 'var(--space-5)' }}>
        <Search size={16} className="input-icon" />
        <input
          type="text"
          className="input-field"
          placeholder="Buscar cliente..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
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
          {/* Customer grid */}
          <div className="clientes-grid">
            {filtered.map(c => {
              const initials = c.nome.split(' ').slice(0, 2).map(w => w[0]).join('');
              const isVip = c.total_gasto >= 1000;
              return (
                <div key={c.id} className="cliente-card card card-padding">
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
                      {isVip && <span className="badge badge-warning">VIP</span>}
                    </div>
                  </div>

                  <div className="cliente-contact">
                    <div className="cliente-contact-item">
                      <Mail size={12} />
                      <span>{c.email || '—'}</span>
                    </div>
                    <div className="cliente-contact-item">
                      <Phone size={12} />
                      <span>{c.telefone || '—'}</span>
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
                        {c.total_gasto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </div>
                      <div className="cliente-stat-label">Total gasto</div>
                    </div>
                    <div className="cliente-stat-divider" />
                    <div className="cliente-stat">
                      <div className="cliente-stat-value">
                        {c.ticket_medio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </div>
                      <div className="cliente-stat-label">Ticket médio</div>
                    </div>
                  </div>

                  <button className="btn btn-secondary btn-full" style={{ marginTop: 'var(--space-3)' }}>
                    <TrendingUp size={14} />
                    Ver histórico
                  </button>
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon"><Search size={24} /></div>
              <div className="empty-state-title">Nenhum cliente encontrado</div>
            </div>
          )}
        </>
      )}

      <ClienteModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  );
}
