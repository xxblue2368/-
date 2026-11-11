import { apiRequest, USE_MOCK_API } from './client';

export type OnboardingCard = {
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

export async function recordConsent(purpose: string, granted: boolean) {
  if (USE_MOCK_API) return { purpose, granted };
  return apiRequest('/users/me/consents', {
    method: 'POST',
    body: JSON.stringify({ purpose, granted, policy_version: 'v1' }),
  });
}

export async function saveBodyProfile(input: {
  height_cm: number | null;
  weight_kg: number | null;
  body_shape: string | null;
}) {
  if (USE_MOCK_API) return { saved: true };
  return apiRequest('/users/me/body-profile', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function startOnboarding() {
  if (USE_MOCK_API) return { onboarding_session_id: 'mock-onboarding-session', target_selection_count: 8 };
  return apiRequest<{ onboarding_session_id: string; target_selection_count: number }>('/onboarding/sessions', { method: 'POST' });
}

export async function fetchOnboardingCards() {
  if (USE_MOCK_API) {
    return {
      card_set_id: 'mock-card-set',
      version: 'mock',
      target_selection_count: 4,
      cards: Array.from({ length: 12 }, (_, position) => ({
        card_id: `mock-card-${position + 1}`,
        card_key: `style-${position + 1}`,
        image_url: `https://images.unsplash.com/photo-${[
          '1483985988355-763728e1935b', '1515886657613-9f3515b0c78f', '1539109136881-3be0616acf4b',
          '1529139574466-a303027c1d8b', '1487222477894-8943e31ef7b2', '1539533018447-63fcce2678e3',
          '1551028719-00167b16eac5', '1541099649105-f69ad21f3246', '1598032895397-b9472444bf93',
          '1434389677669-e08b4cac3105', '1490481651871-ab68de25d43d', '1483985988355-763728e1935b',
        ][position]}?auto=format&fit=crop&w=480&q=80`,
        position,
        style_tags: ['casual'],
        mood_tags: ['simple'],
        usage_tags: ['everyday'],
        season_tags: ['spring'],
      })),
    } satisfies OnboardingCards;
  }
  return apiRequest<OnboardingCards>('/onboarding/cards');
}

export async function saveOnboardingSelections(sessionId: string, selectedCardIds: string[]) {
  if (USE_MOCK_API) return { selected_count: selectedCardIds.length, required_count: selectedCardIds.length };
  return apiRequest(`/onboarding/sessions/${encodeURIComponent(sessionId)}/selections`, {
    method: 'PUT',
    body: JSON.stringify({ selected_card_ids: selectedCardIds }),
  });
}

export async function completeOnboarding(sessionId: string) {
  if (USE_MOCK_API) return { status: 'completed', initial_preferences: { source: 'mock' } };
  return apiRequest<{ status: string; initial_preferences: Record<string, unknown> }>(`/onboarding/sessions/${encodeURIComponent(sessionId)}/complete`, { method: 'POST' });
}
