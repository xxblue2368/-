import { getSessionSnapshot, getSessionVersion } from '../store/useSessionStore';
import { apiRequest, ApiRequestError, tokenStore, USE_MOCK_API } from './client';

type Behavior =
  | { event_type: 'search'; event_source: 'search'; search_query: string }
  | {
      event_type: 'product_click' | 'recommendation_click';
      event_source: 'search' | 'recommendation' | 'direct';
      article_id: string;
      recommendation_run_id?: string;
    };

type Visit = {
  version: number;
  token: string;
  id: Promise<string>;
  heartbeatPending: boolean;
};

let visit: Visit | undefined;

function postToVisit(current: Visit, id: string, action: 'heartbeat' | 'end', payload?: object) {
  return apiRequest(`/sessions/${encodeURIComponent(id)}/${action}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${current.token}` },
    body: payload && JSON.stringify(payload),
    keepalive: action === 'end',
    signal: AbortSignal.timeout(8000),
  });
}

function endVisit(current: Visit) {
  if (visit !== current) return;
  visit = undefined;
  // The original token still identifies the visit if logout already cleared storage.
  void current.id.then((id) => postToVisit(current, id, 'end')).catch(() => {});
}

function staleVisit(error: unknown) {
  return error instanceof ApiRequestError && [404, 409].includes(error.status);
}

export function monitorVisits(version: number) {
  let lastInteraction = Date.now();
  const markActivity = () => {
    lastInteraction = Date.now();
  };
  const heartbeat = () => {
    const current = visit;
    if (!current || current.version !== version || current.heartbeatPending) return;
    if (version !== getSessionVersion() || tokenStore.get() !== current.token) {
      endVisit(current);
      return;
    }
    const status = document.hidden
      ? 'hidden'
      : Date.now() - lastInteraction >= 60000
        ? 'idle'
        : 'active';
    current.heartbeatPending = true;
    void current.id
      .then((id) => {
        if (visit === current)
          return postToVisit(current, id, 'heartbeat', {
            status,
            page: location.pathname.slice(0, 500),
          });
      })
      .catch((error) => {
        if (visit === current && staleVisit(error)) visit = undefined;
      })
      .finally(() => {
        current.heartbeatPending = false;
      });
  };
  const close = () => {
    if (visit?.version === version) endVisit(visit);
  };
  const handlePageHide = (event: PageTransitionEvent) => {
    if (!event.persisted) close();
  };
  const interval = window.setInterval(heartbeat, 30000);
  document.addEventListener('pointerdown', markActivity, { passive: true });
  document.addEventListener('keydown', markActivity);
  document.addEventListener('visibilitychange', heartbeat);
  window.addEventListener('pagehide', handlePageHide);
  return () => {
    window.clearInterval(interval);
    document.removeEventListener('pointerdown', markActivity);
    document.removeEventListener('keydown', markActivity);
    document.removeEventListener('visibilitychange', heartbeat);
    window.removeEventListener('pagehide', handlePageHide);
    close();
  };
}

export function trackBehavior(event: Behavior) {
  const { user } = getSessionSnapshot();
  const token = tokenStore.get();
  if (
    USE_MOCK_API ||
    !token ||
    !user?.consents?.some(({ purpose, granted }) => purpose === 'personalization' && granted)
  )
    return;

  const version = getSessionVersion();
  const payload = {
    ...event,
    event_id: crypto.randomUUID(),
    occurred_at: new Date().toISOString(),
    metadata: {},
  };

  async function send(authToken: string, retry: boolean) {
    if (version !== getSessionVersion() || tokenStore.get() !== authToken) return;
    if (visit && (visit.version !== version || visit.token !== authToken)) endVisit(visit);
    const current = visit ?? {
      version,
      token: authToken,
      id: apiRequest<{ session_id: string }>('/sessions', {
        method: 'POST',
        signal: AbortSignal.timeout(8000),
      }).then(({ session_id }) => session_id),
      heartbeatPending: false,
    };
    visit = current;
    let session_id: string | undefined;
    try {
      session_id = await current.id;
      if (visit !== current || version !== getSessionVersion() || tokenStore.get() !== authToken)
        return;
      await apiRequest('/events/batch', {
        method: 'POST',
        signal: AbortSignal.timeout(8000),
        body: JSON.stringify({ session_id, events: [payload] }),
      });
    } catch (error) {
      if (visit !== current) return;
      if (!session_id || staleVisit(error)) visit = undefined;
      if (retry && staleVisit(error)) await send(authToken, false);
    }
  }

  void send(token, true);
}
