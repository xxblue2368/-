import { useEffect, useState } from 'react';
import { AdsPage } from './pages/AdsPage';
import { Layout } from './components/common/Layout';
import { CartPage } from './pages/CartPage';
import { HomePage } from './pages/HomePage';
import { MyPage } from './pages/MyPage';
import { OrderPage } from './pages/OrderPage';
import { PreferencesPage } from './pages/PreferencesPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { ProductsPage } from './pages/ProductsPage';
import { WishlistPage } from './pages/WishlistPage';
import { StyleOnboardingPage } from './pages/StyleOnboardingPage';
import { fetchCurrentUser } from './api/auth';
import { monitorVisits } from './api/events';
import { checkBackendHealth } from './api/health';
import { fetchFavoriteIds } from './api/favorites';
import { ApiRequestError, tokenStore, USE_MOCK_API } from './api/client';
import {
  getFavoritesRevision,
  getSessionVersion,
  sessionActions,
  useSessionStore,
} from './store/useSessionStore';
export default function App() {
  const [path, setPath] = useState(location.pathname + location.search);
  const [restoringSession, setRestoringSession] = useState(
    () => !USE_MOCK_API && !!tokenStore.get(),
  );
  const [sessionError, setSessionError] = useState(false);
  const [backendUnavailable, setBackendUnavailable] = useState(false);
  const [sessionAttempt, retrySession] = useState(0);
  const userId = useSessionStore((state) => state.user?.id);
  const sessionVersion = useSessionStore(getSessionVersion);
  const canTrackVisit = useSessionStore((state) =>
    state.user?.consents?.some(({ purpose, granted }) => purpose === 'personalization' && granted),
  );
  useEffect(() => {
    if (USE_MOCK_API || !userId || !canTrackVisit) return;
    return monitorVisits(sessionVersion);
  }, [userId, canTrackVisit, sessionVersion]);
  useEffect(() => {
    if (USE_MOCK_API) return;
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(5000)]);
    void checkBackendHealth(signal)
      .then(() => {
        if (!controller.signal.aborted) setBackendUnavailable(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) setBackendUnavailable(true);
      });
    return () => controller.abort();
  }, [sessionAttempt]);
  useEffect(() => {
    const sync = () => setPath(location.pathname + location.search);
    addEventListener('popstate', sync);
    return () => removeEventListener('popstate', sync);
  }, []);
  useEffect(() => {
    if (USE_MOCK_API || !tokenStore.get()) {
      setRestoringSession(false);
      return;
    }
    setRestoringSession(true);
    setSessionError(false);
    const version = getSessionVersion();
    const controller = new AbortController();
    fetchCurrentUser(AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]))
      .then((user) => {
        if (version === getSessionVersion()) sessionActions.login(user);
      })
      .catch((cause) => {
        if (controller.signal.aborted || version !== getSessionVersion()) return;
        if (cause instanceof ApiRequestError && [401, 403].includes(cause.status))
          sessionActions.logout();
        else setSessionError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setRestoringSession(false);
      });
    return () => controller.abort();
  }, [sessionAttempt]);
  useEffect(() => {
    if (!userId || USE_MOCK_API) return;
    const controller = new AbortController();
    const version = getSessionVersion();
    const revision = getFavoritesRevision();
    void fetchFavoriteIds(controller.signal)
      .then((ids) => {
        if (!controller.signal.aborted) sessionActions.replaceFavorites(ids, version, revision);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [userId]);
  const pathname = path.split('?')[0];
  const product = pathname.match(/^\/products\/([^/]+)$/);
  const order = pathname.match(/^\/demo-orders\/([^/]+)$/);
  let page =
    pathname === '/' ? (
      <HomePage />
    ) : pathname === '/products' ? (
      <ProductsPage key={path} />
    ) : product ? (
      <ProductDetailPage key={product[1]} id={product[1]} />
    ) : pathname === '/wishlist' ? (
      <WishlistPage />
    ) : pathname === '/ads' ? (
      <AdsPage />
    ) : pathname === '/cart' ? (
      <CartPage />
    ) : pathname === '/mypage' ? (
      <MyPage />
    ) : pathname === '/preferences' || pathname === '/signup' ? (
      <StyleOnboardingPage key={path} />
    ) : pathname === '/preferences/legacy' ? (
      <PreferencesPage />
    ) : pathname === '/login' ? (
      <HomePage />
    ) : order ? (
      <OrderPage id={order[1]} />
    ) : (
      <section className="empty">
        <h1>페이지를 찾을 수 없어요</h1>
      </section>
    );
  return (
    <Layout restoringSession={restoringSession}>
      {(backendUnavailable || (sessionError && !userId && tokenStore.get())) && (
        <div className="section session-recovery" role="status">
          <p>
            {sessionError
              ? '서버 연결이 불안정해 로그인 상태를 확인하지 못했어요.'
              : '서버 연결 상태를 확인하지 못했어요.'}
          </p>
          <button type="button" className="text-button" onClick={() => retrySession((n) => n + 1)}>
            {sessionError ? '로그인 상태 다시 확인' : '서버 상태 다시 확인'}
          </button>
        </div>
      )}
      {restoringSession ? (
        <section className="empty">
          <p role="status">로그인 상태를 확인하고 있어요…</p>
        </section>
      ) : (
        page
      )}
    </Layout>
  );
}
