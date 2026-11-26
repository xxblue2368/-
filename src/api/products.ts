import type { Product } from '../types/api';
import { apiRequest, ApiRequestError, USE_MOCK_API } from './client';

const imageBaseUrl = (import.meta.env.VITE_IMAGE_BASE_URL || '/product-images').replace(/\/+$/, '');
export const productImageUrl = (articleId: string) =>
  `${imageBaseUrl}/${encodeURIComponent(articleId.slice(0, 3))}/${encodeURIComponent(articleId)}.webp`;

export const products: Product[] = [
  {
    id: '0108775015',
    name: '블랙 스트랩 탑',
    brand: 'MORI',
    category: 'tops',
    price: 29900,
    style: '미니멀',
    colors: ['블랙', '화이트'],
    sizes: ['XS', 'S', 'M', 'L'],
    imageUrl: productImageUrl('0108775015'),
    description: '단독으로도 레이어드로도 활용하기 좋은 미니멀한 스트랩 탑입니다.',
  },
  {
    id: '0109234002',
    name: '오버사이즈 울 블렌드 코트',
    brand: 'MORI',
    category: 'outerwear',
    price: 129000,
    style: '클래식',
    colors: ['차콜', '카멜'],
    sizes: ['S', 'M', 'L'],
    imageUrl: productImageUrl('0109234002'),
    description: '여유로운 실루엣과 클래식한 테일러드 라펠이 돋보이는 울 혼방 코트입니다.',
  },
  {
    id: '0110552008',
    name: '와이드 하이웨이스트 데님',
    brand: 'MORI',
    category: 'bottoms',
    price: 49900,
    style: '스트리트',
    colors: ['미드 블루', '다크 블루'],
    sizes: ['24', '26', '28', '30'],
    imageUrl: productImageUrl('0110552008'),
    description: '편안한 착용감의 스트레이트 와이드 핏 데님 팬츠입니다.',
  },
  {
    id: '0112004019',
    name: '소프트 새틴 파자마 세트',
    brand: 'MORI',
    category: 'sleepwear',
    price: 39900,
    style: '캐주얼',
    colors: ['아이보리', '핑크'],
    sizes: ['S', 'M', 'L'],
    imageUrl: productImageUrl('0112004019'),
    description: '은은한 광택과 부드러운 감촉을 담은 새틴 라운지웨어입니다.',
  },
  {
    id: '0112468001',
    name: '코튼 포플린 셔츠',
    brand: 'MORI',
    category: 'tops',
    price: 45900,
    style: '클래식',
    colors: ['화이트', '스카이 블루'],
    sizes: ['S', 'M', 'L'],
    imageUrl: productImageUrl('0112468001'),
    description: '매일 입기 좋은 탄탄한 코튼 포플린 소재의 셔츠입니다.',
  },
  {
    id: '0113199003',
    name: '리브드 니트 가디건',
    brand: 'MORI',
    category: 'tops',
    price: 55900,
    style: '캐주얼',
    colors: ['크림', '블랙'],
    sizes: ['S', 'M', 'L'],
    imageUrl: productImageUrl('0113199003'),
    description: '슬림한 리브 조직으로 단독과 레이어드 모두에 어울리는 가디건입니다.',
  },
];

const mockMinorCategories: Record<string, { code: string; label: string }> = {
  '0108775015': { code: 'top', label: '탑' },
  '0109234002': { code: 'coat', label: '코트' },
  '0110552008': { code: 'trousers', label: '바지' },
  '0112004019': { code: 'pyjama_set', label: '잠옷 세트' },
  '0112468001': { code: 'shirt', label: '셔츠' },
  '0113199003': { code: 'cardigan', label: '카디건' },
};
const middleLabels: Record<Product['category'], { code: string; label: string }> = {
  tops: { code: 'tops', label: '상의' },
  bottoms: { code: 'bottoms', label: '하의' },
  outerwear: { code: 'outerwear', label: '아우터' },
  sleepwear: { code: 'others', label: '기타' },
  dresses: { code: 'dresses', label: '원피스' },
  others: { code: 'others', label: '기타' },
};
for (const product of products) {
  product.categoryPath = {
    major: { code: 'women', label: '여성' },
    middle: middleLabels[product.category],
    minor: mockMinorCategories[product.id],
  };
}

export const findProduct = (id: string) => products.find((product) => product.id === id);

export type ProductFilterOption = { code: string; label: string; count?: number };
export type ProductFilters = {
  majors: ProductFilterOption[];
  middles: ProductFilterOption[];
  minors: ProductFilterOption[];
};
export async function fetchProductFilters(
  params: { major?: string; middle?: string } = {},
  signal?: AbortSignal,
): Promise<ProductFilters> {
  if (USE_MOCK_API) {
    const matching = products.filter(
      (product) =>
        (!params.major || product.categoryPath?.major?.code === params.major) &&
        (!params.middle || product.categoryPath?.middle?.code === params.middle),
    );
    const unique = (options: Array<ProductFilterOption | undefined>) => [
      ...new Map(
        options
          .filter((option): option is ProductFilterOption => Boolean(option))
          .map((option) => [option.code, option]),
      ).values(),
    ];
    return {
      majors: unique(
        products.map((product) =>
          product.categoryPath?.major ? { ...product.categoryPath.major } : undefined,
        ),
      ),
      middles: unique(
        matching.map((product) =>
          product.categoryPath?.middle ? { ...product.categoryPath.middle } : undefined,
        ),
      ),
      minors: unique(
        matching.map((product) =>
          product.categoryPath?.minor ? { ...product.categoryPath.minor } : undefined,
        ),
      ),
    };
  }
  const query = new URLSearchParams();
  if (params.major) query.set('major', params.major);
  if (params.middle) query.set('middle', params.middle);
  return apiRequest<ProductFilters>(`/products/filters${query.size ? `?${query}` : ''}`, {
    signal,
  });
}

