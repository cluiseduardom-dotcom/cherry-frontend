import { useState } from 'react';
import { Plus, Check, Package } from 'lucide-react';
import FotosViewer from './FotosViewer';
import { formatarMoeda } from '../utils/mascaras';
import './ProductCard.css';

/**
 * ProductCard — card de produto com foto em destaque (grade de 2+ colunas).
 *
 * Mesmo formato de `product` do ProductRow (name/nome, sku, price, stock, unidade,
 * category/categorias, imageUrl/imagem_url...). A foto ocupa o topo do card; sem foto
 * (ou foto quebrada) aparece um placeholder neutro com as iniciais.
 *
 * - `onAddToCart`: mostra o botão "+" (PDV). O card inteiro também é clicável.
 * - `actions`: ações customizadas (Produtos), no lugar do botão "+".
 * - `rotuloEstoque`: mostra a linha "Estoque: N un" (Nova Venda).
 * - `estoqueRotulo`: troca o texto do rótulo da linha de estoque (ex.: "Saldo no local").
 * - `ocultarPreco` / `ocultarEstoque`: para telas que não têm esse dado.
 * - Tocar na foto abre o visualizador com todas as fotos do produto (sem acionar o card).
 * - `children`: conteúdo extra no rodapé (ex.: barra de estoque e status na tela Estoque).
 */
export default function ProductCard({
  product,
  onAddToCart,
  actions,
  disabled = false,
  rotuloEstoque = false,
  estoqueRotulo = 'Estoque',
  ocultarPreco = false,
  ocultarEstoque = false,
  className = '',
  children,
}) {
  const [justAdded, setJustAdded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [verFotos, setVerFotos] = useState(false);

  if (!product) return null;

  const name = product.name || product.nome || 'Produto sem nome';
  const sku = product.sku || '';
  const semSku = product.semSku === true;
  const price = product.price !== undefined ? product.price : product.preco_venda;
  const stock = product.stock !== undefined ? product.stock : product.estoque_atual;
  const unidade = product.unidade || 'un';
  const category =
    product.category ||
    product.categoria ||
    (Array.isArray(product.categorias) ? product.categorias.find(c => c.nivel === 1)?.nome : null);
  const imageUrl =
    product.imageUrl || product.imagem_url || product.foto_url || product.imagem || product.foto || null;

  const isNoPrice = !ocultarPreco && price == null;
  const isOutOfStock = stock === 0;
  const isLowStock = stock > 0 && stock <= 3;
  const isDisabled = disabled || isOutOfStock || isNoPrice;
  const isClickable = Boolean(onAddToCart) && !isDisabled;

  const initials =
    name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || 'PR';

  function handleAdd(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!isClickable) return;
    onAddToCart(product);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 550);
  }

  function handleKeyDown(e) {
    // Teclas vindas do visualizador de fotos (portal) também borbulham até aqui: só vale o card em si.
    if (e.target !== e.currentTarget) return;
    if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      handleAdd();
    }
  }

  const temFoto = Boolean(imageUrl) && !imageError;
  const produtoId = product.id;

  function abrirFotos(e) {
    e.preventDefault();
    e.stopPropagation();
    setVerFotos(true);
  }

  function fotoKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      setVerFotos(true);
    }
  }

  const badge = isNoPrice
    ? { tom: 'out', texto: 'Sem preço' }
    : isOutOfStock
      ? { tom: 'out', texto: 'Esgotado' }
      : isLowStock && !ocultarEstoque
        ? { tom: 'low', texto: `${stock} restantes` }
        : null;

  return (
    <div
      className={`product-card ${isDisabled ? 'product-card--disabled' : ''} ${
        isClickable ? 'product-card--clickable' : ''
      } ${justAdded ? 'product-card--added' : ''} ${className}`.trim()}
      role={isClickable ? 'button' : 'listitem'}
      tabIndex={isClickable ? 0 : undefined}
      onClick={isClickable ? handleAdd : undefined}
      onKeyDown={isClickable ? handleKeyDown : undefined}
      aria-disabled={isDisabled || undefined}
      aria-label={isClickable ? `Adicionar ${name} ao carrinho` : undefined}
    >
      <div
        className={`product-card-image-wrapper ${temFoto && produtoId != null ? 'product-card-image-wrapper--zoom' : ''}`}
        {...(temFoto && produtoId != null ? {
          onClick: abrirFotos,
          onKeyDown: fotoKeyDown,
          role: 'button',
          tabIndex: 0,
          'aria-label': `Ver fotos de ${name}`,
        } : {})}
      >
        {imageUrl && !imageError ? (
          <img
            src={imageUrl}
            alt={name}
            className="product-card-img"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <div
            className="product-card-img-placeholder"
            aria-hidden="true"
            style={product.color ? {
              background: `linear-gradient(135deg, ${product.color}22, ${product.color}55)`,
              color: product.color,
            } : undefined}
          >
            <Package size={26} strokeWidth={1.5} />
            <span>{initials}</span>
          </div>
        )}
        {badge && (
          <span className={`product-card-badge product-card-badge--${badge.tom}`}>{badge.texto}</span>
        )}
      </div>

      <div className="product-card-body">
        {category && <span className="product-card-category">{category}</span>}
        <h3 className="product-card-name" title={name}>{name}</h3>
        {(sku || semSku) && (
          <span className="product-card-sku">
            {semSku ? 'Sem SKU' : sku}
          </span>
        )}
        {(rotuloEstoque || estoqueRotulo !== 'Estoque') && !ocultarEstoque && stock !== undefined && (
          <span className="product-card-stock-text">
            {estoqueRotulo}: <strong>{stock} {unidade}</strong>
          </span>
        )}

        {children && <div className="product-card-extra">{children}</div>}

        {(!ocultarPreco || onAddToCart) && (
          <div className="product-card-footer">
            {!ocultarPreco && (
              <span className={`product-card-price ${isNoPrice ? 'product-card-price--empty' : ''}`}>
                {isNoPrice ? '—' : formatarMoeda(price)}
              </span>
            )}
            {!actions && onAddToCart && (
              <button
                type="button"
                className="product-card-btn"
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
                {justAdded ? <Check size={18} strokeWidth={2.5} /> : <Plus size={18} strokeWidth={2.5} />}
              </button>
            )}
          </div>
        )}

        {actions && (
          <div className="product-card-actions" onClick={e => e.stopPropagation()}>
            {actions}
          </div>
        )}
      </div>
      {verFotos && (
        <div onClick={e => e.stopPropagation()}>
          <FotosViewer
            produtoId={produtoId}
            nome={name}
            fotoInicial={imageUrl}
            onClose={() => setVerFotos(false)}
          />
        </div>
      )}
    </div>
  );
}
