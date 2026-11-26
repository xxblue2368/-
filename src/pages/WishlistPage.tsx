import { useEffect, useState } from 'react';
import { fetchFavoriteProducts } from '../api/favorites';
import { RequireLogin, navigate } from '../components/common/Layout';
import { ProductCard } from '../components/product/ProductCard';
import { sessionActions, useSessionStore } from '../store/useSessionStore';
import type { Product } from '../types/api';

export function WishlistPage() {
  const { user } = useSessionStore();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadFavorites = () => {
    setLoading(true);
    setError('');
    fetchFavoriteProducts()
      .then((products) => {
        setItems(products);
        sessionActions.replaceFavorites(products.map((product) => product.id));
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : '찜 목록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (user) loadFavorites();
  }, [user?.id]);

  return <RequireLogin><section className="section"><p className="eyebrow">WISHLIST</p><h1>찜한 상품</h1>{loading ? <p>찜 목록을 불러오는 중이에요…</p> : error ? <div className="empty"><h2>찜 목록을 불러오지 못했어요</h2><p>{error}</p><button onClick={loadFavorites}>다시 시도</button></div> : items.length ? <div className="product-grid">{items.map((product) => <ProductCard product={product} key={product.id} />)}</div> : <div className="empty"><h2>아직 찜한 상품이 없어요</h2><button onClick={() => navigate('/products')}>상품 보러 가기</button></div>}</section></RequireLogin>;
}
