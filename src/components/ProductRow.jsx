import { useState } from 'react';
import { Plus, Check, Package } from 'lucide-react';
import { formatarMoeda } from '../utils/mascaras';
import './ProductRow.css';

/**
 * ProductRow — Linha de produto horizontal padrão VERTUMNO (GiroOne).
 *
 * Agnóstico a segmento (semijoias, confeitaria, minimercado, eletrônicos, etc).
 * Suporta imagens com qualquer proporção sem distorção (object-fit: contain),
 * placeholders neutros executivos e alta velocidade de operação no PDV.
 */
export default function ProductRow({
  product,
  onAddToCart,
  actions,
  disabled = false,
  selected = false,
  className = '',
}) {
  const [justAdded, setJustAdded] = useState(false);
  const [imageError, setImageError] = useState(false);

  if (!product) return null;

  const name = product.name || product.nome || 'Produto sem nome';
  const sku = product.sku || '—';
  const semSku = product.semSku === true;
  const price = product.price !== undefined ? product.price : product.preco_venda;
  const stock = product.stock !== undefined ? product.stock : product.estoque_atual;
  const unidade = product.unidade || 'un';
  const category =
    product.category ||
    product.categoria ||
    (Array.isArray(product.categorias) ? product.categorias.find(c => c.nivel === 1)?.nome : null);
  const imageUrl =
    product.imageUrl ||
    product.imagem_url ||
    product.foto_url ||
    product.imagem ||
    product.foto ||
    null;

  const isNoPrice = price == null;
  const isOutOfStock = stock === 0;
  const isLowStock = stock > 0 && stock <= 3;
  const isDisabled = disabled || isOutOfStock || isNoPrice;

  // Iniciais limpas para placeholder
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase())
    .join('');

  function handleAdd(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isDisabled || !onAddToCart) return;

    onAddToCart(product);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 550);
  }

  function handleRowKeyDown(e) {
    if (onAddToCart && !isDisabled && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      handleAdd();
    }
  }

  const isClickable = Boolean(onAddToCart) && !isDisabled;

  return (
    <div
      className={`product-row ${isDisabled ? 'product-row--disabled' : ''} ${
        selected ? 'product-row--selected' : ''
      } ${justAdded ? 'product-row--added' : ''} ${
        isClickable ? 'product-row--clickable' : ''
      } ${className}`.trim()}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={isClickable ? handleAdd : undefined}
      onKeyDown={isClickable ? handleRowKeyDown : undefined}
      aria-disabled={isDisabled || undefined}
      aria-label={isClickable ? `Adicionar ${name} ao carrinho` : undefined}
    >
      {/* 1. Área de Imagem Fixa e Proporcional */}
      <div className="product-row-thumb-box" aria-hidden="true">
        {imageUrl && !imageError ? (
          <img
            src={imageUrl}
            alt=""
            className="product-row-img"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="product-row-placeholder">
            <Package size={18} className="product-row-placeholder-icon" strokeWidth={1.75} />
            <span className="product-row-placeholder-initials">{initials || 'PR'}</span>
          </div>
        )}
      </div>

      {/* 2. Informações Principais (Nome, SKU, Categoria) */}
      <div className="product-row-main">
        <div className="product-row-name-line">
          <span className="product-row-name" title={name}>
            {name}
          </span>
          {semSku && (
            <span className="product-row-pill product-row-pill--warning">
              Sem SKU
            </span>
          )}
          {isNoPrice && (
            <span className="product-row-pill product-row-pill--warning">
              Sem preço
            </span>
          )}
        </div>
        <div className="product-row-meta">
          <span className="product-row-sku">{sku}</span>
          {category && (
            <>
              <span className="product-row-meta-separator">•</span>
              <span className="product-row-category">{category}</span>
            </>
          )}
        </div>
      </div>

      {/* 3. Indicador de Estoque */}
      <div className="product-row-stock-col">
        {isOutOfStock ? (
          <span className="product-row-stock-badge product-row-stock-badge--out">
            Esgotado
          </span>
        ) : isLowStock ? (
          <span className="product-row-stock-badge product-row-stock-badge--low">
            {stock} restantes
          </span>
        ) : (
          <span className="product-row-stock-text">
            {stock !== undefined ? `${stock} ${unidade}` : '—'}
          </span>
        )}
      </div>

      {/* 4. Preço */}
      <div className="product-row-price-col">
        <span className={`product-row-price ${isNoPrice ? 'product-row-price--empty' : ''}`}>
          {isNoPrice ? '—' : formatarMoeda(price)}
        </span>
      </div>

      {/* 5. Ação (Botão Adicionar no PDV ou ações customizadas) */}
      <div className="product-row-action-col">
        {actions ? (
          <div className="product-row-custom-actions" onClick={e => e.stopPropagation()}>
            {actions}
          </div>
        ) : onAddToCart ? (
          <button
            type="button"
            className={`product-row-add-btn ${justAdded ? 'product-row-add-btn--success' : ''}`}
            disabled={isDisabled}
            onClick={handleAdd}
            aria-label={`Adicionar ${name} ao carrinho`}
            title={
              isNoPrice
                ? 'Sem preço definido para este canal'
                : isOutOfStock
                ? 'Produto esgotado'
                : 'Adicionar ao carrinho'
            }
          >
            {justAdded ? (
              <Check size={16} strokeWidth={2.5} />
            ) : (
              <Plus size={16} strokeWidth={2.5} />
            )}
            <span className="product-row-add-label">
              {justAdded ? 'Adicionado' : 'Adicionar'}
            </span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
