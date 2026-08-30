import { useEffect, useMemo, useState } from 'react';
import {
  Search, SlidersHorizontal, Barcode, ShoppingCart,
  Trash2, Plus, Minus, X, CheckCircle
} from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { listarProdutos } from '../services/produtos';
import { criarVenda } from '../services/vendas';
import { ApiError } from '../services/api';
import './Venda.css';

const CARD_COLORS = ['#C9A96E', '#D4AF37', '#F5F0E8', '#C0C0C0', '#A70636', '#E8A0BF', '#FFD700', '#F4A7B9', '#B8860B'];

function colorForProduto(id) {
  return CARD_COLORS[id % CARD_COLORS.length];
}

// O preço exibido/vendido é sempre o vigente para o canal (preco_canal),
// nunca o preco_venda "cru" da tabela produtos — é o que o backend usa
// para travar o preço da venda. Produto sem preço definido para o canal
// não pode ser vendido (backend responde 409), então fica fora da vitrine.
function toCartProduct(p) {
  const precoCanal = p.preco_canal?.preco_venda;
  if (precoCanal == null) return null;

  return {
    id: p.id,
    sku: p.sku || '—',
    name: p.nome,
    category: p.categoria,
    price: Number(precoCanal),
    stock: p.estoque_atual,
    color: colorForProduto(p.id),
  };
}

