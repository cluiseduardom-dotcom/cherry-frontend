import { useState, useMemo } from 'react';
import {
  Search, SlidersHorizontal, Barcode, ShoppingCart,
  Trash2, Plus, Minus, X, CheckCircle, Pencil, Tag
} from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { products as allProducts, categories } from '../data/mockData';
import './Venda.css';

export default function Venda() {
  const [search, setSearch]         = useState('');
  const [activeCategory, setCategory] = useState('Todos');
  const [cart, setCart]             = useState([]);
  const [discount, setDiscount]     = useState(0);
  const [editingDiscount, setEditingDiscount] = useState(false);
  const [discountInput, setDiscountInput] = useState('');
  const [saleSuccess, setSaleSuccess] = useState(false);

  /* --- Filtered products --- */
  const filtered = useMemo(() => {
    return allProducts.filter(p => {
      const matchCat = activeCategory === 'Todos' || p.category === activeCategory;
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                          p.sku.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [search, activeCategory]);

  /* --- Cart operations --- */
  function addToCart(product) {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
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
      .map(i => i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i)
    );
  }

  function clearCart() {
    setCart([]);
    setDiscount(0);
  }

  /* --- Totals --- */
  const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const total    = Math.max(0, subtotal - discount);
  const itemCount = cart.reduce((sum, i) => sum + i.qty, 0);

  /* --- Finalize --- */
  function finalizeSale() {
    if (cart.length === 0) return;
    setSaleSuccess(true);
    setTimeout(() => {
      setSaleSuccess(false);
      clearCart();
    }, 2500);
  }

  /* --- Discount --- */
  function applyDiscount() {
    const val = parseFloat(discountInput.replace(',', '.')) || 0;
    setDiscount(val);
    setEditingDiscount(false);
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
            <p>Total: {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
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

          {/* Product grid */}
          {filtered.length > 0 ? (
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
            <div className="cart-summary-row">
              <span className="cart-summary-label">Subtotal</span>
              <span className="cart-summary-value">
                {subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>

            <div className="cart-summary-row">
              <span className="cart-summary-label">
                <Tag size={13} />
                Desconto
                {!editingDiscount && (
                  <button
                    className="cart-discount-edit-btn"
                    onClick={() => { setEditingDiscount(true); setDiscountInput(discount > 0 ? String(discount) : ''); }}
                    aria-label="Editar desconto"
                  >
                    <Pencil size={12} />
                  </button>
                )}
              </span>
              {editingDiscount ? (
                <div className="cart-discount-input-row">
                  <span className="cart-discount-prefix">R$</span>
                  <input
                    type="number"
                    className="cart-discount-input"
                    value={discountInput}
                    onChange={e => setDiscountInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && applyDiscount()}
                    autoFocus
                    min="0"
                    placeholder="0,00"
                  />
                  <button className="btn btn-primary btn-sm" onClick={applyDiscount}>OK</button>
                </div>
              ) : (
                <span className="cart-summary-value cart-discount-value">
                  {discount > 0
                    ? `- ${discount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
                    : '—'}
                </span>
              )}
            </div>

            <div className="cart-divider" />

            <div className="cart-total-row">
              <span className="cart-total-label">Total</span>
              <span className="cart-total-value">
                {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>

            <button
              className="btn btn-primary btn-full btn-lg cart-finalize-btn"
              onClick={finalizeSale}
              disabled={cart.length === 0}
              id="btn-finalizar-venda"
            >
              <CheckCircle size={18} />
              Finalizar Venda
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
