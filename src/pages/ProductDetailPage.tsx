import { useEffect, useState } from 'react';
import { fetchProduct } from '../api/products';
import { toggleFavorite } from '../api/favorites';
import { money, navigate } from '../components/common/Layout';
import { sessionActions, useSessionStore } from '../store/useSessionStore';

export function ProductDetailPage({ id }: { id: string }) {
  const [product, setProduct] = useState<Awaited<ReturnType<typeof fetchProduct>>>(null);
  const [loading, setLoading] = useState(true);
  const { favorites, user } = useSessionStore();
  const [color, setColor] = useState('');
  const [size, setSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchProduct(id)
      .then((value) => {
        if (!active) return;
        setProduct(value);
        setColor(value?.colors[0] ?? '');
      })
      .catch((cause) => setNotice(cause instanceof Error ? cause.message : '상품을 불러오지 못했습니다.'))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  if (loading) return <section className="empty"><p>상품을 불러오는 중이에요…</p></section>;
  if (!product) return <section className="empty"><h1>상품을 찾을 수 없어요</h1><button onClick={() => navigate('/products')}>상품 목록으로</button></section>;

  const categoryPath = [product.categoryPath?.major?.label, product.categoryPath?.middle?.label, product.categoryPath?.minor?.label].filter(Boolean);
  const requireLogin = () => {
    if (!user) { navigate(`/login?returnTo=${encodeURIComponent(location.pathname)}`); return false; }
    return true;
  };
  const add = () => {
    if (!requireLogin()) return;
    if (!size) return setNotice('사이즈를 선택해 주세요.');
    sessionActions.addToCart({ productId: product.id, color, size, quantity });
    setNotice('장바구니에 담았어요.');
  };
  const favorite = async () => {
    if (!requireLogin()) return;
    try {
      const currentlyFavorited = favorites.includes(product.id);
      const isFavorited = await toggleFavorite(product.id, currentlyFavorited);
      if (isFavorited !== currentlyFavorited) sessionActions.toggleFavorite(product.id);
      setNotice(isFavorited ? '찜 목록에 저장했어요.' : '찜 목록에서 삭제했어요.');
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : '찜 저장에 실패했습니다.');
    }
  };

  return (
    <section className="detail">
      <div className="detail-image"><img src={product.imageUrl} alt={product.name} /></div>
      <div className="detail-copy">
        {categoryPath.length > 0 && <nav className="product-category-path" aria-label="상품 카테고리">
          {categoryPath.map((label, index) => <span key={`${label}-${index}`}>{index > 0 && <span className="category-separator" aria-hidden="true">›</span>}{label}</span>)}
        </nav>}
        <p className="eyebrow">{product.brand} · {product.style}</p>
        <h1>{product.name}</h1>
        <strong className="price">{money(product.price)}</strong>
        <p>{product.description}</p>
        <fieldset><legend>색상</legend><div className="choices">{product.colors.map((value) => <button key={value} className={value === color ? 'selected' : ''} onClick={() => setColor(value)}>{value}</button>)}</div></fieldset>
        <fieldset><legend>사이즈</legend><div className="choices">{product.sizes.map((value) => <button key={value} className={value === size ? 'selected' : ''} onClick={() => setSize(value)}>{value}</button>)}</div></fieldset>
        <div className="quantity"><button onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button><span>{quantity}</span><button onClick={() => setQuantity(quantity + 1)}>+</button></div>
        {notice && <p className="notice" role="status">{notice}</p>}
        <div className="actions"><button className="secondary" onClick={favorite}>{favorites.includes(product.id) ? '♥ 찜 해제' : '♡ 찜하기'}</button><button onClick={add}>장바구니 담기</button></div>
      </div>
    </section>
  );
}
