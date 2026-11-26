import { useEffect, useState } from 'react';
import { fetchProduct } from '../api/products';
import { toggleFavorite } from '../api/favorites';
import { money, navigate, useNavigationDrawer } from '../components/common/Layout';
import { getSessionVersion, sessionActions, useSessionStore } from '../store/useSessionStore';

export function ProductDetailPage({ id }: { id: string }) {
  const { openLogin } = useNavigationDrawer();
  const [product, setProduct] = useState<Awaited<ReturnType<typeof fetchProduct>>>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [attempt, retry] = useState(0);
  const favorites = useSessionStore((state) => state.favorites);
  const user = useSessionStore((state) => state.user);
  const [color, setColor] = useState('');
  const [size, setSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLoading(true);
    setLoadError('');
    setProduct(null);
    setSize('');
    setQuantity(1);
    setNotice('');
    fetchProduct(id, controller.signal)
      .then((value) => {
        if (!active) return;
        setProduct(value);
        setColor(value?.colors[0] ?? '');
      })
      .catch((cause) => {
        if (active)
          setLoadError(cause instanceof Error ? cause.message : '상품을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [id, attempt]);

  if (loading)
    return (
      <section className="empty">
        <p>상품을 불러오는 중이에요…</p>
      </section>
    );
  if (!product)
    return (
      <section className="empty">
        <h1>{loadError ? '상품 정보를 불러오지 못했어요' : '상품을 찾을 수 없어요'}</h1>
        {loadError && (
          <>
            <p role="alert">{loadError}</p>
            <button type="button" onClick={() => retry((n) => n + 1)}>
              다시 시도
            </button>
          </>
        )}
        <button onClick={() => navigate('/products')}>상품 목록으로</button>
      </section>
    );

  const categoryPath = (
    [
      { key: 'major', category: product.categoryPath?.major },
      { key: 'middle', category: product.categoryPath?.middle },
      { key: 'minor', category: product.categoryPath?.minor },
    ] as const
  ).filter(({ category }) => Boolean(category?.label));
  const categoryHref = (index: number) => {
    const search = new URLSearchParams();
    categoryPath.slice(0, index + 1).forEach(({ key, category }) => {
      if (category?.code) search.set(key, category.code);
    });
    return `/products?${search}`;
  };
  const requireLogin = () => {
    if (!user) {
      openLogin();
      return false;
    }
    return true;
  };
  const add = () => {
    if (!requireLogin()) return;
    if (product.sizes.length > 0 && !size) return setNotice('사이즈를 선택해 주세요.');
    sessionActions.addToCart({ productId: product.id, color, size, quantity, product });
    setNotice('장바구니에 담았어요.');
  };
  const favorite = async () => {
    if (!requireLogin()) return;
    if (saving) return;
    const version = getSessionVersion();
    setSaving(true);
    try {
      const currentlyFavorited = favorites.includes(product.id);
      const isFavorited = await toggleFavorite(product.id, currentlyFavorited);
      sessionActions.setFavorite(product.id, isFavorited, version);
      setNotice(isFavorited ? '찜 목록에 저장했어요.' : '찜 목록에서 삭제했어요.');
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : '찜 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="detail">
      <div className="detail-image">
        <img src={product.imageUrl} alt={product.name} />
      </div>
      <div className="detail-copy">
        {categoryPath.length > 0 && (
          <nav className="product-category-path" aria-label="상품 카테고리">
            {categoryPath.map(({ key, category }, index) => (
              <span key={key}>
                {index > 0 && (
                  <span className="category-separator" aria-hidden="true">
                    ›
                  </span>
                )}
                {category?.code ? (
                  <a
                    href={categoryHref(index)}
                    aria-label={`${category.label} 카테고리 상품 보기`}
                    onClick={(event) => {
                      event.preventDefault();
                      navigate(categoryHref(index));
                    }}
                  >
                    {category.label}
                  </a>
                ) : (
                  category?.label
                )}
              </span>
            ))}
          </nav>
        )}
        <p className="eyebrow">
          {product.brand} · {product.style}
        </p>
        <h1>{product.name}</h1>
        <strong className="price">
          {product.price > 0
            ? `${product.isEstimatedPrice ? 'AI 예상가 ' : ''}${money(product.price)}`
            : '가격 정보 준비 중'}
        </strong>
        <p>{product.description}</p>
        <fieldset>
          <legend>색상</legend>
          <div className="choices">
            {product.colors.map((value) => (
              <button
                key={value}
                className={value === color ? 'selected' : ''}
                onClick={() => setColor(value)}
              >
                {value}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>사이즈</legend>
          {product.sizes.length ? (
            <div className="choices">
              {product.sizes.map((value) => (
                <button
                  key={value}
                  className={value === size ? 'selected' : ''}
                  onClick={() => setSize(value)}
                >
                  {value}
                </button>
              ))}
            </div>
          ) : (
            <p>사이즈 정보 없음 · 체험 주문은 가능해요.</p>
          )}
        </fieldset>
        <div className="quantity">
          <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button>
          <span>{quantity}</span>
          <button onClick={() => setQuantity(quantity + 1)}>+</button>
        </div>
        {notice && (
          <p className="notice" role="status">
            {notice}
          </p>
        )}
        <div className="actions">
          <button className="secondary" disabled={saving} onClick={favorite}>
            {favorites.includes(product.id) ? '♥ 찜 해제' : '♡ 찜하기'}
          </button>
          <button onClick={add}>장바구니 담기</button>
        </div>
      </div>
    </section>
  );
}
