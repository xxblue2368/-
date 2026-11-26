import { API_BASE_URL, apiRequest, USE_MOCK_API } from './client';
import { saveDemoBodyProfile, saveDemoConsent } from './demoAuth';
import type { AiCandidateSelections } from '../data/aiCandidates';

export type OnboardingGender = 'male' | 'female';
export type OnboardingPhase = 1 | 2;

export type OnboardingCard = {
  phase?: OnboardingPhase;
  card_id: string;
  card_key: string;
  image_url: string;
  position: number;
  style_tags: string[];
  mood_tags: string[];
  usage_tags: string[];
  season_tags: string[];
};

export type OnboardingCards = {
  card_set_id: string;
  version: string;
  target_selection_count: number;
  cards: OnboardingCard[];
};

export async function recordConsent(purpose: string, granted: boolean, signal?: AbortSignal) {
  if (USE_MOCK_API) {
    saveDemoConsent(purpose, granted);
    return { purpose, granted };
  }
  return apiRequest('/users/me/consents', {
    method: 'POST',
    signal,
    body: JSON.stringify({ purpose, granted, policy_version: 'v1' }),
  });
}

export async function saveBodyProfile(
  input: {
    height_cm: number | null;
    weight_kg: number | null;
    body_shape: string | null;
  },
  signal?: AbortSignal,
) {
  if (USE_MOCK_API) {
    saveDemoBodyProfile(input);
    return { saved: true };
  }
  return apiRequest('/users/me/body-profile', {
    method: 'PUT',
    signal,
    body: JSON.stringify(input),
  });
}

export async function saveStyleSelections(
  input: {
    selectedProductIds: string[];
    selectedAiCandidateIds: AiCandidateSelections;
  },
  signal?: AbortSignal,
): Promise<'server' | 'local'> {
  if (USE_MOCK_API) return 'local';
  try {
    // The published API collection does not yet define this route or payload.
    // A missing route falls back to the account-scoped browser store.
    await apiRequest('/users/me/preferences', {
      method: 'PUT',
      signal,
      body: JSON.stringify({
        selected_product_ids: input.selectedProductIds,
        selected_ai_candidate_ids: input.selectedAiCandidateIds,
      }),
    });
    return 'server';
  } catch {
    return 'local';
  }
}

export async function startOnboarding(gender: OnboardingGender = 'female', signal?: AbortSignal) {
  if (USE_MOCK_API)
    return { onboarding_session_id: 'mock-onboarding-session', target_selection_count: 8 };
  return apiRequest<{ onboarding_session_id: string; target_selection_count: number }>(
    '/onboarding/sessions',
    { method: 'POST', body: JSON.stringify({ gender }), signal },
  );
}

export async function fetchOnboardingCards(
  gender: OnboardingGender = 'female',
  phase: OnboardingPhase = 1,
  signal?: AbortSignal,
): Promise<OnboardingCards> {
  if (USE_MOCK_API) {
    return {
      card_set_id: 'mock-card-set',
      version: 'mock',
      target_selection_count: 4,
      cards: Array.from({ length: 12 }, (_, position) => ({
        phase,
        card_id: `mock-card-${position + 1}`,
        card_key: `style-${position + 1}`,
        image_url: `https://images.unsplash.com/photo-${
          [
            '1483985988355-763728e1935b',
            '1515886657613-9f3515b0c78f',
            '1539109136881-3be0616acf4b',
            '1529139574466-a303027c1d8b',
            '1487222477894-8943e31ef7b2',
            '1539533018447-63fcce2678e3',
            '1551028719-00167b16eac5',
            '1541099649105-f69ad21f3246',
            '1598032895397-b9472444bf93',
            '1434389677669-e08b4cac3105',
            '1490481651871-ab68de25d43d',
            '1483985988355-763728e1935b',
          ][position]
        }?auto=format&fit=crop&w=480&q=80`,
        position,
        style_tags: ['casual'],
        mood_tags: ['simple'],
        usage_tags: ['everyday'],
        season_tags: ['spring'],
      })),
    } satisfies OnboardingCards;
  }
  return apiRequest<OnboardingCards>(`/onboarding/cards?gender=${gender}&phase=${phase}`, {
    signal,
  });
}

export function fetchOnboardingSession(sessionId: string, signal: AbortSignal) {
  return apiRequest<{
    onboarding_session_id: string;
    status: string;
    phase1_count: number;
    phase2_count: number;
    required_per_phase: number;
  }>(`/onboarding/sessions/${encodeURIComponent(sessionId)}`, { signal });
}

export async function saveOnboardingSelections(
  sessionId: string,
  selectedCardIds: string[],
  phase: OnboardingPhase = 1,
  signal?: AbortSignal,
) {
  if (USE_MOCK_API)
    return { selected_count: selectedCardIds.length, required_count: selectedCardIds.length };
  return apiRequest(`/onboarding/sessions/${encodeURIComponent(sessionId)}/selections`, {
    method: 'PUT',
    signal,
    body: JSON.stringify({ phase, selected_card_ids: selectedCardIds }),
  });
}

export async function completeOnboarding(sessionId: string, signal?: AbortSignal) {
  if (USE_MOCK_API) return { status: 'completed', initial_preferences: { source: 'mock' } };
  return apiRequest<{ status: string; initial_preferences: Record<string, unknown> }>(
    `/onboarding/sessions/${encodeURIComponent(sessionId)}/complete`,
    { method: 'POST', signal },
  );
}

export type BodyTypeOption = {
  id: string;
  label: string;
  engLabel?: string;
  imageUrl: string;
  description?: string;
};

export async function fetchBodyTypes(
  gender: 'MALE' | 'FEMALE',
  signal?: AbortSignal,
): Promise<BodyTypeOption[]> {
  if (USE_MOCK_API) return [];
  const group = gender === 'MALE' ? 'men' : 'women';
  const { items } = await apiRequest<{
    items: {
      body_shape_code: string;
      label_ko: string;
      label_en?: string;
      image_url: string;
      sort_order: number;
    }[];
  }>(`/body-shapes?display_group=${group}`, { signal });
  return [...items]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((item) => ({
      id: item.body_shape_code,
      label: item.label_ko,
      engLabel: item.label_en,
      imageUrl: onboardingImageUrl(item.image_url),
    }));
}

export type StyleAnalysis = { image_url?: string; imageUrl?: string; summary?: string };
export async function analyzeStyle(
  input: {
    gender: string;
    height_cm: number;
    weight_kg: number;
    body_shape: string;
    selected_card_ids: string[];
  },
  signal?: AbortSignal,
): Promise<StyleAnalysis> {
  if (USE_MOCK_API) {
    return {
      imageUrl:
        'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?auto=format&fit=crop&w=900&q=80',
      summary: '시연용 스타일 분석 결과',
    };
  }
  return apiRequest<StyleAnalysis>('/onboarding/analyze', {
    method: 'POST',
    body: JSON.stringify(input),
    signal,
  });
}

export function onboardingImageUrl(path: string) {
  const api = new URL(API_BASE_URL + '/', location.origin);
  return new URL(path, api).href;
}
