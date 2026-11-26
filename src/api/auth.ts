import { recordConsent, saveBodyProfile } from './onboarding';
import type { AuthUser, BodyProfile, UserConsent } from '../types/api';
import type { AgreementPayload } from '../data/termsData';
import { apiRequest, tokenStore, USE_MOCK_API } from './client';
import { loginDemoAccount, registerDemoAccount, updateDemoAccount } from './demoAuth';

export class AuthError extends Error {}

export async function signUp(
  input: {
    email: string;
    password: string;
    displayName: string;
    agreements: AgreementPayload[];
  },
  signal?: AbortSignal,
): Promise<AuthUser> {
  if (USE_MOCK_API) return registerDemoAccount(input);
  const agreed = (code: string) =>
    input.agreements.find((item) => item.termsCode === code)?.agreed === true;
  const data = await apiRequest<{ user_id: string; email: string }>('/auth/register', {
    method: 'POST',
    signal,
    body: JSON.stringify({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      display_name: input.displayName.trim(),
      accepted_terms: agreed('OVER_14') && agreed('SERVICE_TERMS'),
      accepted_privacy_collection: agreed('PRIVACY_COLLECTION'),
      policy_version: 'v1',
    }),
  });
  if (!data?.user_id) throw new AuthError('가입 응답에 사용자 ID가 없습니다.');
  return { id: data.user_id, email: data.email, displayName: input.displayName.trim() };
}

export async function fetchUserConsents(signal?: AbortSignal): Promise<UserConsent[]> {
  const data = await apiRequest<{ items: UserConsent[] }>('/users/me/consents', { signal });
  if (!Array.isArray(data?.items)) throw new AuthError('개인화 동의 정보를 확인하지 못했습니다.');
  return data.items;
}

export async function fetchCurrentUser(signal?: AbortSignal): Promise<AuthUser> {
  const me = await apiRequest<{
    user_id: string;
    email: string;
    display_name: string;
    account_status: string;
    created_at: string;
  }>('/users/me', { signal });
  const [bodyProfile, consentResult] = await Promise.allSettled([
    apiRequest<BodyProfile>('/users/me/body-profile', { signal }),
    fetchUserConsents(signal),
  ]);
  return {
    id: me.user_id,
    email: me.email,
    displayName: me.display_name,
    accountStatus: me.account_status,
    createdAt: me.created_at,
    ...(bodyProfile.status === 'fulfilled' ? { bodyProfile: bodyProfile.value } : {}),
    ...(consentResult.status === 'fulfilled' ? { consents: consentResult.value } : {}),
  };
}

export async function signIn(
  input: { email: string; password: string },
  signal?: AbortSignal,
): Promise<AuthUser> {
  if (USE_MOCK_API) {
    tokenStore.clear();
    return loginDemoAccount(input);
  }
  const data = await apiRequest<{ access_token: string; token_type: string }>('/auth/login', {
    method: 'POST',
    signal,
    body: JSON.stringify({ email: input.email.trim().toLowerCase(), password: input.password }),
  });
  if (!data.access_token) throw new AuthError('로그인 응답에 인증 토큰이 없습니다.');
  tokenStore.set(data.access_token);
  try {
    return await fetchCurrentUser(signal);
  } catch (cause) {
    if (tokenStore.get() === data.access_token) tokenStore.clear();
    throw cause;
  }
}

export async function updateMyProfile(input: {
  displayName: string;
  currentPassword: string;
  heightCm: number | null;
  weightKg: number | null;
  bodyShape: string | null;
  bodyConsent: boolean;
  previousBodyConsent: boolean;
}): Promise<{ displayName: string; bodyProfile: BodyProfile }> {
  const displayName = input.displayName.trim();
  if (USE_MOCK_API && !displayName) throw new AuthError('이름을 입력해 주세요.');
  if (USE_MOCK_API && !input.currentPassword) throw new AuthError('현재 비밀번호를 입력해 주세요.');
  const bodyProfile = {
    height_cm: input.heightCm,
    weight_kg: input.weightKg,
    body_shape: input.bodyShape,
  };
  if (USE_MOCK_API) {
    return updateDemoAccount({
      displayName,
      currentPassword: input.currentPassword,
      bodyProfile,
      bodyConsent: input.bodyConsent,
    });
  }
  const signal = AbortSignal.timeout(10000);
  if (input.bodyConsent !== input.previousBodyConsent) {
    await recordConsent('body_ad_personalization', input.bodyConsent, signal);
  }
  if (input.bodyConsent && Object.values(bodyProfile).some((value) => value != null)) {
    await saveBodyProfile(bodyProfile, signal);
  } else {
    await apiRequest('/users/me/body-profile', { method: 'DELETE', signal });
  }
  return {
    displayName,
    bodyProfile: await apiRequest<BodyProfile>('/users/me/body-profile', { signal }),
  };
}
