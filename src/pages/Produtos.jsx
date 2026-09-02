import { useEffect, useState } from 'react';
import { Search, Plus, Tag, Edit, Trash2 } from 'lucide-react';
import { listarProdutos, excluirProduto } from '../services/produtos';
import { useAuth } from '../context/AuthContext';
import { ACTIONS, podeExecutarAcao } from '../config/access';
import ProductModal from '../components/ProductModal';
import './Produtos.css';

const CARD_COLORS = ['#C9A96E', '#D4AF37', '#F5F0E8', '#C0C0C0', '#A70636', '#E8A0BF', '#FFD700', '#F4A7B9', '#B8860B'];

function colorForProduto(id) {
  return CARD_COLORS[id % CARD_COLORS.length];
}

export default function Produtos() {
  const { user } = useAuth();
  const podeGerenciar = podeExecutarAcao(user?.role, ACTIONS.GERENCIAR_ESTOQUE);

  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [editingProduto, setEditingProduto] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await listarProdutos({ canal: 'loja_fisica' });
        if (!cancelled) setProdutos(data.items);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const categories = ['Todos', ...new Set(produtos.map(p => p.categoria).filter(Boolean))];

  const filtered = produtos.filter(p => {
    const matchCat = activeCategory === 'Todos' || p.categoria === activeCategory;
    const term = search.toLowerCase();
    const matchSearch = p.nome.toLowerCase().includes(term) || (p.sku ?? '').toLowerCase().includes(term);
    return matchCat && matchSearch;
  });

  async function handleDelete(id) {
    if (!window.confirm('Excluir este produto?')) return;
    setActionError('');
    try {
      await excluirProduto(id);
      setProdutos(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      setActionError(err.message);
    }
  }

  function openCreateModal() {
    setModalMode('create');
    setEditingProduto(null);
    setModalOpen(true);
  }

  function openEditModal(produto) {
    setModalMode('edit');
    setEditingProduto(produto);
    setModalOpen(true);
  }

  function handleSaved(produtoSalvo) {
    setProdutos(prev => {
      if (modalMode === 'create') return [produtoSalvo, ...prev];
      return prev.map(p => (p.id === produtoSalvo.id ? produtoSalvo : p));
    });
    setModalOpen(false);
    setActionSuccess(modalMode === 'create' ? 'Produto criado com sucesso.' : 'Produto atualizado com sucesso.');
    setTimeout(() => setActionSuccess(''), 4000);
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Produtos</h1>
          <p className="page-subtitle">{produtos.length} produtos cadastrados</p>
        </div>
        {podeGerenciar && (
          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={16} />
            Novo Produto
          </button>
        )}
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

      {loading && (
        <div className="empty-state">
          <p className="text-sm text-secondary">Carregando produtos...</p>
        </div>
      )}

      {!loading && error && (
        <div className="empty-state">
          <div className="empty-state-title">Não foi possível carregar os produtos</div>
          <p className="text-sm text-secondary">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Product grid */}
          <div className="produtos-grid">
            {filtered.map(p => (
              <div key={p.id} className="produto-card card">
                <div
                  className="produto-card-image"
                  style={{ background: `linear-gradient(135deg, ${colorForProduto(p.id)}22, ${colorForProduto(p.id)}55)` }}
                >
                  <span style={{ color: colorForProduto(p.id), fontSize: 32, fontWeight: 800 }}>
                    {p.nome.split(' ').slice(0, 2).map(w => w[0]).join('')}
                  </span>
                  {p.estoque_atual <= 3 && (
                    <div className="produto-card-badge">
                      {p.estoque_atual === 0 ? (
                        <span className="badge badge-danger">Esgotado</span>
                      ) : (
                        <span className="badge badge-warning">Baixo</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="produto-card-body">
                  <div className="produto-card-top">
                    <span className="produto-sku">{p.sku || '—'}</span>
                    {p.categoria && <span className="badge badge-primary">{p.categoria}</span>}
                  </div>
                  <h3 className="produto-name">{p.nome}</h3>
                  <div className="produto-card-footer">
                    <span className="produto-price">
                      {Number(p.preco_venda).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                    {podeGerenciar && (
                      <div className="produto-actions">
                        <button className="produto-action-btn" aria-label="Editar" onClick={() => openEditModal(p)}>
                          <Edit size={14} />
                        </button>
                        <button
                          className="produto-action-btn produto-action-btn--danger"
                          aria-label="Excluir"
                          onClick={() => handleDelete(p.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="produto-stock-info">
                    <Tag size={11} style={{ color: 'var(--color-text-muted)' }} />
                    <span>{p.estoque_atual} em estoque</span>
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
        </>
      )}

      <ProductModal
        open={modalOpen}
        mode={modalMode}
        produto={editingProduto}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  );
}
