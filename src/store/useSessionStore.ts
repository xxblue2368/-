import { useSyncExternalStore } from 'react';
import type { AuthUser, CartItem, DemoOrder, Preferences } from '../types/api';
import type { AiCandidateSelections } from '../data/aiCandidates';
import { tokenStore, USE_MOCK_API } from '../api/client';

type OnboardingSelections = {
  selectedProductIds: string[];
  selectedAiCandidateIds: AiCandidateSelections;
};

type State = {
  user: AuthUser | null;
  favorites: string[];
  cart: CartItem[];
  preferences: Preferences;
  onboardingSelections: OnboardingSelections | null;
  orders: DemoOrder[];
};
const initial: State = {
  user: null,
  favorites: [],
  cart: [],
  preferences: { styles: [], colors: [], creativeStyle: null },
  onboardingSelections: null,
  orders: [],
};
const storageKey = 'modi-session-v1';
const userStorageKey = (userId: string) => `${storageKey}:user:${encodeURIComponent(userId)}`;
const readState = (key: string): State | null => {
  try {
    const stored = JSON.parse(localStorage.getItem(key) ?? 'null');
    if (!stored || typeof stored !== 'object') return null;
    return {
      ...initial,
      ...stored,
      user:
        stored.user ??
        (stored.userName ? { id: 'legacy-user', email: '', displayName: stored.userName } : null),
    };
  } catch {
    return null;
  }
};
const legacyState = readState(storageKey);
const activeId = localStorage.getItem(`${storageKey}:active-user`);
const savedDemoState =
  (USE_MOCK_API || !tokenStore.get()) && activeId?.startsWith('demo-')
    ? readState(userStorageKey(activeId))
    : null;
let state: State = savedDemoState?.user?.id === activeId ? savedDemoState : initial;
// Migrate the existing single-account data to that account's own storage slot.
if (legacyState?.user && !localStorage.getItem(userStorageKey(legacyState.user.id))) {
  localStorage.setItem(userStorageKey(legacyState.user.id), JSON.stringify(legacyState));
}
const persist = (next: State) => {
  localStorage.setItem(next.user ? userStorageKey(next.user.id) : storageKey, JSON.stringify(next));
  if (next.user) localStorage.setItem(`${storageKey}:active-user`, next.user.id);
  else localStorage.removeItem(`${storageKey}:active-user`);
};
let sessionVersion = 0;
let favoritesRevision = 0;
export const getSessionVersion = () => sessionVersion;
export const getFavoritesRevision = () => favoritesRevision;
const listeners = new Set<() => void>();
const setState = (next: State) => {
  state = next;
  persist(state);
  listeners.forEach((listener) => listener());
};

function currentBodyProfile(incoming: AuthUser, saved?: AuthUser | null) {
  return incoming.bodyProfile ?? saved?.bodyProfile;
}

export const sessionActions = {
  login: (user: AuthUser) => {
    sessionVersion++;
    if (state.user?.id === user.id)
      return setState({
        ...state,
        user: {
          ...user,
          gender: user.gender ?? state.user.gender,
          bodyProfile: currentBodyProfile(user, state.user),
        },
      });
    const accountState = readState(userStorageKey(user.id));
    setState({
      ...(accountState ?? initial),
      user: {
        ...user,
        gender: user.gender ?? accountState?.user?.gender,
        bodyProfile: currentBodyProfile(user, accountState?.user),
      },
    });
  },
  updateUser: (changes: Partial<AuthUser>) => {
    if (state.user) setState({ ...state, user: { ...state.user, ...changes } });
  },
  logout: () => {
    sessionVersion++;
    tokenStore.clear();
    setState({ ...initial });
  },
  replaceFavorites: (favorites: string[], version: number, revision: number) => {
    if (version === sessionVersion && revision === favoritesRevision)
      setState({ ...state, favorites: [...new Set(favorites)] });
  },
  setFavorite: (id: string, agreed: boolean, version: number) => {
    if (version !== sessionVersion) return;
    favoritesRevision++;
    const favorites = state.favorites.filter((value) => value !== id);
    setState({ ...state, favorites: agreed ? [...favorites, id] : favorites });
  },
  toggleFavorite: (id: string) =>
    setState({
      ...state,
      favorites: state.favorites.includes(id)
        ? state.favorites.filter((value) => value !== id)
        : [...state.favorites, id],
    }),
  savePreferences: (preferences: Preferences) => setState({ ...state, preferences }),
  saveOnboardingSelections: (userId: string, onboardingSelections: OnboardingSelections) => {
    if (state.user?.id === userId) setState({ ...state, onboardingSelections });
  },
  addToCart: (item: CartItem) => {
    const index = state.cart.findIndex(
      (value) =>
        value.productId === item.productId &&
        value.color === item.color &&
        value.size === item.size,
    );
    const cart =
      index < 0
        ? [...state.cart, item]
        : state.cart.map((value, i) =>
            i === index ? { ...value, quantity: value.quantity + item.quantity } : value,
          );
    setState({ ...state, cart });
  },
  updateQuantity: (index: number, quantity: number) =>
    setState({
      ...state,
      cart:
        quantity < 1
          ? state.cart.filter((_, i) => i !== index)
          : state.cart.map((item, i) => (i === index ? { ...item, quantity } : item)),
    }),
  createOrder: (total: number, items = state.cart) => {
    const order: DemoOrder = {
      id: crypto.randomUUID(),
      items,
      total,
      createdAt: new Date().toISOString(),
    };
    setState({ ...state, cart: [], orders: [order, ...state.orders] });
    return order;
  },
};
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export function useSessionStore<T>(selector: (value: State) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state));
}
export function getSessionSnapshot() {
  return state;
}
