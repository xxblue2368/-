import { useState } from 'react';
import type { Product } from '../../types/api';
import { toggleFavorite } from '../../api/favorites';
import { sessionActions, useSessionStore } from '../../store/useSessionStore';
import { money, navigate } from '../common/Layout';

export function ProductCard({ product }: { product: Product }) {
  const { favorites, user } = useSessionStore();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const favored = favorites.includes(product.id);
  const favorite = async () => {
    if (!user) return navigate(`/login?returnTo=${encodeURIComponent(location.pathname)}`);
    setSaving(true);
    setError('');
    try {
      const isFavorited = await toggleFavorite(product.id, favored);
      if (isFavorited !== favored) sessionActions.toggleFavorite(product.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '찜 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };
  return <article className="product-card"><button className="image-button" onClick={() => navigate(`/products/${product.id}`)}><img src={product.imageUrl} alt={product.name} /></button><div className="card-copy"><p className="eyebrow">{product.brand}</p><button className="product-name" onClick={() => navigate(`/products/${product.id}`)}>{product.name}</button><div className="card-bottom"><strong>{money(product.price)}</strong><button className="heart" onClick={favorite} disabled={saving} aria-label={`${product.name} 찜 ${favored ? '해제' : '추가'}`}>{favored ? '♥' : '♡'}</button></div>{error && <p className="notice" role="alert">{error}</p>}</div></article>;
}