export default function Venda() {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [loadError, setLoadError] = useState('');

  const [search, setSearch]         = useState('');
  const [activeCategory, setCategory] = useState('Todos');
  const [cart, setCart]             = useState([]);
  const [saleSuccess, setSaleSuccess] = useState(false);
  const [saleTotal, setSaleTotal]   = useState(0);
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState('');

  const [formaPagamento, setFormaPagamento] = useState('a_vista');
  const [diasPrazo, setDiasPrazo]           = useState('30');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError('');
      try {
        const data = await listarProdutos({ canal: 'loja_fisica' });
        if (!cancelled) setProdutos(data.items.filter(p => p.ativo).map(toCartProduct).filter(Boolean));
      } catch (err) {
        if (!cancelled) setLoadError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const categories = useMemo(
    () => ['Todos', ...new Set(produtos.map(p => p.category).filter(Boolean))],
    [produtos]
  );

  /* --- Filtered products --- */
  const filtered = useMemo(() => {
    return produtos.filter(p => {
      const matchCat = activeCategory === 'Todos' || p.category === activeCategory;
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                          p.sku.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [produtos, search, activeCategory]);

  /* --- Cart operations --- */
  function addToCart(product) {
    setSaveError('');
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) return prev;
        return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { ...product, qty: 1 }];
    });
  }

  function removeFromCart(id) {
    setCart(prev => prev.filter(i => i.id !== id));
  }

  function changeQty(id, delta) {
    setCart(prev => prev
      .map(i => i.id === id ? { ...i, qty: Math.min(i.stock, Math.max(1, i.qty + delta)) } : i)
    );
  }

  function clearCart() {
    setCart([]);
    setSaveError('');
  }

  /* --- Totals (espelha o cálculo do backend: soma qty * preço vigente) --- */
  const total     = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const itemCount = cart.reduce((sum, i) => sum + i.qty, 0);

  /* --- Finalize --- */
  async function finalizeSale() {
    if (cart.length === 0 || saving) return;

    setSaving(true);
    setSaveError('');
    // Front-end validation: se venda a prazo, diasPrazo deve ser > 0
    if (formaPagamento === 'prazo') {
      const dias = Number(diasPrazo);
      if (!dias || dias < 1) {
        setSaveError('Informe um número de dias de prazo válido (>= 1).');
        setSaving(false);
        return;
      }
    }
    try {
      const venda = await criarVenda({
        canal: 'loja_fisica',
        itens: cart.map(i => ({ produto_id: i.id, quantidade: i.qty })),
        forma_pagamento: formaPagamento,
        ...(formaPagamento === 'prazo' ? { dias_prazo: Number(diasPrazo) } : {}),
      });

      setProdutos(prev => prev.map(p => {
        const item = venda.itens.find(i => i.produto_id === p.id);
        return item ? { ...p, stock: p.stock - item.quantidade } : p;
      }));

      setSaleTotal(Number(venda.total));
      setSaleSuccess(true);
      clearCart();
      setTimeout(() => setSaleSuccess(false), 2500);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Não foi possível finalizar a venda. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-content venda-page">
      {/* Success overlay */}
      {saleSuccess && (
        <div className="sale-success-overlay">
          <div className="sale-success-card">
            <div className="sale-success-icon">
              <CheckCircle size={48} strokeWidth={1.5} />
            </div>
            <h2>Venda Finalizada!</h2>
            <p>Total: {saleTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
          </div>
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Nova Venda</h1>
          <p className="page-subtitle">Selecione os produtos e finalize o atendimento</p>
        </div>
      </div>

      <div className="venda-layout">
        {/* ===== LEFT COLUMN ===== */}
        <div className="venda-products-col">
          {/* Search + filter */}
          <div className="venda-search-row">
            <div className="input-icon-wrapper venda-search-input">
              <Search size={16} className="input-icon" />
              <input
                id="venda-search"
                type="text"
                className="input-field"
                placeholder="Buscar produto ou SKU..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button className="btn btn-ghost venda-filter-btn" aria-label="Filtrar">
              <SlidersHorizontal size={16} />
            </button>
          </div>

          {/* Category pills */}
          <div className="venda-categories">
            {categories.map(cat => (
              <button
                key={cat}
                className={`category-pill ${activeCategory === cat ? 'category-pill--active' : ''}`}
                onClick={() => setCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {loading && (
            <div className="empty-state">
              <p className="text-sm text-secondary">Carregando produtos...</p>
            </div>
          )}

          {!loading && loadError && (
            <div className="empty-state">
              <div className="empty-state-title">Não foi possível carregar os produtos</div>
              <p className="text-sm text-secondary">{loadError}</p>
            </div>
          )}

          {/* Product grid */}
          {!loading && !loadError && (
            filtered.length > 0 ? (
              <div className="venda-product-grid">
                {filtered.map(p => (
                  <ProductCard key={p.id} product={p} onAddToCart={addToCart} />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon"><Search size={24} /></div>
                <div className="empty-state-title">Nenhum produto encontrado</div>
                <p className="text-sm text-secondary">Tente outro termo ou categoria</p>
              </div>
            )
          )}

          {/* Barcode button */}
          <button className="btn btn-ghost btn-full venda-barcode-btn">
            <Barcode size={18} />
            Ler código de barras
          </button>
        </div>

        {/* ===== RIGHT COLUMN — Cart ===== */}
        <div className="venda-cart-col card">
          {/* Cart header */}
          <div className="cart-header">
            <div className="cart-header-left">
              <ShoppingCart size={18} />
              <span className="cart-title">Carrinho</span>
              {itemCount > 0 && (
                <span className="cart-count">{itemCount}</span>
              )}
            </div>
            {cart.length > 0 && (
              <button className="btn btn-ghost btn-sm cart-clear-btn" onClick={clearCart}>
                <Trash2 size={14} />
                Limpar
              </button>
            )}
          </div>

          {/* Cart items */}
          <div className="cart-items">
            {cart.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <ShoppingCart size={22} />
                </div>
                <div className="empty-state-title">Carrinho vazio</div>
                <p className="text-xs text-secondary">Adicione produtos ao carrinho</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.id} className="cart-item">
                  <div
                    className="cart-item-thumb"
                    style={{ background: `linear-gradient(135deg, ${item.color}33, ${item.color}77)` }}
                  >
                    <span style={{ color: item.color, fontSize: 12, fontWeight: 800 }}>
                      {item.name.split(' ').slice(0, 2).map(w => w[0]).join('')}
                    </span>
                  </div>
                  <div className="cart-item-info">
                    <div className="cart-item-name">{item.name}</div>
                    <div className="cart-item-sku">{item.sku}</div>
                  </div>
                  <div className="cart-item-controls">
                    <button
                      className="cart-qty-btn"
                      onClick={() => item.qty === 1 ? removeFromCart(item.id) : changeQty(item.id, -1)}
                      aria-label="Diminuir quantidade"
                    >
                      <Minus size={11} strokeWidth={3} />
                    </button>
                    <span className="cart-qty">{item.qty}</span>
                    <button
                      className="cart-qty-btn"
                      onClick={() => changeQty(item.id, 1)}
                      disabled={item.qty >= item.stock}
                      aria-label="Aumentar quantidade"
                    >
                      <Plus size={11} strokeWidth={3} />
                    </button>
                  </div>
                  <div className="cart-item-price">
                    {(item.price * item.qty).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                  <button
                    className="cart-item-remove"
                    onClick={() => removeFromCart(item.id)}
                    aria-label="Remover item"
                  >
                    <X size={13} strokeWidth={2.5} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Summary */}
          <div className="cart-summary">
            {saveError && (
              <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{saveError}</p>
            )}

            {/* Forma de pagamento */}
            <div className="payment-row">
              <div className="payment-toggle-group">
                <button
                  type="button"
                  className={`payment-toggle ${formaPagamento === 'a_vista' ? 'payment-toggle--active' : ''}`}
                  onClick={() => { setFormaPagamento('a_vista'); setSaveError(''); }}
                >À vista</button>
                <button
                  type="button"
                  className={`payment-toggle ${formaPagamento === 'prazo' ? 'payment-toggle--active' : ''}`}
                  onClick={() => { setFormaPagamento('prazo'); setSaveError(''); }}
                >A prazo</button>
              </div>
              {formaPagamento === 'prazo' && (
                <div className="payment-days">
                  <label className="text-xs" htmlFor="dias-prazo">Dias de prazo</label>
                  <input
                    id="dias-prazo"
                    type="number"
                    min={1}
                    value={diasPrazo}
                    onChange={e => setDiasPrazo(e.target.value)}
                    className="payment-days-input"
                  />
                </div>
              )}
            </div>

            <div className="cart-total-row">
              <span className="cart-total-label">Total</span>
              <span className="cart-total-value">
                {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>

            <button
              className="btn btn-primary btn-full btn-lg cart-finalize-btn"
              onClick={finalizeSale}
              disabled={cart.length === 0 || saving}
              id="btn-finalizar-venda"
            >
              <CheckCircle size={18} />
              {saving ? 'Finalizando...' : 'Finalizar Venda'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
