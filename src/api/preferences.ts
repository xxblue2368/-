import { apiRequest } from './client';

export type PreferenceProfile = {
  gender?: 'male' | 'female';
  onboarding_season?: string;
  selected_image_count?: number;
  weights?: Record<string, Record<string, number>>;
};

export function fetchPreferences(signal?: AbortSignal) {
  return apiRequest<PreferenceProfile>('/users/me/preferences', { signal });
}
