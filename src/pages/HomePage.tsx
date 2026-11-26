import { PersonalizedAds } from '../components/ads/PersonalizedAds';
import { PreferenceSummary } from '../components/auth/PreferenceSummary';
import { useEffect, useState, type MouseEvent, type SyntheticEvent } from 'react';
import { fetchProducts, fetchRecommendations, productImageUrl } from '../api/products';
import { ProductCard } from '../components/product/ProductCard';
import { navigate } from '../components/common/Layout';
import { useSessionStore } from '../store/useSessionStore';
import { LineIcon } from '../components/common/LineIcon';
import { SeasonalLookbook } from '../components/auth/SeasonalLookbook';
import { getAiCandidates, getSelectedAiCandidates } from '../data/aiCandidates';
import { resolveBodyGender } from '../data/bodyTypes';
import fallbackProducts from '../data/onboardingProductFallback.json';
import type { Product } from '../types/api';

const guestEditorial = [
  getAiCandidates('FEMALE', 'FALL').find((look) => look.styleLabel === '클래식'),
  getAiCandidates('MALE', 'FALL').find((look) => look.styleLabel === '캐주얼'),
  getAiCandidates('FEMALE', 'WINTER').find((look) => look.styleLabel === '시크'),
  getAiCandidates('FEMALE', 'WINTER').find((look) => look.styleLabel === '클래식'),
];
const featuredCoatId = '0312878010';

function localProducts(gender: 'MALE' | 'FEMALE' | undefined): Product[] {
  const major = gender === 'MALE' ? 'men' : 'women';
  return fallbackProducts[major].slice(0, 4).map((item) => ({
    id: item.id,
    name: item.name,
    brand: 'ERIN',
    category: 'others',
    price: 0,
    imageUrl: productImageUrl(item.id),
    description: '',
    colors: [],
    sizes: [],
    style: '',
    categoryPath: { major: { code: major, label: major === 'men' ? '남성' : '여성' } },
  }));
}

function followLink(event: MouseEvent<HTMLAnchorElement>) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
    return;
  event.preventDefault();
  const { pathname, search } = event.currentTarget;
  navigate(pathname + search);
}

function showImageFallback(event: SyntheticEvent<HTMLImageElement>) {
  event.currentTarget.hidden = true;
}

function showGridImageFallback(event: SyntheticEvent<HTMLElement>) {
  if (event.target instanceof HTMLImageElement) event.target.hidden = true;
}

