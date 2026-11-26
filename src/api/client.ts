export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');
export const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true';
const tokenKey = 'modi-access-token';

export const tokenStore = {
  get: () => localStorage.getItem(tokenKey),
  set: (token: string) => localStorage.setItem(tokenKey, token),
  clear: () => localStorage.removeItem(tokenKey),
};

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

type ApiRequestOptions = RequestInit & { timeoutMs?: number };

export async function apiRequest<T>(
  path: string,
  { timeoutMs = 15000, ...options }: ApiRequestOptions = {},
): Promise<T> {
  const token = tokenStore.get();
  const deadline = AbortSignal.timeout(timeoutMs);
  const signal = options.signal ? AbortSignal.any([options.signal, deadline]) : deadline;
  const headers = new Headers(options.headers);
  if (typeof options.body === 'string' && !headers.has('Content-Type'))
    headers.set('Content-Type', 'application/json');
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers, signal });
    if (response.status === 204) return undefined as T;
    const payload = await response.text();
    signal.throwIfAborted();
    let data;
    try {
      data = payload ? JSON.parse(payload) : undefined;
    } catch {
      if (response.ok) throw new Error('서버 응답을 읽을 수 없습니다. 다시 시도해 주세요.');
    }
    if (!response.ok) {
      const detail =
        typeof data?.detail === 'string'
          ? data.detail
          : Array.isArray(data?.detail)
            ? data.detail.find((item: { msg?: string } | null) => typeof item?.msg === 'string')
                ?.msg
            : undefined;
      throw new ApiRequestError(
        detail ||
          (typeof data?.message === 'string' ? data.message : `API 요청 실패 (${response.status})`),
        response.status,
      );
    }
    return data as T;
  } catch (cause) {
    if (signal.aborted) {
      if (signal.reason?.name === 'TimeoutError')
        throw new Error('서버 응답 시간이 초과됐어요. 연결을 확인한 뒤 다시 시도해 주세요.');
      signal.throwIfAborted();
    }
    if (cause instanceof TypeError)
      throw new Error('서버에 연결할 수 없어요. 네트워크 연결을 확인해 주세요.');
    throw cause;
  }
}