type CategoryNode = { code: string; label: string } | null;
type BackendProduct = {
  article_id: string;
  name: string;
  brand?: string;
  description?: string | null;
  image_url?: string | null;
  category?: { major?: CategoryNode; middle?: CategoryNode; minor?: CategoryNode };
  price?: { amount?: number | null; is_estimated?: boolean };
  attributes?: { color?: string | null };
  sizes?: string[];
  tag_codes?: { style?: string[] };
};
export const mapBackendProduct = (item: BackendProduct): Product => ({
  id: item.article_id,
  name: item.name,
  brand: item.brand ?? 'H&M',
  category:
    item.category?.middle?.code === 'bottoms'
      ? 'bottoms'
      : item.category?.middle?.code === 'outerwear'
        ? 'outerwear'
        : item.category?.middle?.code === 'sleepwear'
          ? 'sleepwear'
          : item.category?.middle?.code === 'dresses'
            ? 'dresses'
            : item.category?.middle?.code === 'tops'
              ? 'tops'
              : 'others',
  categoryPath: item.category
    ? { major: item.category.major, middle: item.category.middle, minor: item.category.minor }
    : undefined,
  price: item.price?.amount ?? 0,
  isEstimatedPrice: item.price?.is_estimated,
  imageUrl: productImageUrl(item.article_id),
  description: item.description ?? '',
  colors: item.attributes?.color ? [item.attributes.color] : ['기본'],
  sizes: item.sizes ?? [],
  style: item.tag_codes?.style?.[0] ?? '캐주얼',
});

export async function fetchProducts(
  params: Record<string, string | number | undefined> = {},
  signal?: AbortSignal,
): Promise<{ items: Product[]; total: number }> {
  if (USE_MOCK_API) {
    const filtered = products.filter((product) => {
      const category = product.categoryPath;
      return (
        (!params.major || category?.major?.code === params.major) &&
        (!params.middle || category?.middle?.code === params.middle) &&
        (!params.minor || category?.minor?.code === params.minor) &&
        (!params.q ||
          `${product.name} ${product.description}`
            .toLowerCase()
            .includes(String(params.q).toLowerCase()))
      );
    });
    const offset = Number(params.offset ?? 0);
    const limit = Number(params.limit ?? filtered.length);
    return {
      items: filtered.slice(offset, offset + limit),
      total: filtered.length,
    };
  }
  const query = new URLSearchParams(
    Object.entries(params)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, String(value)]),
  );
  const data = await apiRequest<{ items: BackendProduct[]; total: number }>(`/products?${query}`, {
    signal,
  });
  return { items: data.items.map(mapBackendProduct), total: data.total };
}

export async function fetchProduct(
  articleId: string,
  signal?: AbortSignal,
): Promise<Product | null> {
  if (USE_MOCK_API) return findProduct(articleId) ?? null;
  try {
    const data = await apiRequest<BackendProduct>(`/products/${encodeURIComponent(articleId)}`, {
      signal,
    });
    return mapBackendProduct(data);
  } catch (cause) {
    if (cause instanceof ApiRequestError && cause.status === 404) return null;
    throw cause;
  }
}

export async function fetchRecommendations(
  limit = 4,
  signal?: AbortSignal,
): Promise<{ items: Product[]; total: number; personalized: boolean; runId?: string }> {
  if (USE_MOCK_API)
    return {
      items: products.slice(0, limit),
      total: Math.min(products.length, limit),
      personalized: false,
    };
  const data = await apiRequest<{
    items: { product: BackendProduct }[];
    count: number;
    recommendation_run_id?: string;
    preference_source?: string;
  }>('/recommendations/me', {
    method: 'POST',
    signal,
    body: JSON.stringify({ engine: 'tags', limit, persist: true, exclude_onboarding_skus: true }),
  });
  return {
    items: data.items.map(({ product }) => mapBackendProduct(product)),
    total: data.count,
    personalized:
      !!data.preference_source && !['none', 'default', 'fallback'].includes(data.preference_source),
    runId: data.recommendation_run_id,
  };
}

export async function searchAgentProducts(query: string, limit: number, signal?: AbortSignal) {
  const data = await apiRequest<{
    results: { product_id: string; metadata: { name?: string; price?: number; style?: string } }[];
  }>('/agent-search/search', {
    method: 'POST',
    signal,
    body: JSON.stringify({ query, mode: 'keyword', rerank: false, limit }),
  });
  const items = data.results.map(({ product_id, metadata }) =>
    mapBackendProduct({
      article_id: product_id,
      name: metadata.name || product_id,
      price: { amount: metadata.price },
      tag_codes: metadata.style ? { style: [metadata.style] } : undefined,
    }),
  );
  return { items, total: items.length };
}
