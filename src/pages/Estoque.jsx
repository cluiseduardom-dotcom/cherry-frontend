import { useState } from 'react';
import { Search, Plus, AlertTriangle, Package, Filter } from 'lucide-react';
import { products } from '../data/mockData';
import './Estoque.css';

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
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('todos');

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'todos' ? true :
      filter === 'baixo' ? (p.stock > 0 && p.stock <= 3) :
      filter === 'esgotado' ? p.stock === 0 :
      true;
    return matchSearch && matchFilter;
  });

  const lowStockCount = products.filter(p => p.stock > 0 && p.stock <= 3).length;
  const outCount      = products.filter(p => p.stock === 0).length;
  const totalItems    = products.reduce((s, p) => s + p.stock, 0);

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
            <div className="estoque-summary-value">{products.length}</div>
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

      {/* Table */}
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
                p.stock === 0 ? 'esgotado' :
                p.stock <= 3  ? 'baixo'   :
                'ok';
              return (
                <tr key={p.id} className={`estoque-row estoque-row--${status}`}>
                  <td>
                    <div className="estoque-product-cell">
                      <div
                        className="estoque-product-thumb"
                        style={{ background: `linear-gradient(135deg, ${p.color}33, ${p.color}66)`, color: p.color }}
                      >
                        {p.name.split(' ').slice(0, 2).map(w => w[0]).join('')}
                      </div>
                      <span className="estoque-product-name">{p.name}</span>
                    </div>
                  </td>
                  <td><span className="estoque-sku">{p.sku}</span></td>
                  <td><span className="badge badge-primary">{p.category}</span></td>
                  <td className="estoque-price">
                    {p.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td><StockBar value={p.stock} /></td>
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
    </div>
  );
}
