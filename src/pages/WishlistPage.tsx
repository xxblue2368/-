import { useEffect, useState } from 'react';
import { fetchFavoriteIds, fetchFavoriteProducts } from '../api/favorites';
import { RequireLogin, navigate } from '../components/common/Layout';
import { ProductCard } from '../components/product/ProductCard';
import {
  getFavoritesRevision,
  getSessionVersion,
  sessionActions,
  useSessionStore,
} from '../store/useSessionStore';
import type { Product } from '../types/api';

export function WishlistPage() {
  const user = useSessionStore((state) => state.user);
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unavailableIds, setUnavailableIds] = useState<string[]>([]);

  const favorites = useSessionStore((state) => state.favorites);
  const [retry, setRetry] = useState(0);
  const loadFavorites = () => setRetry((value) => value + 1);
  useEffect(() => {
    const controller = new AbortController();
    const version = getSessionVersion();
    const revision = getFavoritesRevision();
    setItems([]);
    setError('');
    setUnavailableIds([]);
    setLoading(Boolean(user));
    if (!user) return () => controller.abort();
    fetchFavoriteIds(controller.signal)
      .then(async (ids) => {
        if (controller.signal.aborted || version !== getSessionVersion()) return;
        sessionActions.replaceFavorites(ids, version, revision);
        const products = await fetchFavoriteProducts(ids, controller.signal);
        if (controller.signal.aborted || version !== getSessionVersion()) return;
        setItems(products);
        const loadedIds = new Set(products.map(({ id }) => id));
        setUnavailableIds(ids.filter((id) => !loadedIds.has(id)));
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : '찜 목록을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [user?.id, retry]);
  const visibleItems = items.filter((product) => favorites.includes(product.id));
  const unavailableCount = unavailableIds.filter((id) => favorites.includes(id)).length;

  return (
    <RequireLogin>
      <section className="section">
        <p className="eyebrow">WISHLIST</p>
        <h1>찜한 상품</h1>
        {!loading && unavailableCount > 0 && (
          <div className="notice" role="status">
            <p>
              찜한 상품 {unavailableCount}개의 정보를 불러오지 못했어요. 찜 상태는 저장돼 있어요.
            </p>
            <button type="button" className="text-button" onClick={loadFavorites}>
              다시 시도
            </button>
          </div>
        )}
        {loading ? (
          <p>찜 목록을 불러오는 중이에요…</p>
        ) : error ? (
          <div className="empty">
            <h2>찜 목록을 불러오지 못했어요</h2>
            <p>{error}</p>
            <button onClick={loadFavorites}>다시 시도</button>
          </div>
        ) : visibleItems.length ? (
          <div className="product-grid">
            {visibleItems.map((product) => (
              <ProductCard product={product} key={product.id} />
            ))}
          </div>
        ) : unavailableCount === 0 ? (
          <div className="empty">
            <h2>아직 찜한 상품이 없어요</h2>
            <button onClick={() => navigate('/products')}>상품 보러 가기</button>
          </div>
        ) : null}
      </section>
    </RequireLogin>
  );
}
