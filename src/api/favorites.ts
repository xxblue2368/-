import { apiRequest, USE_MOCK_API } from './client';
import { fetchProduct, products as mockProducts } from './products';
import { getSessionSnapshot } from '../store/useSessionStore';
import type { Product } from '../types/api';

type FavoriteItem = { article_id: string };

export async function fetchFavoriteProducts(): Promise<Product[]> {
  if (USE_MOCK_API) {
    const savedIds = getSessionSnapshot().favorites;
    return mockProducts.filter((product) => savedIds.includes(product.id));
  }

  const { items } = await apiRequest<{ items: FavoriteItem[] }>('/users/me/favorites');
  const results: Product[] = [];
  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < items.length) {
      const item = items[nextIndex++];
      const product = await fetchProduct(item.article_id);
      if (product) results.push(product);
    }
  };
  await Promise.all(Array.from({ length: Math.min(5, items.length) }, worker));
  return results;
}

export async function addFavorite(articleId: string) {
  if (USE_MOCK_API) return { article_id: articleId, favorited: true };
  return apiRequest<{ article_id: string; favorited: boolean }>(`/users/me/favorites`, { method: 'POST', body: JSON.stringify({ article_id: articleId }) });
}

export async function removeFavorite(articleId: string) {
  if (USE_MOCK_API) return { article_id: articleId, favorited: false };
  return apiRequest<{ article_id: string; favorited: boolean }>(`/users/me/favorites/${encodeURIComponent(articleId)}`, { method: 'DELETE' });
}

export async function toggleFavorite(articleId: string, currentlyFavorited: boolean) {
  if (currentlyFavorited) {
    await removeFavorite(articleId);
    return false;
  }
  await addFavorite(articleId);
  return true;
}
