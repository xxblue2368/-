import { useEffect, useState } from 'react';
import { fetchProducts, fetchRecommendations } from '../api/products';
import { ProductCard } from '../components/product/ProductCard';
import { navigate } from '../components/common/Layout';
import { useSessionStore } from '../store/useSessionStore';
import type { Product } from '../types/api';

export function HomePage() {
  const { user } = useSessionStore();
  const [recommended, setRecommended] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [personalized, setPersonalized] = useState(false);
  const [recommendationNotice, setRecommendationNotice] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setRecommendationNotice('');
    setPersonalized(false);
    const load = async () => {
      if (user) {
        try {
          const result = await fetchRecommendations(4);
          if (!active) return;
          setRecommended(result.items);
          setPersonalized(result.personalized);
          if (!result.personalized) setRecommendationNotice('취향 동의 또는 취향 데이터가 없어 기본 상품을 보여드려요.');
          return;
        } catch {
          if (!active) return;
          setRecommendationNotice('추천 API가 아직 연결되지 않아 기본 상품을 보여드려요.');
        }
      }
      try {
        const { items } = await fetchProducts({ limit: 4, offset: 0 });
        if (active) setRecommended(items);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : '상품을 불러오지 못했습니다.');
      }
    };
    load().finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?.id]);

  return (
    <>
      {/* 1. 기존 상단 메인 히어로 배너 */}
      <section className="hero">
        <p className="eyebrow">THIS WEEK'S EDIT</p>
        <h1>
          {user ? `${user.displayName}님을 위한` : '내 스타일을 찾는'} 새로운 발견
        </h1>
        <p>좋아하는 상품을 저장하고, 나만의 취향을 완성해 보세요.</p>
        <button onClick={() => navigate('/products')}>상품 둘러보기</button>
      </section>

      {/* ★ 2. 여기에 새로운 배너 섹션 추가 ★ */}
      <section
        className="promo-banner"
        onClick={() => navigate('/products')}
      >
        <div>
          <p className="promo-kicker">
            SPECIAL EVENT
          </p>
          <h2 className="promo-title">
            가을 신상 컬렉션 최대 30% 할인
          </h2>
        </div>
        <span>바로가기 →</span>
      </section>

      {/* 2-2. ai 합성 광고 */}
      <section
        className="promo-banner2"
        onClick={() => navigate('/products')}
      >
        <div>
          <p className="promo-kicker">
            AI 합성 광고입니다.
          </p>
          <h2 className="promo-title">
            나에게 맞는 스타일을 발견해 보세요.
          </h2>
        </div>
        <span>바로가기 →</span>

      </section>

      {/* 3. 추천 상품 목록 섹션 */}
      <section className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">RECOMMENDED</p>
            <h2>{personalized ? '회원님을 위한 추천' : '상품 둘러보기'}</h2>
          </div>
          <button
            className="text-button"
            onClick={() => navigate('/products')}
          >
            더 보기 →
          </button>
        </div>

        {recommendationNotice && <p className="muted">{recommendationNotice}</p>}
        {loading ? <p>상품을 불러오는 중이에요…</p> : error ? <div className="empty"><p>상품을 불러오지 못했어요: {error}</p></div> : recommended.length ? <div className="product-grid">{recommended.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="empty"><p>표시할 상품이 없어요.</p></div>}
      </section>
    </>
  );
}
