import { trackBehavior } from '../../api/events';
import { useState } from 'react';
import type { Product } from '../../types/api';
import { toggleFavorite } from '../../api/favorites';
import { getSessionVersion, sessionActions, useSessionStore } from '../../store/useSessionStore';
import { money, navigate, useNavigationDrawer } from '../common/Layout';

export function ProductCard({
  product,
  hideBrand = false,
  source = 'direct',
  recommendationRunId,
}: {
  product: Product;
  hideBrand?: boolean;
  source?: 'search' | 'direct' | 'recommendation';
  recommendationRunId?: string;
}) {
  const favored = useSessionStore((state) => state.favorites.includes(product.id));
  const user = useSessionStore((state) => state.user);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const { openLogin } = useNavigationDrawer();

  const favorite = async () => {
    if (!user) return openLogin();
    const version = getSessionVersion();
    setSaving(true);
    setError('');
    try {
      const isFavorited = await toggleFavorite(product.id, favored);
      sessionActions.setFavorite(product.id, isFavorited, version);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '찜 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };
  const openProduct = () => {
    trackBehavior({
      event_type: source === 'recommendation' ? 'recommendation_click' : 'product_click',
      event_source: source,
      article_id: product.id,
      recommendation_run_id: recommendationRunId,
    });
    navigate(`/products/${product.id}`);
  };
  return (
    <article className="product-card">
      <button className="image-button" aria-label={product.name} onClick={openProduct}>
        <img key={product.imageUrl} src={product.imageUrl} alt="" loading="lazy" decoding="async" />
      </button>
      <div className="card-copy">
        {!hideBrand && <p className="eyebrow">{product.brand}</p>}
        <button className="product-name" onClick={openProduct}>
          {product.name}
        </button>
        <div className="card-bottom">
          <strong>
            {product.price > 0
              ? `${product.isEstimatedPrice ? 'AI 예상가 ' : ''}${money(product.price)}`
              : '가격 정보 준비 중'}
          </strong>
          <button
            className="heart"
            onClick={favorite}
            disabled={saving}
            aria-label={`${product.name} 찜 ${favored ? '해제' : '추가'}`}
          >
            {favored ? '♥' : '♡'}
          </button>
        </div>
        {error && (
          <p className="notice" role="alert">
            {error}
          </p>
        )}
      </div>
    </article>
  );
}
