import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search, SlidersHorizontal, Barcode, ShoppingCart,
  Trash2, Plus, Minus, X, CheckCircle, Layers, ChevronDown, ChevronUp
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
// fica visível na vitrine (price: null) mas não pode ser adicionado ao
// carrinho — ProductCard desabilita o botão nesse caso.
export function toCartProduct(p) {
  const precoCanal = p.preco_canal?.preco_venda;
  // Filtro de pills usa o nível 1 da categorização estruturada (família, na Cherry)
  // como agrupamento — mesmo papel que o antigo campo texto-livre `categoria` cumpria.
  const categoriaNivel1 = p.categorias?.find(c => c.nivel === 1)?.nome;

  return {
    id: p.id,
    sku: p.sku || '—',
    name: p.nome,
    category: categoriaNivel1,
    price: precoCanal == null ? null : Number(precoCanal),
    stock: p.estoque_atual,
    color: colorForProduto(p.id),
  };
}

/* --- Kit draft (montagem de kit) — lógica pura, testável isoladamente --- */

// "Confirmar kit" exige 2+ componentes DISTINTOS: o backend conta linhas por
// kit_id (não soma de quantidade) e exige 2+ linhas; como cada componente
// distinto gera sua própria linha no payload (ver buildVendaItens), um kit
// de um único produto nunca teria 2 linhas, mesmo com quantidade alta.
export function canConfirmKit(kitDraft) {
  return kitDraft.length >= 2;
}

export function addToKitDraft(kitDraft, product) {
  if (product.price == null) return kitDraft;
  const existing = kitDraft.find(i => i.id === product.id);
  if (existing) {
    if (existing.qty >= product.stock) return kitDraft;
    return kitDraft.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
  }
  return [...kitDraft, { ...product, qty: 1 }];
}

export function changeKitDraftQty(kitDraft, id, delta) {
  return kitDraft.map(i => i.id === id ? { ...i, qty: Math.min(i.stock, Math.max(1, i.qty + delta)) } : i);
}

export function removeFromKitDraft(kitDraft, id) {
  return kitDraft.filter(i => i.id !== id);
}

/* --- Payload da venda: agrupa linhas do carrinho em itens da API --- */
export function buildVendaItens(cart) {
  const itens = [];
  let nextKitId = 1;

  for (const row of cart) {
    if (row.type === 'kit') {
      const kitId = nextKitId++;
      for (const component of row.components) {
        itens.push({ produto_id: component.id, quantidade: component.qty, kit_id: kitId });
      }
    } else {
      itens.push({ produto_id: row.id, quantidade: row.qty });
    }
  }

  return itens;
}

/* --- Baixa de estoque local pós-venda: soma TODAS as ocorrências do
   produto na venda (pode aparecer avulso e dentro de kit(s) ao mesmo
   tempo), não só a primeira --- */
export function reduceEstoqueAposVenda(produtos, itensVenda) {
  return produtos.map(p => {
    const quantidadeVendida = itensVenda
      .filter(i => i.produto_id === p.id)
      .reduce((sum, i) => sum + i.quantidade, 0);
    return quantidadeVendida > 0 ? { ...p, stock: p.stock - quantidadeVendida } : p;
  });
}

function rowTotal(row) {
  return row.type === 'kit'
    ? row.components.reduce((sum, c) => sum + c.price * c.qty, 0)
    : row.price * row.qty;
}

