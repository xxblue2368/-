import { ApiRequestError, USE_MOCK_API } from '../api/client';
import { hasSearchIndex } from '../api/health';
import { trackBehavior } from '../api/events';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { navigate, useNavigationDrawer } from '../components/common/Layout';
import { LineIcon } from '../components/common/LineIcon';
import { CategoryDrawerTabs } from '../components/common/CategoryDrawerTabs';
import {
  fetchProductFilters,
  fetchProducts,
  searchAgentProducts,
  type ProductFilterOption,
  type ProductFilters,
} from '../api/products';
import type { Product } from '../types/api';
import { ProductCard } from '../components/product/ProductCard';

const PAGE_SIZE = 20;
const EMPTY_FILTERS: ProductFilters = { majors: [], middles: [], minors: [] };

export function ProductsPage() {
  const { filterTarget, openDrawer, closeDrawer, openAccount, registerCategoryContent } =
    useNavigationDrawer();
  const params = new URLSearchParams(location.search);
  const query = params.get('q')?.trim() ?? '';
  const agentSearch = !USE_MOCK_API && !!query && params.get('search') === 'agent';
  const legacyCategory = params.get('category');
  const [major, setMajor] = useState(params.get('major') ?? '');
  const [middle, setMiddle] = useState(
    params.get('middle') ?? (legacyCategory === 'sleepwear' ? 'others' : (legacyCategory ?? '')),
  );
  const [minor, setMinor] = useState(params.get('minor') ?? '');
  const filterScope = `${major}:${middle}`;
  const [filterResult, setFilterResult] = useState<{ scope: string; options: ProductFilters }>();
  const filters = filterResult?.scope === filterScope ? filterResult.options : EMPTY_FILTERS;
  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextOffset, setNextOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');
  const [attempt, retry] = useState(0);
  const [loadMoreError, setLoadMoreError] = useState('');
  const sentinelRef = useRef<HTMLDivElement>(null);
  const requestVersion = useRef(0);
  const loadingMoreRef = useRef(true);
  const catalogController = useRef<AbortController | null>(null);

  useEffect(() => {
    registerCategoryContent(!agentSearch);
    return () => registerCategoryContent(false);
  }, [registerCategoryContent, agentSearch]);

  useEffect(() => {
    if (agentSearch) return;
    const controller = new AbortController();
    fetchProductFilters(
      { major: major || undefined, middle: middle || undefined },
      controller.signal,
    )
      .then((result) => {
        if (!controller.signal.aborted) setFilterResult({ scope: filterScope, options: result });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setFilterResult({ scope: filterScope, options: EMPTY_FILTERS });
      });
    return () => controller.abort();
  }, [major, middle, filterScope, agentSearch, attempt]);

  useEffect(() => {
    let active = true;
    requestVersion.current += 1;
    loadingMoreRef.current = true;
    setItems([]);
    setTotal(0);
    setNextOffset(0);
    setHasMore(false);
    setLoading(true);
    setLoadingMore(false);
    setError('');
    setLoadMoreError('');
    const controller = new AbortController();
    catalogController.current = controller;
    const searchIndex = agentSearch
      ? hasSearchIndex(AbortSignal.any([controller.signal, AbortSignal.timeout(3000)])).catch(
          () => undefined,
        )
      : undefined;
    const request = agentSearch
      ? searchAgentProducts(
          query,
          PAGE_SIZE,
          AbortSignal.any([controller.signal, AbortSignal.timeout(12000)]),
        )
      : fetchProducts(
          {
            q: query || undefined,
            major: major || undefined,
            middle: middle || undefined,
            minor: minor || undefined,
            limit: PAGE_SIZE,
            offset: 0,
          },
          controller.signal,
        );
    request
      .then((result) => {
        if (active) {
          setItems(result.items);
          setTotal(result.total);
          setNextOffset(result.items.length);
          setHasMore(result.items.length > 0 && result.items.length < result.total);
        }
      })
      .catch(async (cause) => {
        if (!active) return;
        if (agentSearch && (await searchIndex) === false) {
          if (active)
            setError('확장 검색 인덱스를 사용할 수 없어요. 카탈로그 검색으로 전환해 주세요.');
          return;
        }
        if (!active) return;
        if (agentSearch && cause instanceof ApiRequestError && cause.status === 503) {
          setError('확장 검색을 잠시 이용할 수 없어요. 카탈로그 검색으로 전환해 주세요.');
          return;
        }
        setError(cause instanceof Error ? cause.message : '상품을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (active) {
          loadingMoreRef.current = false;
          setLoading(false);
        }
      });
    return () => {
      active = false;
      controller.abort();
      requestVersion.current += 1;
    };
  }, [query, major, middle, minor, agentSearch, attempt]);

  const loadMore = useCallback(() => {
    if (loading || !hasMore || loadingMoreRef.current) return;
    const version = requestVersion.current;
    const offset = nextOffset;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setLoadMoreError('');
    fetchProducts(
      {
        q: query || undefined,
        major: major || undefined,
        middle: middle || undefined,
        minor: minor || undefined,
        limit: PAGE_SIZE,
        offset,
      },
      catalogController.current?.signal,
    )
      .then((result) => {
        if (version !== requestVersion.current) return;
        setItems((previous) => {
          const seen = new Set(previous.map((product) => product.id));
          return [
            ...previous,
            ...result.items.filter((product) => {
              if (seen.has(product.id)) return false;
              seen.add(product.id);
              return true;
            }),
          ];
        });
        setTotal(result.total);
        setNextOffset(offset + result.items.length);
        setHasMore(result.items.length > 0 && offset + result.items.length < result.total);
      })
      .catch((cause) => {
        if (version === requestVersion.current) {
          setLoadMoreError(
            cause instanceof Error ? cause.message : '다음 상품을 불러오지 못했습니다.',
          );
        }
      })
      .finally(() => {
        if (version === requestVersion.current) {
          loadingMoreRef.current = false;
          setLoadingMore(false);
        }
      });
  }, [loading, hasMore, nextOffset, query, major, middle, minor]);

  useEffect(() => {
    if (loading || loadingMore || loadMoreError || !hasMore || !sentinelRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore();
      },
      { rootMargin: '400px 0px' },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [loading, loadingMore, loadMoreError, hasMore, loadMore]);

  const reset = () => {
    setMajor('');
    setMiddle('');
    setMinor('');
  };

  return (
    <section className="section">
      {query && !USE_MOCK_API && (
        <button
          type="button"
          className="text-button"
          onClick={() => {
            const search = new URLSearchParams({ q: query });
            if (!agentSearch) search.set('search', 'agent');
            navigate(`/products?${search}`);
          }}
        >
          {agentSearch ? '카탈로그 검색으로 전환' : '확장 검색'}
        </button>
      )}
      <div className="shop-heading">
        <div>
          <p className="eyebrow">SHOP</p>
          <h1>상품 탐색</h1>
        </div>
        {!agentSearch && (
          <div className="category-trigger-bar">
            <button
              type="button"
              className="category-trigger"
              onClick={openDrawer}
              aria-haspopup="dialog"
              aria-controls="navigation-drawer"
            >
              <span className="category-trigger-caption">카테고리</span>
              <span>
                {filters.majors.find((option) => option.code === major)?.label ??
                  (major || '전체 성별')}
                <span aria-hidden="true"> / </span>
                {filters.middles.find((option) => option.code === middle)?.label ??
                  (middle || '전체 종류')}
                <span aria-hidden="true"> / </span>
                {filters.minors.find((option) => option.code === minor)?.label ??
                  (minor || '전체 품목')}
              </span>
              <LineIcon name="menu" />
            </button>
            <button
              type="button"
              className="category-reset"
              onClick={reset}
              disabled={!major && !middle && !minor}
            >
              초기화
            </button>
          </div>
        )}
        {!agentSearch &&
          filterTarget &&
          createPortal(
            <div className="drawer-categories">
              <CategoryDrawerTabs
                activeTab={major}
                onSelectMajor={(code) => {
                  setMajor(code);
                  setMiddle('');
                  setMinor('');
                }}
                onSelectMy={openAccount}
              />
              <fieldset className="drawer-category-list">
                <legend>중분류</legend>
                {[{ code: '', label: '전체 종류' }, ...filters.middles].map((option) => (
                  <button
                    key={option.code}
                    type="button"
                    className={middle === option.code ? 'selected' : ''}
                    onClick={() => {
                      setMiddle(option.code);
                      setMinor('');
                      closeDrawer();
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </fieldset>
              <fieldset className="drawer-category-list">
                <legend>소분류</legend>
                {[{ code: '', label: '전체 품목' }, ...filters.minors].map(
                  (option: ProductFilterOption) => (
                    <button
                      key={option.code}
                      type="button"
                      className={minor === option.code ? 'selected' : ''}
                      onClick={() => {
                        setMinor(option.code);
                        closeDrawer();
                      }}
                    >
                      {option.label}
                      {option.count != null ? ` (${option.count})` : ''}
                    </button>
                  ),
                )}
              </fieldset>
              <button
                type="button"
                className="drawer-reset"
                onClick={reset}
                disabled={!major && !middle && !minor}
              >
                초기화
              </button>
              {items.length > 0 && (
                <div className="drawer-product-thumbnails" aria-label="현재 분류 상품">
                  {items.slice(0, 3).map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => {
                        closeDrawer();
                        trackBehavior({
                          event_type: 'product_click',
                          event_source: query ? 'search' : 'direct',
                          article_id: product.id,
                        });
                        navigate(`/products/${product.id}`);
                      }}
                    >
                      <img src={product.imageUrl} alt="" />
                      <span>{product.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>,
            filterTarget,
          )}
      </div>
      {loading ? (
        <p>상품을 불러오는 중이에요…</p>
      ) : error ? (
        <div className="empty">
          <h2>상품을 불러오지 못했어요</h2>
          <p>{error}</p>
          <button type="button" onClick={() => retry((n) => n + 1)}>
            다시 시도
          </button>
        </div>
      ) : (
        <>
          <p className="result-count">
            {query ? `“${query}” 검색 결과 ` : ''}
            {total}개
          </p>
          {items.length ? (
            <div className="product-grid">
              {items.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  source={query ? 'search' : 'direct'}
                />
              ))}
            </div>
          ) : (
            <div className="empty">
              <h2>검색 결과가 없어요</h2>
              <p>분류를 초기화하거나 다른 조건을 선택해 주세요.</p>
            </div>
          )}
          {items.length > 0 && hasMore && !loadMoreError && (
            <div className="product-load-sentinel" ref={sentinelRef} aria-hidden="true" />
          )}
          {loadingMore && (
            <p className="product-load-status" role="status">
              상품을 더 불러오는 중이에요…
            </p>
          )}
          {loadMoreError && (
            <div className="product-load-status" role="alert">
              <p>{loadMoreError}</p>
              <button type="button" className="secondary" onClick={loadMore}>
                다시 시도
              </button>
            </div>
          )}
          {items.length > 0 && !hasMore && (
            <p className="product-load-status">모든 상품을 확인했어요.</p>
          )}
        </>
      )}
    </section>
  );
}
