import { trackBehavior } from '../../api/events';
import type { FormEvent, ReactNode } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { LineIcon } from './LineIcon';
import { GlobalCategoryDrawer } from './GlobalCategoryDrawer';
import { LoginModal } from '../auth/LoginModal';
import { useSessionStore } from '../../store/useSessionStore';

export const money = (value: number) => `${value.toLocaleString('ko-KR')}원`;
export const navigate = (to: string) => {
  window.history.pushState({}, '', to);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo(0, 0);
};

type DrawerContextValue = {
  filterTarget: HTMLDivElement | null;
  openDrawer: () => void;
  closeDrawer: () => void;
  openAccount: () => void;
  openLogin: () => void;
  registerCategoryContent: (active: boolean) => void;
};
const DrawerContext = createContext<DrawerContextValue | null>(null);
export function useNavigationDrawer() {
  const value = useContext(DrawerContext);
  if (!value) throw new Error('상품 필터는 Layout 내부에서 사용해야 합니다.');
  return value;
}

export function Layout({
  children,
  restoringSession = false,
}: {
  children: ReactNode;
  restoringSession?: boolean;
}) {
  const user = useSessionStore((state) => state.user);
  const cart = useSessionStore((state) => state.cart);
  const [query, setQuery] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const search = query.trim().slice(0, 150);
    if (search)
      trackBehavior({ event_type: 'search', event_source: 'search', search_query: search });
    navigate(`/products${search ? `?q=${encodeURIComponent(search)}` : ''}`);
  };
  const [searchOpen, setSearchOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const loginRoute = location.pathname === '/login';
  const loginVisible = !restoringSession && (loginModalOpen || loginRoute);
  const [categoryContentActive, setCategoryContentActive] = useState(false);
  const [filterTarget, setFilterTarget] = useState<HTMLDivElement | null>(null);
  const panel = useRef<HTMLElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const searchToggle = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const openDrawer = useCallback(() => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setDrawerOpen(true);
  }, []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const openLogin = useCallback(() => {
    setDrawerOpen(false);
    setLoginModalOpen(true);
  }, []);
  const closeLogin = useCallback(() => {
    setLoginModalOpen(false);
    if (location.pathname === '/login') {
      window.history.replaceState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }, []);
  const loginSuccess = useCallback(() => {
    setLoginModalOpen(false);
    if (location.pathname === '/login') {
      const requested = new URLSearchParams(location.search).get('returnTo');
      navigate(requested?.startsWith('/') && !requested.startsWith('//') ? requested : '/');
    }
  }, []);
  const openSignup = useCallback(() => {
    setLoginModalOpen(false);
    navigate('/signup');
  }, []);
  const openAccount = useCallback(() => {
    setDrawerOpen(false);
    if (user) navigate('/mypage');
    else openLogin();
  }, [user, openLogin]);
  const registerCategoryContent = useCallback(
    (active: boolean) => setCategoryContentActive(active),
    [],
  );
  const context = useMemo(
    () => ({
      filterTarget,
      openDrawer,
      closeDrawer,
      openAccount,
      openLogin,
      registerCategoryContent,
    }),
    [filterTarget, openDrawer, closeDrawer, openAccount, openLogin, registerCategoryContent],
  );
  const accountRouteActive = location.pathname === '/mypage' || location.pathname === '/login';

  useEffect(() => {
    const close = () => {
      setDrawerOpen(false);
      setSearchOpen(false);
    };
    window.addEventListener('popstate', close);
    return () => window.removeEventListener('popstate', close);
  }, []);
  useEffect(() => {
    if (searchOpen) searchInput.current?.focus();
  }, [searchOpen]);
  useEffect(() => {
    if (!drawerOpen) return;
    const previousFocus = opener.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = requestAnimationFrame(() =>
      panel.current?.querySelector<HTMLButtonElement>('button')?.focus(),
    );
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setDrawerOpen(false);
      }
      if (event.key !== 'Tab') return;
      const elements = Array.from(
        panel.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not(:disabled), input:not(:disabled), [tabindex="0"]',
        ) ?? [],
      ).filter((element) => element.getClientRects().length > 0);
      const first = elements[0],
        last = elements[elements.length - 1];
      if (!panel.current?.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first)?.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKeyDown);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [drawerOpen]);

  return (
    <DrawerContext.Provider value={context}>
      <div inert={drawerOpen || loginVisible}>
        <header className="header" inert={restoringSession}>
          <a
            className="brand"
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigate('/');
            }}
          >
            ERIN
          </a>
          <div className="header-icons">
            <button
              ref={searchToggle}
              type="button"
              className="header-icon"
              aria-label="상품 검색"
              aria-expanded={searchOpen}
              aria-controls="header-search"
              onClick={() => setSearchOpen((value) => !value)}
            >
              <LineIcon name="search" />
            </button>
            <a
              className="header-icon"
              href={user ? '/mypage' : '/login'}
              aria-label={user ? '마이' : '로그인'}
              onClick={(e) => {
                e.preventDefault();
                if (user) navigate('/mypage');
                else openLogin();
              }}
            >
              <LineIcon name="user" />
            </a>
            <a
              className="header-icon"
              href="/wishlist"
              aria-label="찜"
              onClick={(e) => {
                e.preventDefault();
                if (user) navigate('/wishlist');
                else openLogin();
              }}
            >
              <LineIcon name="heart" />
            </a>
            <a
              className="header-icon"
              href="/cart"
              aria-label={`장바구니${cart.length ? ` (${cart.length})` : ''}`}
              onClick={(e) => {
                e.preventDefault();
                if (user) navigate('/cart');
                else openLogin();
              }}
            >
              <LineIcon name="bag" />
              {cart.length > 0 && <span className="cart-count">{cart.length}</span>}
            </a>
            <button
              type="button"
              className="header-icon"
              aria-label="메뉴 열기"
              aria-expanded={drawerOpen}
              aria-controls="navigation-drawer"
              onClick={openDrawer}
            >
              <LineIcon name="menu" />
            </button>
          </div>
        </header>
        <div
          id="header-search"
          className={`header-search-panel${searchOpen ? ' is-open' : ''}`}
          inert={!searchOpen}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setSearchOpen(false);
              searchToggle.current?.focus();
            }
          }}
        >
          <div className="header-search-inner">
            <form className="search" onSubmit={submit}>
              <input
                ref={searchInput}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="상품을 검색하세요"
                aria-label="상품 검색"
              />
              <button>검색</button>
            </form>
          </div>
        </div>
        <main>{children}</main>
      </div>
      <div
        className={`drawer-backdrop${drawerOpen ? ' is-open' : ''}`}
        aria-hidden="true"
        onClick={closeDrawer}
      />
      <aside
        ref={panel}
        id="navigation-drawer"
        className={`navigation-drawer${drawerOpen ? ' is-open' : ''}`}
        role="dialog"
        aria-modal={drawerOpen ? true : undefined}
        aria-labelledby="drawer-title"
        inert={!drawerOpen}
        aria-hidden={!drawerOpen}
      >
        <div className="drawer-heading">
          <h2 id="drawer-title">ERIN</h2>
          <button
            type="button"
            className="drawer-close"
            aria-label="메뉴 닫기"
            onClick={closeDrawer}
          >
            <LineIcon name="close" />
          </button>
        </div>
        <div className="drawer-filter-slot" ref={setFilterTarget} />
        {!categoryContentActive && (
          <GlobalCategoryDrawer
            accountActive={accountRouteActive}
            closeDrawer={closeDrawer}
            openProducts={navigate}
            openAccount={openAccount}
          />
        )}
      </aside>
      {loginVisible && (
        <LoginModal onClose={closeLogin} onSuccess={loginSuccess} onSignup={openSignup} />
      )}
    </DrawerContext.Provider>
  );
}

export function RequireLogin({ children }: { children: ReactNode }) {
  const user = useSessionStore((state) => state.user);
  const { openLogin } = useNavigationDrawer();
  if (!user)
    return (
      <section className="empty">
        <h1>로그인이 필요한 기능이에요</h1>
        <p>저장과 주문은 회원에게만 제공됩니다.</p>
        <button onClick={openLogin}>로그인하기</button>
      </section>
    );
  return <>{children}</>;
}
