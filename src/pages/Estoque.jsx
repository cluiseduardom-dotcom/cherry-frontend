import { useEffect, useState } from 'react';
import { Search, Plus, AlertTriangle, Package, Filter } from 'lucide-react';
import { listarProdutos } from '../services/produtos';
import { listarEstoqueBaixo } from '../services/estoque';
import './Estoque.css';

const ROW_COLORS = ['#C9A96E', '#D4AF37', '#F5F0E8', '#C0C0C0', '#A70636', '#E8A0BF', '#FFD700', '#F4A7B9', '#B8860B'];

function colorForProduto(id) {
  return ROW_COLORS[id % ROW_COLORS.length];
}

function StockBar({ value, max = 20 }) {
  const pct = Math.min(100, (value / max) * 100);
  const color = value === 0 ? 'var(--color-danger)' : value <= 3 ? 'var(--color-warning)' : 'var(--color-success)';
  return (
    <div className="stock-bar-wrapper">
      <div className="stock-bar-track">
        <div className="stock-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="stock-bar-value" style={{ color }}>{value}</span>
    </div>
  );
}

export default function Estoque() {
  const [produtos, setProdutos] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('todos');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const [produtosData, alertasData] = await Promise.all([
          listarProdutos({ canal: 'loja_fisica' }),
          listarEstoqueBaixo(),
        ]);
        if (!cancelled) {
          setProdutos(produtosData.items.filter(p => p.ativo));
          setAlertas(alertasData);
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

  const filtered = produtos.filter(p => {
    const term = search.toLowerCase();
    const matchSearch = p.nome.toLowerCase().includes(term) || (p.sku ?? '').toLowerCase().includes(term);
    const matchFilter =
      filter === 'todos' ? true :
      filter === 'baixo' ? (p.estoque_atual > 0 && p.estoque_atual <= p.estoque_minimo) :
      filter === 'esgotado' ? p.estoque_atual === 0 :
      true;
    return matchSearch && matchFilter;
  });

  const lowStockCount = alertas.filter(a => a.estoque_atual > 0).length;
  const outCount      = alertas.filter(a => a.estoque_atual === 0).length;
  const totalItems    = produtos.reduce((s, p) => s + p.estoque_atual, 0);

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Estoque</h1>
          <p className="page-subtitle">Controle de inventário e disponibilidade</p>
        </div>
        <button className="btn btn-primary">
          <Plus size={16} />
          Entrada de Estoque
        </button>
      </div>

      {/* Summary cards */}
      <div className="estoque-summary">
        <div className="estoque-summary-card card card-padding">
          <div className="estoque-summary-icon" style={{ background: 'var(--color-primary-ultra)', color: 'var(--color-primary)' }}>
            <Package size={20} />
          </div>
          <div>
            <div className="estoque-summary-value">{totalItems}</div>
            <div className="estoque-summary-label">Itens em estoque</div>
          </div>
        </div>
        <div className="estoque-summary-card card card-padding">
          <div className="estoque-summary-icon" style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning)' }}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <div className="estoque-summary-value">{lowStockCount}</div>
            <div className="estoque-summary-label">Estoque baixo</div>
          </div>
        </div>
        <div className="estoque-summary-card card card-padding">
          <div className="estoque-summary-icon" style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger)' }}>
            <Package size={20} />
          </div>
          <div>
            <div className="estoque-summary-value">{outCount}</div>
            <div className="estoque-summary-label">Esgotados</div>
          </div>
        </div>
        <div className="estoque-summary-card card card-padding">
          <div className="estoque-summary-icon" style={{ background: 'var(--color-success-light)', color: 'var(--color-success)' }}>
            <Package size={20} />
          </div>
          <div>
            <div className="estoque-summary-value">{produtos.length}</div>
            <div className="estoque-summary-label">SKUs ativos</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="estoque-filters">
        <div className="input-icon-wrapper" style={{ flex: 1, maxWidth: 360 }}>
          <Search size={16} className="input-icon" />
          <input
            type="text"
            className="input-field"
            placeholder="Buscar produto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="estoque-filter-pills">
          {[
            { key: 'todos', label: 'Todos' },
            { key: 'baixo', label: 'Estoque baixo' },
            { key: 'esgotado', label: 'Esgotados' },
          ].map(f => (
            <button
              key={f.key}
              className={`category-pill ${filter === f.key ? 'category-pill--active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="empty-state">
          <p className="text-sm text-secondary">Carregando estoque...</p>
        </div>
      )}

      {!loading && error && (
        <div className="empty-state">
          <div className="empty-state-title">Não foi possível carregar o estoque</div>
          <p className="text-sm text-secondary">{error}</p>
        </div>
      )}

      {!loading && !error && (
        /* Table */
        <div className="card">
          <table className="estoque-table">
            <thead>
              <tr>
                <th>Produto</th>
                <th>SKU</th>
                <th>Categoria</th>
                <th>Preço</th>
                <th>Estoque</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const status =
                  p.estoque_atual === 0 ? 'esgotado' :
                  p.estoque_atual <= p.estoque_minimo ? 'baixo' :
                  'ok';
                return (
                  <tr key={p.id} className={`estoque-row estoque-row--${status}`}>
                    <td>
                      <div className="estoque-product-cell">
                        <div
                          className="estoque-product-thumb"
                          style={{ background: `linear-gradient(135deg, ${colorForProduto(p.id)}33, ${colorForProduto(p.id)}66)`, color: colorForProduto(p.id) }}
                        >
                          {p.nome.split(' ').slice(0, 2).map(w => w[0]).join('')}
                        </div>
                        <span className="estoque-product-name">{p.nome}</span>
                      </div>
                    </td>
                    <td><span className="estoque-sku">{p.sku || '—'}</span></td>
                    <td>{p.categoria && <span className="badge badge-primary">{p.categoria}</span>}</td>
                    <td className="estoque-price">
                      {Number(p.preco_venda).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td><StockBar value={p.estoque_atual} /></td>
                    <td>
                      {status === 'esgotado' && <span className="badge badge-danger">Esgotado</span>}
                      {status === 'baixo'    && <span className="badge badge-warning"><AlertTriangle size={10} />Baixo</span>}
                      {status === 'ok'       && <span className="badge badge-success">Normal</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon"><Package size={24} /></div>
              <div className="empty-state-title">Nenhum produto encontrado</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
