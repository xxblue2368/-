import type { AuthUser, BodyProfile, UserConsent } from '../types/api';
import type { AgreementPayload } from '../data/termsData';
import { apiRequest, tokenStore, USE_MOCK_API } from './client';
import { getSessionSnapshot } from '../store/useSessionStore';

// 개발용 Mock 인증입니다. 운영 환경에서는 이 파일의 함수만 FastAPI 인증 API 호출로 교체합니다.
type MockAccount = AuthUser & { passwordHash: string };
const accountsKey = 'modi-mock-accounts-v1';
const hashPassword = async (password: string) => {
  const bytes = new TextEncoder().encode(password);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};
const readAccounts = (): MockAccount[] => JSON.parse(localStorage.getItem(accountsKey) ?? '[]');
const publicUser = ({ passwordHash: _passwordHash, ...user }: MockAccount): AuthUser => user;

export class AuthError extends Error {}

export async function signUp(input: { email: string; password: string; displayName: string; agreements: AgreementPayload[] }): Promise<AuthUser> {
  if (!USE_MOCK_API) {
    const agreed = (code: string) => input.agreements.find((item) => item.termsCode === code)?.agreed === true;
    const data = await apiRequest<{ user_id: string; email: string }>('/auth/register', { method: 'POST', body: JSON.stringify({ email: input.email, password: input.password, display_name: input.displayName, accepted_terms: agreed('OVER_14') && agreed('SERVICE_TERMS'), accepted_privacy_collection: agreed('PRIVACY_COLLECTION'), policy_version: 'v1' }) });
    return { id: data.user_id, email: data.email, displayName: input.displayName };
  }
  const email = input.email.trim().toLowerCase();
  const accounts = readAccounts();
  if (accounts.some((account) => account.email === email)) throw new AuthError('이미 가입된 이메일입니다. 로그인해 주세요.');
  const account: MockAccount = { id: crypto.randomUUID(), email, displayName: input.displayName.trim(), passwordHash: await hashPassword(input.password) };
  localStorage.setItem(accountsKey, JSON.stringify([...accounts, account]));
  return publicUser(account);
}

export async function signIn(input: { email: string; password: string }): Promise<AuthUser> {
  if (!USE_MOCK_API) {
    const data = await apiRequest<{ access_token: string; token_type: string }>('/auth/login', { method: 'POST', body: JSON.stringify({ email: input.email, password: input.password }) });
    tokenStore.set(data.access_token);
    const me = await apiRequest<{ user_id: string; email: string; display_name: string; account_status: string; created_at: string }>('/users/me');
    const [bodyProfile, consentResult] = await Promise.allSettled([
      apiRequest<BodyProfile>('/users/me/body-profile'),
      apiRequest<{ items: UserConsent[] }>('/users/me/consents'),
    ]);
    return {
      id: me.user_id, email: me.email, displayName: me.display_name,
      accountStatus: me.account_status, createdAt: me.created_at,
      ...(bodyProfile.status === 'fulfilled' ? { bodyProfile: bodyProfile.value } : {}),
      ...(consentResult.status === 'fulfilled' ? { consents: consentResult.value.items } : {}),
    };
  }
  const email = input.email.trim().toLowerCase();
  const account = readAccounts().find((candidate) => candidate.email === email);
  if (!account || account.passwordHash !== await hashPassword(input.password)) throw new AuthError('이메일 또는 비밀번호를 확인해 주세요.');
  return publicUser(account);
}

export async function updateMyProfile(input: { displayName: string; currentPassword: string; heightCm: number | null; weightKg: number | null; bodyShape: string | null; bodyConsent: boolean }): Promise<{ displayName: string; bodyProfile: BodyProfile }> {
  const displayName = input.displayName.trim();
  if (!displayName) throw new AuthError('이름을 입력해 주세요.');
  if (!input.currentPassword) throw new AuthError('현재 비밀번호를 입력해 주세요.');
  const bodyProfile = { height_cm: input.heightCm, weight_kg: input.weightKg, body_shape: input.bodyShape };
  if (!USE_MOCK_API) {
    const result = await apiRequest<{ display_name: string; height_cm: number | null; weight_kg: number | null; body_shape: string | null }>('/users/me', {
      method: 'PUT', body: JSON.stringify({ display_name: displayName, current_password: input.currentPassword, body_consent: input.bodyConsent, ...bodyProfile }),
    });
    return { displayName: result.display_name, bodyProfile: { height_cm: result.height_cm, weight_kg: result.weight_kg, body_shape: result.body_shape } };
  }
  const accounts = readAccounts();
  const currentId = getSessionSnapshot().user?.id;
  const current = accounts.find((account) => account.id === currentId);
  if (!current || current.passwordHash !== await hashPassword(input.currentPassword)) throw new AuthError('현재 비밀번호가 올바르지 않습니다.');
  const currentConsents = current.consents ?? [];
  const updatedConsents = [...currentConsents.filter((consent) => consent.purpose !== 'body_ad_personalization'), { purpose: 'body_ad_personalization', granted: input.bodyConsent }];
  const updated = accounts.map((account) => account.id === currentId ? { ...account, displayName, bodyProfile, consents: updatedConsents } : account);
  localStorage.setItem(accountsKey, JSON.stringify(updated));
  return { displayName, bodyProfile };
}
