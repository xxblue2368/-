import { apiRequest, USE_MOCK_API } from './client';
import { fetchProduct } from './products';
import { getSessionSnapshot } from '../store/useSessionStore';
import type { Product } from '../types/api';

type FavoriteItem = { article_id: string };

export async function fetchFavoriteIds(signal?: AbortSignal): Promise<string[]> {
  if (USE_MOCK_API) return getSessionSnapshot().favorites;
  const { items } = await apiRequest<{ items: FavoriteItem[] }>('/users/me/favorites', { signal });
  return [...new Set(items.map(({ article_id }) => article_id))];
}

export async function fetchFavoriteProducts(
  ids: string[],
  signal?: AbortSignal,
): Promise<Product[]> {
  const results: Array<Product | null> = new Array(ids.length).fill(null);
  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < ids.length && !signal?.aborted) {
      const index = nextIndex++;
      try {
        results[index] = await fetchProduct(ids[index], signal);
      } catch {
        // Keep the saved ID so that a failed product lookup can be retried.
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(5, ids.length) }, worker));
  signal?.throwIfAborted();
  return results.filter((product): product is Product => product !== null);
}

export async function addFavorite(articleId: string) {
  if (USE_MOCK_API) return { article_id: articleId, favorited: true };
  return apiRequest<{ article_id: string; favorited: boolean }>(`/users/me/favorites`, {
    method: 'POST',
    body: JSON.stringify({ article_id: articleId }),
  });
}

export async function removeFavorite(articleId: string) {
  if (USE_MOCK_API) return { article_id: articleId, favorited: false };
  return apiRequest<{ article_id: string; favorited: boolean }>(
    `/users/me/favorites/${encodeURIComponent(articleId)}`,
    { method: 'DELETE' },
  );
}

export async function toggleFavorite(articleId: string, currentlyFavorited: boolean) {
  if (currentlyFavorited) {
    await removeFavorite(articleId);
    return false;
  }
  await addFavorite(articleId);
  return true;
}
