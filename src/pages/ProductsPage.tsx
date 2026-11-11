import { useEffect, useState } from 'react';
import { fetchProductFilters, fetchProducts, type ProductFilterOption } from '../api/products';
import type { Product } from '../types/api';
import { ProductCard } from '../components/product/ProductCard';

export function ProductsPage() {
  const params = new URLSearchParams(location.search);
  const query = params.get('q')?.trim() ?? '';
  const legacyCategory = params.get('category');
  const [major, setMajor] = useState(params.get('major') ?? '');
  const [middle, setMiddle] = useState(params.get('middle') ?? (legacyCategory === 'sleepwear' ? 'others' : legacyCategory ?? ''));
  const [minor, setMinor] = useState(params.get('minor') ?? '');
  const [filters, setFilters] = useState<{ majors: ProductFilterOption[]; middles: ProductFilterOption[]; minors: ProductFilterOption[] }>({ majors: [], middles: [], minors: [] });
  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetchProductFilters({ major: major || undefined, middle: middle || undefined })
      .then((result) => { if (active) setFilters(result); })
      .catch(() => { if (active) setFilters({ majors: [], middles: [], minors: [] }); });
    return () => { active = false; };
  }, [major, middle]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    fetchProducts({ q: query || undefined, major: major || undefined, middle: middle || undefined, minor: minor || undefined, limit: 20, offset: 0 })
      .then((result) => { if (active) { setItems(result.items); setTotal(result.total); } })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : '상품을 불러오지 못했습니다.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [query, major, middle, minor]);

  const reset = () => { setMajor(''); setMiddle(''); setMinor(''); };

  return <section className="section">
    <div className="shop-heading">
      <div><p className="eyebrow">SHOP</p><h1>상품 탐색</h1></div>
      <div className="product-classifier" aria-label="상품 분류 선택">
        <label>대분류<select value={major} onChange={(event) => { setMajor(event.target.value); setMiddle(''); setMinor(''); }}>
          <option value="">전체 성별</option>{filters.majors.map((option) => <option key={option.code} value={option.code}>{option.label}</option>)}
        </select></label>
        <label>중분류<select value={middle} onChange={(event) => { setMiddle(event.target.value); setMinor(''); }}>
          <option value="">전체 종류</option>{filters.middles.map((option) => <option key={option.code} value={option.code}>{option.label}</option>)}
        </select></label>
        <label>소분류<select value={minor} onChange={(event) => setMinor(event.target.value)}>
          <option value="">전체 품목</option>{filters.minors.map((option) => <option key={option.code} value={option.code}>{option.label}{option.count != null ? ` (${option.count})` : ''}</option>)}
        </select></label>
        <button type="button" className="classifier-reset" onClick={reset} disabled={!major && !middle && !minor}>초기화</button>
      </div>
    </div>
    {loading ? <p>상품을 불러오는 중이에요…</p> : error ? <div className="empty"><h2>상품을 불러오지 못했어요</h2><p>{error}</p></div> : <>
      <p className="result-count">{query ? `“${query}” 검색 결과 ` : ''}{total}개</p>
      {items.length ? <div className="product-grid">{items.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="empty"><h2>검색 결과가 없어요</h2><p>분류를 초기화하거나 다른 조건을 선택해 주세요.</p></div>}
    </>}
  </section>;
}
