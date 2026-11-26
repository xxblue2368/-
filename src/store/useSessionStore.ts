import { useSyncExternalStore } from 'react';
import type { AuthUser, CartItem, DemoOrder, Preferences } from '../types/api';
import { tokenStore } from '../api/client';

type State = { user: AuthUser | null; favorites: string[]; cart: CartItem[]; preferences: Preferences; orders: DemoOrder[] };
const initial: State = { user: null, favorites: [], cart: [], preferences: { styles: [], colors: [], creativeStyle: null }, orders: [] };
const storageKey = 'modi-session-v1';
const userStorageKey = (userId: string) => `${storageKey}:user:${encodeURIComponent(userId)}`;
const readState = (key: string): State | null => {
  try {
    const stored = JSON.parse(localStorage.getItem(key) ?? 'null');
    if (!stored || typeof stored !== 'object') return null;
    return { ...initial, ...stored, user: stored.user ?? (stored.userName ? { id: 'legacy-user', email: '', displayName: stored.userName } : null) };
  } catch {
    return null;
  }
};
const legacyState = readState(storageKey);
let state: State = legacyState ?? initial;
// Migrate the existing single-account data to that account's own storage slot.
if (legacyState?.user && !localStorage.getItem(userStorageKey(legacyState.user.id))) {
  localStorage.setItem(userStorageKey(legacyState.user.id), JSON.stringify(legacyState));
}
const persist = (next: State) => localStorage.setItem(next.user ? userStorageKey(next.user.id) : storageKey, JSON.stringify(next));
const listeners = new Set<() => void>();
const setState = (next: State) => { state = next; persist(state); listeners.forEach((listener) => listener()); };

export const sessionActions = {
  login: (user: AuthUser) => {
    if (state.user?.id === user.id) return setState({ ...state, user });
    const accountState = readState(userStorageKey(user.id));
    setState({ ...(accountState ?? initial), user });
  },
  updateUser: (changes: Partial<AuthUser>) => { if (state.user) setState({ ...state, user: { ...state.user, ...changes } }); },
  logout: () => { tokenStore.clear(); setState({ ...initial }); },
  replaceFavorites: (favorites: string[]) => setState({ ...state, favorites }),
  toggleFavorite: (id: string) => setState({ ...state, favorites: state.favorites.includes(id) ? state.favorites.filter((value) => value !== id) : [...state.favorites, id] }),
  savePreferences: (preferences: Preferences) => setState({ ...state, preferences }),
  addToCart: (item: CartItem) => {
    const index = state.cart.findIndex((value) => value.productId === item.productId && value.color === item.color && value.size === item.size);
    const cart = index < 0 ? [...state.cart, item] : state.cart.map((value, i) => i === index ? { ...value, quantity: value.quantity + item.quantity } : value);
    setState({ ...state, cart });
  },
  updateQuantity: (index: number, quantity: number) => setState({ ...state, cart: quantity < 1 ? state.cart.filter((_, i) => i !== index) : state.cart.map((item, i) => i === index ? { ...item, quantity } : item) }),
  createOrder: (total: number) => {
    const order: DemoOrder = { id: crypto.randomUUID(), items: state.cart, total, createdAt: new Date().toISOString() };
    setState({ ...state, cart: [], orders: [order, ...state.orders] }); return order;
  }
};
export function useSessionStore() { return useSyncExternalStore((listener) => { listeners.add(listener); return () => listeners.delete(listener); }, () => state); }
export function getSessionSnapshot() { return state; }
