import { API_BASE_URL, apiRequest } from './client';

export async function checkBackendHealth(signal: AbortSignal): Promise<void> {
  const apiBase = new URL(API_BASE_URL + '/', location.origin);
  const url = new URL('../../health', apiBase);
  const response = await fetch(url, { cache: 'no-store', signal });
  if (!response.ok || (await response.json())?.status !== 'ok') {
    throw new Error('서버 상태를 확인하지 못했습니다.');
  }
}

export async function hasSearchIndex(signal: AbortSignal): Promise<boolean> {
  const health = await apiRequest<{ database: string; embeddings_table_exists: boolean }>(
    '/agent-search/health',
    { signal, cache: 'no-store' },
  );
  return health.database === 'ok' && health.embeddings_table_exists === true;
}
