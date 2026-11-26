import { API_BASE_URL, apiRequest, ApiRequestError, tokenStore } from './client';

export type AdSlot = {
  slot_no: number;
  article_id: string;
  status: string;
  product_snapshot?: { name?: string };
};

export type AdBatch = {
  batch_id: string;
  status: string;
  items: AdSlot[];
};

// The plan can wait for two sequential Agent searches with their own deadlines.
const AD_PLAN_TIMEOUT_MS = 380000;

type AdPlan = {
  slots: { slot_no: number; article_id: string; product?: { name?: string } }[];
};

export type AdJob = {
  job_id: string;
  status: string;
};

function validateBatch(batch: AdBatch) {
  if (!batch?.batch_id || !Array.isArray(batch.items)) {
    throw new Error('광고 배치 응답 형식이 올바르지 않습니다.');
  }
  return batch;
}

export function fetchAdBatch(batchId: string, signal: AbortSignal) {
  return apiRequest<AdBatch>(`/ads/batches/${encodeURIComponent(batchId)}`, { signal }).then(
    validateBatch,
  );
}

export function fetchAdHistory(offset: number, limit: number, signal: AbortSignal) {
  return apiRequest<{ batch_ids: string[] }>(
    `/ads/batches/me/history?limit=${limit}&offset=${offset}`,
    {
      signal,
    },
  );
}

export async function previewAdBatch(signal: AbortSignal) {
  const plan = await apiRequest<AdPlan>('/ads/batches/preview', {
    method: 'POST',
    signal,
    timeoutMs: AD_PLAN_TIMEOUT_MS,
  });
  if (!Array.isArray(plan?.slots)) throw new Error('광고 계획을 불러오지 못했어요.');
  return plan;
}

export function createAdBatch(idempotencyKey: string, signal: AbortSignal) {
  return apiRequest<AdBatch>('/ads/batches', {
    method: 'POST',
    body: JSON.stringify({ idempotency_key: idempotencyKey }),
    signal,
    timeoutMs: AD_PLAN_TIMEOUT_MS,
  }).then(validateBatch);
}

export function requestAdJob(idempotencyKey: string, signal: AbortSignal) {
  return apiRequest<AdJob>('/ads/jobs', {
    method: 'POST',
    body: JSON.stringify({ idempotency_key: idempotencyKey }),
    signal,
  });
}

export function fetchAdJob(jobId: string, signal: AbortSignal) {
  return apiRequest<AdJob>(`/ads/jobs/${encodeURIComponent(jobId)}`, { signal });
}

export async function fetchLatestAdBatch(signal: AbortSignal) {
  try {
    const batch = await apiRequest<AdBatch>('/ads/batches/me/latest-with-images', { signal });
    return validateBatch(batch);
  } catch (cause) {
    if (
      cause instanceof ApiRequestError &&
      cause.status === 404 &&
      cause.message === 'No uploaded ad images yet'
    ) {
      return null;
    }
    throw cause;
  }
}

export async function hasPendingAdBatch(signal: AbortSignal) {
  try {
    const batch = await apiRequest<{ status: string }>('/ads/batches/me/latest', { signal });
    return batch?.status === 'planned' || batch?.status === 'partial';
  } catch {
    // A failed status lookup does not change the confirmed absence of uploaded images.
    return false;
  }
}

export async function fetchAdImage(batchId: string, slot: number, signal: AbortSignal) {
  const token = tokenStore.get();
  if (!token) throw new Error('로그인이 필요합니다.');
  const response = await fetch(
    `${API_BASE_URL}/ads/batches/${encodeURIComponent(batchId)}/items/${slot}/image`,
    { signal, headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
  );
  if (!response.ok || response.headers.get('content-type')?.split(';')[0] !== 'image/png') {
    throw new Error('광고 이미지를 불러오지 못했습니다.');
  }
  return response.blob();
}

export function trackAd(batch_id: string, slot: AdSlot, event_type: 'impression' | 'click') {
  void apiRequest('/ads/engagement/events', {
    method: 'POST',
    signal: AbortSignal.timeout(8000),
    body: JSON.stringify({
      events: [
        {
          event_id: crypto.randomUUID(),
          batch_id,
          slot_no: slot.slot_no,
          article_id: slot.article_id,
          event_type,
        },
      ],
    }),
  }).catch(() => {});
}