function rowQtyCount(row) {
  return row.type === 'kit'
    ? row.components.reduce((sum, c) => sum + c.qty, 0)
    : row.qty;
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
  const [mesesPrazo, setMesesPrazo]         = useState('1');

  const [kitMode, setKitMode]   = useState(false);
  const [kitDraft, setKitDraft] = useState([]);
  const kitKeyCounterRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError('');
      try {
        const data = await listarProdutos({ canal: 'loja_fisica' });
        if (!cancelled) setProdutos(data.items.filter(p => p.ativo).map(toCartProduct));
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

  /* --- Cart operations (itens avulsos) --- */
  function addToCart(product) {
    if (product.price == null) return;
    setSaveError('');
    setCart(prev => {
      const existing = prev.find(i => i.type === 'avulso' && i.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) return prev;
        return prev.map(i => i.type === 'avulso' && i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { type: 'avulso', ...product, qty: 1 }];
    });
  }

  function removeFromCart(id) {
    setCart(prev => prev.filter(i => !(i.type === 'avulso' && i.id === id)));
  }

  function changeQty(id, delta) {
    setCart(prev => prev
      .map(i => i.type === 'avulso' && i.id === id ? { ...i, qty: Math.min(i.stock, Math.max(1, i.qty + delta)) } : i)
    );
  }

  function clearCart() {
    setCart([]);
    setSaveError('');
  }

  /* --- Modo kit --- */
  function handleProductClick(product) {
    if (kitMode) {
      setKitDraft(prev => addToKitDraft(prev, product));
    } else {
      addToCart(product);
    }
  }

  function startKitMode() {
    setKitMode(true);
    setKitDraft([]);
  }

  function cancelKitMode() {
    setKitMode(false);
    setKitDraft([]);
  }

  function confirmKit() {
    if (!canConfirmKit(kitDraft)) return;
    kitKeyCounterRef.current += 1;
    setCart(prev => [...prev, {
      type: 'kit',
      kitKey: `kit-${kitKeyCounterRef.current}`,
      components: kitDraft,
      expanded: false,
    }]);
    setKitMode(false);
    setKitDraft([]);
  }

  function removeKitFromCart(kitKey) {
    setCart(prev => prev.filter(row => row.kitKey !== kitKey));
  }

  function toggleKitExpanded(kitKey) {
    setCart(prev => prev.map(row => row.type === 'kit' && row.kitKey === kitKey ? { ...row, expanded: !row.expanded } : row));
  }

  /* --- Totals (espelha o cálculo do backend: soma qty * preço vigente) --- */
  const total     = cart.reduce((sum, row) => sum + rowTotal(row), 0);
  const itemCount = cart.reduce((sum, row) => sum + rowQtyCount(row), 0);

  const kitDraftTotal    = kitDraft.reduce((sum, i) => sum + i.price * i.qty, 0);
  const kitDraftQtyCount = kitDraft.reduce((sum, i) => sum + i.qty, 0);

  /* --- Finalize --- */
  async function finalizeSale() {
    if (cart.length === 0 || saving) return;

    setSaving(true);
    setSaveError('');
    // Front-end validation: se venda a prazo, mesesPrazo deve ser > 0
    if (formaPagamento === 'prazo') {
      const meses = Number(mesesPrazo);
      if (!Number.isInteger(meses) || meses < 1) {
        setSaveError('Informe um número de meses de prazo válido (>= 1).');
        setSaving(false);
        return;
      }
    }
    try {
      const venda = await criarVenda({
        canal: 'loja_fisica',
        itens: buildVendaItens(cart),
        forma_pagamento: formaPagamento,
        ...(formaPagamento === 'prazo' ? { meses_prazo: Number(mesesPrazo) } : {}),
      });

      setProdutos(prev => reduceEstoqueAposVenda(prev, venda.itens));

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

          {kitMode && (
            <div className="kit-mode-banner">
              <Layers size={14} />
              Modo kit: clique nos produtos para adicionar ao kit
            </div>
          )}

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
                  <ProductCard key={p.id} product={p} onAddToCart={handleProductClick} />
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
              <span className="cart-title">{kitMode ? 'Montando kit' : 'Carrinho'}</span>
              {!kitMode && itemCount > 0 && (
                <span className="cart-count">{itemCount}</span>
              )}
            </div>
            {!kitMode && (
              <div className="cart-header-actions">
                <button className="btn btn-ghost btn-sm cart-kit-btn" onClick={startKitMode}>
                  <Layers size={14} />
                  Montar kit
                </button>
                {cart.length > 0 && (
                  <button className="btn btn-ghost btn-sm cart-clear-btn" onClick={clearCart}>
                    <Trash2 size={14} />
                    Limpar
                  </button>
                )}
              </div>
            )}
          </div>

          {kitMode ? (
            <>
              {/* Kit draft items */}
              <div className="cart-items">
                {kitDraft.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon"><Layers size={22} /></div>
                    <div className="empty-state-title">Nenhum componente ainda</div>
                    <p className="text-xs text-secondary">Clique nos produtos da vitrine para montar o kit</p>
                  </div>
                ) : (
                  kitDraft.map(item => (
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
                          onClick={() => setKitDraft(prev => item.qty === 1
                            ? removeFromKitDraft(prev, item.id)
                            : changeKitDraftQty(prev, item.id, -1))}
                          aria-label="Diminuir quantidade"
                        >
                          <Minus size={11} strokeWidth={3} />
                        </button>
                        <span className="cart-qty">{item.qty}</span>
                        <button
                          className="cart-qty-btn"
                          onClick={() => setKitDraft(prev => changeKitDraftQty(prev, item.id, 1))}
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
                        onClick={() => setKitDraft(prev => removeFromKitDraft(prev, item.id))}
                        aria-label="Remover componente"
                      >
                        <X size={13} strokeWidth={2.5} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Kit draft summary */}
              <div className="cart-summary">
                <div className="cart-total-row">
                  <span className="cart-total-label">Total do kit ({kitDraftQtyCount} itens)</span>
                  <span className="cart-total-value">
                    {kitDraftTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
                <div className="kit-draft-actions">
                  <button className="btn btn-ghost" onClick={cancelKitMode}>
                    Cancelar
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={confirmKit}
                    disabled={!canConfirmKit(kitDraft)}
                  >
                    Confirmar kit
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
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
                  cart.map(row => row.type === 'kit' ? (
                    <div key={row.kitKey} className="cart-item cart-item--kit">
                      <div className="cart-item-kit-header">
                        <div className="cart-item-thumb cart-item-thumb--kit">
                          <Layers size={16} />
                        </div>
                        <div className="cart-item-info">
                          <div className="cart-item-name">Kit ({rowQtyCount(row)} itens)</div>
                          <button
                            className="cart-kit-toggle"
                            onClick={() => toggleKitExpanded(row.kitKey)}
                          >
                            {row.expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            {row.expanded ? 'Ocultar itens' : 'Ver itens'}
                          </button>
                        </div>
                        <div className="cart-item-price">
                          {rowTotal(row).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                        <button
                          className="cart-item-remove"
                          onClick={() => removeKitFromCart(row.kitKey)}
                          aria-label="Remover kit"
                        >
                          <X size={13} strokeWidth={2.5} />
                        </button>
                      </div>
                      {row.expanded && (
                        <div className="cart-kit-components">
                          {row.components.map(c => (
                            <div key={c.id} className="cart-kit-component">
                              <span className="cart-kit-component-name">{c.name}</span>
                              <span className="cart-kit-component-qty">x{c.qty}</span>
                              <span className="cart-kit-component-price">
                                {(c.price * c.qty).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div key={row.id} className="cart-item">
                      <div
                        className="cart-item-thumb"
                        style={{ background: `linear-gradient(135deg, ${row.color}33, ${row.color}77)` }}
                      >
                        <span style={{ color: row.color, fontSize: 12, fontWeight: 800 }}>
                          {row.name.split(' ').slice(0, 2).map(w => w[0]).join('')}
                        </span>
                      </div>
                      <div className="cart-item-info">
                        <div className="cart-item-name">{row.name}</div>
                        <div className="cart-item-sku">{row.sku}</div>
                      </div>
                      <div className="cart-item-controls">
                        <button
                          className="cart-qty-btn"
                          onClick={() => row.qty === 1 ? removeFromCart(row.id) : changeQty(row.id, -1)}
                          aria-label="Diminuir quantidade"
                        >
                          <Minus size={11} strokeWidth={3} />
                        </button>
                        <span className="cart-qty">{row.qty}</span>
                        <button
                          className="cart-qty-btn"
                          onClick={() => changeQty(row.id, 1)}
                          disabled={row.qty >= row.stock}
                          aria-label="Aumentar quantidade"
                        >
                          <Plus size={11} strokeWidth={3} />
                        </button>
                      </div>
                      <div className="cart-item-price">
                        {(row.price * row.qty).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </div>
                      <button
                        className="cart-item-remove"
                        onClick={() => removeFromCart(row.id)}
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
                      <label className="text-xs" htmlFor="meses-prazo">Meses de prazo</label>
                      <input
                        id="meses-prazo"
                        type="number"
                        min={1}
                        step={1}
                        value={mesesPrazo}
                        onChange={e => setMesesPrazo(e.target.value)}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
