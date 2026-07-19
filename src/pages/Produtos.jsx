import { useState } from 'react';
import { Search, Plus, Tag, Edit, Trash2 } from 'lucide-react';
import { products, categories } from '../data/mockData';
import './Produtos.css';

export default function Produtos() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');

  const filtered = products.filter(p => {
    const matchCat    = activeCategory === 'Todos' || p.category === activeCategory;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Produtos</h1>
          <p className="page-subtitle">{products.length} produtos cadastrados</p>
        </div>
        <button className="btn btn-primary">
          <Plus size={16} />
          Novo Produto
        </button>
      </div>

      {/* Search & filter */}
      <div className="produtos-toolbar">
        <div className="input-icon-wrapper produtos-search">
          <Search size={16} className="input-icon" />
          <input
            type="text"
            className="input-field"
            placeholder="Buscar produto ou SKU..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="produtos-cats">
          {categories.map(cat => (
            <button
              key={cat}
              className={`category-pill ${activeCategory === cat ? 'category-pill--active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product grid */}
      <div className="produtos-grid">
        {filtered.map(p => (
          <div key={p.id} className="produto-card card">
            <div
              className="produto-card-image"
              style={{ background: `linear-gradient(135deg, ${p.color}22, ${p.color}55)` }}
            >
              <span style={{ color: p.color, fontSize: 32, fontWeight: 800 }}>
                {p.name.split(' ').slice(0, 2).map(w => w[0]).join('')}
              </span>
              {p.stock <= 3 && (
                <div className="produto-card-badge">
                  {p.stock === 0 ? (
                    <span className="badge badge-danger">Esgotado</span>
                  ) : (
                    <span className="badge badge-warning">Baixo</span>
                  )}
                </div>
              )}
            </div>
            <div className="produto-card-body">
              <div className="produto-card-top">
                <span className="produto-sku">{p.sku}</span>
                <span className="badge badge-primary">{p.category}</span>
              </div>
              <h3 className="produto-name">{p.name}</h3>
              <div className="produto-card-footer">
                <span className="produto-price">
                  {p.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
                <div className="produto-actions">
                  <button className="produto-action-btn" aria-label="Editar">
                    <Edit size={14} />
                  </button>
                  <button className="produto-action-btn produto-action-btn--danger" aria-label="Excluir">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="produto-stock-info">
                <Tag size={11} style={{ color: 'var(--color-text-muted)' }} />
                <span>{p.stock} em estoque</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon"><Tag size={24} /></div>
          <div className="empty-state-title">Nenhum produto encontrado</div>
          <p className="text-sm text-secondary">Tente outra busca ou adicione um novo produto</p>
        </div>
      )}
    </div>
  );
}