export function HomePage() {
  const user = useSessionStore((state) => state.user);
  const onboardingSelections = useSessionStore((state) => state.onboardingSelections);
  const [recommended, setRecommended] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [runId, setRunId] = useState<string>();
  const [personalized, setPersonalized] = useState(false);
  const canPersonalize = !!user?.consents?.some(
    ({ purpose, granted }) => purpose === 'personalization' && granted,
  );
  const onboardingHref = user ? '/preferences?mode=edit' : '/signup';
  const savedLooks =
    user && onboardingSelections
      ? getSelectedAiCandidates(onboardingSelections.selectedAiCandidateIds)
      : [];
  const savedGender = resolveBodyGender(user);
  const gender =
    savedGender === 'men' ? 'MALE' : savedGender === 'women' ? 'FEMALE' : savedLooks[0]?.gender;
  const seasonalLooks = gender
    ? [...getAiCandidates(gender, 'FALL'), ...getAiCandidates(gender, 'WINTER')]
    : [];
  const likedStyles = new Set(savedLooks.map((look) => look.styleLabel));
  const memberEditorial = new Map(
    [
      ...savedLooks.filter((look) => look.season === 'FALL' || look.season === 'WINTER'),
      ...seasonalLooks.filter((look) => likedStyles.has(look.styleLabel)),
      ...seasonalLooks,
    ].map((look) => [look.id, look]),
  );
  const editorial = gender ? [...memberEditorial.values()].slice(0, 4) : guestEditorial;
  const aiFeature = editorial[3];

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const requestSignal = () => AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]);
    setRunId(undefined);
    setLoading(true);
    setPersonalized(false);

    const load = async () => {
      if (canPersonalize) {
        try {
          const result = await fetchRecommendations(4, requestSignal());
          if (!active) return;
          if (result.personalized && result.items.length > 0) {
            setRunId(result.runId);
            setRecommended(result.items);
            setPersonalized(true);
            return;
          }
        } catch {
          if (!active) return;
        }
      }
      try {
        const major = gender === 'MALE' ? 'men' : gender === 'FEMALE' ? 'women' : undefined;
        const { items } = await fetchProducts(
          { limit: 4, offset: 0, ...(major ? { major } : {}) },
          requestSignal(),
        );
        if (active)
          setRecommended(
            major
              ? items.filter(
                  (item) => !item.categoryPath?.major || item.categoryPath.major.code === major,
                )
              : items,
          );
      } catch {
        if (active) setRecommended(localProducts(gender));
      }
    };
    load().finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [user?.id, gender, canPersonalize]);

  return (
    <>
      <section className="home-editorial" aria-label="이번 주 스타일">
        <div className="editorial-hero">
          <div className="editorial-hero-media" aria-hidden="true">
            {editorial.slice(0, 3).map((look, index) => (
              <picture key={look?.id ?? index}>
                {index > 0 && look && <source media="(width > 768px)" srcSet={look.imageUrl} />}
                <img
                  src={index === 0 ? look?.imageUrl : undefined}
                  alt=""
                  fetchPriority={index === 0 ? 'high' : undefined}
                  decoding="async"
                  onError={showImageFallback}
                />
              </picture>
            ))}
          </div>
          <div className="editorial-hero-copy">
            <p className="editorial-kicker">THIS WEEK'S EDIT</p>
            <h1>
              내 스타일을 찾는
              <br />
              새로운 발견
            </h1>
            <p className="editorial-description">
              체형과 취향 데이터를 바탕으로 나만의 시즌 룩북을 완성해 보세요.
            </p>
            <div className="editorial-actions">
              <a
                className="editorial-cta editorial-cta-primary"
                href={onboardingHref}
                onClick={followLink}
              >
                AI 스타일 찾기 <LineIcon name="arrow" />
              </a>
              <a
                className="editorial-cta editorial-cta-secondary"
                href="/products"
                onClick={followLink}
              >
                전체 상품 보기
              </a>
            </div>
          </div>
        </div>
        <div className="editorial-title-bar">
          <span>NEW ARRIVALS · AUTUMN / WINTER 2026</span>
          <a className="editorial-link" href="/products" onClick={followLink}>
            상품 둘러보기 <LineIcon name="arrow" />
          </a>
        </div>
      </section>
      <div className="editorial-grid">
        <div className="editorial-stack">
          <section className="editorial-card editorial-feature-product">
            <div className="editorial-product-media">
              <img
                src={productImageUrl(featuredCoatId)}
                alt="베이지색 후드 코트"
                loading="lazy"
                decoding="async"
                onError={showImageFallback}
              />
            </div>
            <div className="editorial-card-copy">
              <p className="editorial-kicker">SPECIAL EVENT</p>
              <h2>
                가을 신상 컬렉션
                <br />
                최대 30% 할인
              </h2>
              <a className="editorial-link" href="/products" onClick={followLink}>
                컬렉션 보러가기 <LineIcon name="arrow" />
              </a>
            </div>
          </section>
          <section className="editorial-card editorial-feature-ai">
            {aiFeature && (
              <img
                key={aiFeature.id}
                className="editorial-ai-media"
                src={aiFeature.imageUrl}
                alt=""
                loading="lazy"
                decoding="async"
                onError={showImageFallback}
              />
            )}
            <span className="editorial-ai-badge">AI 생성 이미지</span>
            <div className="editorial-card-copy">
              <p className="editorial-kicker">AI PERSONALIZED LOOK</p>
              <h2>
                나에게 맞는 스타일을
                <br />
                지금 발견해 보세요
              </h2>
              <a className="editorial-link" href={onboardingHref} onClick={followLink}>
                {user ? '내 취향 설정' : '취향 설정 시작하기'} <LineIcon name="arrow" />
              </a>
            </div>
          </section>
        </div>
        <PersonalizedAds placement="home" />
      </div>

      {onboardingSelections && (
        <section
          className="section editorial-home-list"
          aria-label="저장한 계절 룩북"
          onErrorCapture={showGridImageFallback}
        >
          <h2>내 계절 룩북</h2>
          <p>
            온보딩에서 고른 상품 {onboardingSelections.selectedProductIds.length}개와 계절 착장
            4장이 저장되어 있어요.
          </p>
          <SeasonalLookbook selections={onboardingSelections.selectedAiCandidateIds} />
        </section>
      )}

      <section className="section editorial-home-list" onErrorCapture={showGridImageFallback}>
        <div className="section-heading">
          <div>
            <h2>{personalized ? '회원님을 위한 추천' : '시즌 상품 둘러보기'}</h2>
          </div>
          <button className="text-button" onClick={() => navigate('/products')}>
            더 보기 →
          </button>
        </div>

        <PreferenceSummary />
        {loading ? (
          <p>상품을 불러오는 중이에요…</p>
        ) : recommended.length ? (
          <div className="product-grid">
            {recommended.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                hideBrand
                source={runId ? 'recommendation' : 'direct'}
                recommendationRunId={runId}
              />
            ))}
          </div>
        ) : (
          <div className="empty">
            <p>표시할 상품이 없어요.</p>
          </div>
        )}
      </section>
    </>
  );
}
