import { ShoppingCart, AlertTriangle } from 'lucide-react';
import './ProductCard.css';

function ProductImagePlaceholder({ color, name }) {
  const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('');
  return (
    <div
      className="product-card-img-placeholder"
      style={{ background: `linear-gradient(135deg, ${color}33, ${color}66)` }}
    >
      <span style={{ color }}>{initials}</span>
    </div>
  );
}

export default function ProductCard({ product, onAddToCart }) {
  const isOutOfStock = product.stock === 0;
  const isLowStock   = product.stock > 0 && product.stock <= 3;

  return (
    <div className={`product-card card ${isOutOfStock ? 'product-card--out' : ''}`}>
      <div className="product-card-image-wrapper">
        <ProductImagePlaceholder color={product.color} name={product.name} />
        {isLowStock && (
          <div className="product-card-stock-badge product-card-stock-badge--low">
            <AlertTriangle size={10} />
            {product.stock} restantes
          </div>
        )}
        {isOutOfStock && (
          <div className="product-card-stock-badge product-card-stock-badge--out">
            Esgotado
          </div>
        )}
      </div>

      <div className="product-card-body">
        <span className="product-card-sku">{product.sku}</span>
        <h3 className="product-card-name">{product.name}</h3>
        <div className="product-card-footer">
          <span className="product-card-price">
            {product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
          <button
            className="product-card-btn"
            onClick={() => onAddToCart?.(product)}
            disabled={isOutOfStock}
            aria-label={`Adicionar ${product.name} ao carrinho`}
            title={isOutOfStock ? 'Produto esgotado' : 'Adicionar ao carrinho'}
          >
            <ShoppingCart size={14} strokeWidth={2.5} />
          </button>
        </div>
        <span className="product-card-stock-text">
          {isOutOfStock
            ? 'Fora de estoque'
            : `${product.stock} em estoque`}
        </span>
      </div>
    </div>
  );
}
