import { h } from "preact";

export function ProductCard({ product, onMoreLikeThis }) {
  return (
    <div className="product-card-widget">
      <div className="product-card-content">
        {/* Product Image/Icon */}
        <div className="product-image-widget">
          {product.image ? (
            <img src={product.image} alt={product.title} />
          ) : (
            <div className="product-icon">🛍️</div>
          )}
        </div>

        {/* Product Info */}
        <div className="product-info-widget">
          <div className="product-title-widget">{product.title}</div>
          
          <div className="product-price-container">
            <span className="product-price-widget">${product.price.toFixed(2)}</span>
            <span className={`product-badge ${product.available ? 'badge-success' : 'badge-error'}`}>
              {product.available ? '✓ In Stock' : '✗ Out of Stock'}
            </span>
          </div>

          {/* Tags */}
          {product.tags && product.tags.length > 0 && (
            <div className="product-tags-widget">
              {product.tags.slice(0, 3).map((tag, idx) => (
                <span key={idx} className="product-tag">{tag}</span>
              ))}
            </div>
          )}

          {/* Collections */}
          {product.collections && product.collections.length > 0 && (
            <div className="product-collections-widget">
              {product.collections.slice(0, 2).map((col, idx) => (
                <span key={idx} className="product-collection">{col}</span>
              ))}
            </div>
          )}

          {/* Description */}
          {product.description && (
            <div className="product-description-widget">
              {product.description.substring(0, 80)}
              {product.description.length > 80 ? '...' : ''}
            </div>
          )}

          {/* Actions */}
          {onMoreLikeThis && (
            <button
              className="more-like-this-btn"
              onClick={() => onMoreLikeThis(product.id)}
            >
              More Like This →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProductCarousel({ products, onMoreLikeThis }) {
  if (!products || products.length === 0) {
    return null;
  }

  return (
    <div className="product-carousel-widget">
      <div className="carousel-title">Recommended Products</div>
      <div className="carousel-scroll">
        {products.map((product, idx) => (
          <ProductCard
            key={product.id || idx}
            product={product}
            onMoreLikeThis={onMoreLikeThis}
          />
        ))}
      </div>
    </div>
  );
}
