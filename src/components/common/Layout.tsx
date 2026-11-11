import type { FormEvent, ReactNode } from 'react';
import { useState } from 'react';
import { useSessionStore } from '../../store/useSessionStore';

export const money = (value: number) => `${value.toLocaleString('ko-KR')}원`;
export const navigate = (to: string) => { window.history.pushState({}, '', to); window.dispatchEvent(new PopStateEvent('popstate')); };

export function Layout({ children }: { children: ReactNode }) {
  const { user, cart } = useSessionStore();
  const [query, setQuery] = useState('');
  const submit = (event: FormEvent) => { event.preventDefault(); navigate(`/products${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''}`); };
  return <><header className="header"><a className="brand" href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }}>hello world</a><nav><a href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }}>홈</a><a href="/products" onClick={(e) => { e.preventDefault(); navigate('/products'); }}>상품</a><a href="/wishlist" onClick={(e) => { e.preventDefault(); navigate('/wishlist'); }}>찜</a><a href="/cart" onClick={(e) => { e.preventDefault(); navigate('/cart'); }}>장바구니 {cart.length ? `(${cart.length})` : ''}</a><a href={user ? '/mypage' : '/login'} onClick={(e) => { e.preventDefault(); navigate(user ? '/mypage' : '/login'); }}>{user ? '마이' : '로그인'}</a></nav><form className="search" onSubmit={submit}><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="상품을 검색하세요" aria-label="상품 검색" /><button>검색</button></form></header><main>{children}</main></>;
}

export function RequireLogin({ children }: { children: ReactNode }) {
  const { user } = useSessionStore();
  if (!user) return <section className="empty"><h1>로그인이 필요한 기능이에요</h1><p>저장과 주문은 회원에게만 제공됩니다.</p><button onClick={() => navigate(`/login?returnTo=${encodeURIComponent(location.pathname)}`)}>로그인하기</button></section>;
  return <>{children}</>;
}
