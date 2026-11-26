import type { AuthUser, BodyProfile } from '../types/api';
import { getSessionSnapshot, sessionActions } from '../store/useSessionStore';

type DemoAccount = AuthUser & { passwordHash: string };
const accountsKey = 'modi-mock-accounts-v1';
export const DEMO_EMAIL = 'demo@erin.local';
export const DEMO_PASSWORD = 'ErinDemo123!';

const hashPassword = async (password: string) => {
  const bytes = new TextEncoder().encode(password);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

const readAccounts = (): DemoAccount[] => {
  try {
    const value = JSON.parse(localStorage.getItem(accountsKey) ?? '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

const saveAccounts = (accounts: DemoAccount[]) =>
  localStorage.setItem(accountsKey, JSON.stringify(accounts));

const publicUser = ({ passwordHash: _passwordHash, ...user }: DemoAccount): AuthUser => user;

export async function registerDemoAccount(input: {
  email: string;
  password: string;
  displayName: string;
}): Promise<AuthUser> {
  const email = input.email.trim().toLowerCase();
  const accounts = readAccounts();
  if (email === DEMO_EMAIL || accounts.some((account) => account.email === email)) {
    throw new Error('이미 가입된 이메일입니다. 로그인해 주세요.');
  }
  const account: DemoAccount = {
    id: `demo-${crypto.randomUUID()}`,
    email,
    displayName: input.displayName.trim(),
    passwordHash: await hashPassword(input.password),
  };
  saveAccounts([...accounts, account]);
  return publicUser(account);
}

export async function loginDemoAccount(input: {
  email: string;
  password: string;
}): Promise<AuthUser> {
  const email = input.email.trim().toLowerCase();
  const accounts = readAccounts();
  let account = accounts.find((candidate) => candidate.email === email);
  if (email === DEMO_EMAIL && input.password === DEMO_PASSWORD && !account) {
    account = {
      id: 'demo-seed',
      email: DEMO_EMAIL,
      displayName: '데모 사용자',
      passwordHash: await hashPassword(DEMO_PASSWORD),
    };
    saveAccounts([...accounts, account]);
  }
  if (!account || account.passwordHash !== (await hashPassword(input.password))) {
    throw new Error('이메일 또는 비밀번호를 확인해 주세요.');
  }
  return publicUser(account);
}

export async function updateDemoAccount(input: {
  displayName: string;
  currentPassword: string;
  bodyProfile: BodyProfile;
  bodyConsent: boolean;
}): Promise<{ displayName: string; bodyProfile: BodyProfile }> {
  const currentId = getSessionSnapshot().user?.id;
  const accounts = readAccounts();
  const account = accounts.find((candidate) => candidate.id === currentId);
  if (!account || account.passwordHash !== (await hashPassword(input.currentPassword))) {
    throw new Error('현재 비밀번호가 올바르지 않습니다.');
  }
  const consents = [
    ...(account.consents ?? []).filter((item) => item.purpose !== 'body_ad_personalization'),
    { purpose: 'body_ad_personalization', granted: input.bodyConsent },
  ];
  saveAccounts(
    accounts.map((candidate) =>
      candidate.id === currentId
        ? { ...candidate, displayName: input.displayName, bodyProfile: input.bodyProfile, consents }
        : candidate,
    ),
  );
  return { displayName: input.displayName, bodyProfile: input.bodyProfile };
}

export function saveDemoBodyProfile(bodyProfile: BodyProfile) {
  const currentId = getSessionSnapshot().user?.id;
  const accounts = readAccounts();
  if (!currentId || !accounts.some((account) => account.id === currentId)) return;
  saveAccounts(
    accounts.map((account) => (account.id === currentId ? { ...account, bodyProfile } : account)),
  );
  sessionActions.updateUser({ bodyProfile });
}

export function saveDemoConsent(purpose: string, granted: boolean) {
  const currentId = getSessionSnapshot().user?.id;
  const accounts = readAccounts();
  const account = accounts.find((candidate) => candidate.id === currentId);
  if (!account) return;
  const consents = [
    ...(account.consents ?? []).filter((item) => item.purpose !== purpose),
    { purpose, granted },
  ];
  saveAccounts(
    accounts.map((candidate) =>
      candidate.id === currentId ? { ...candidate, consents } : candidate,
    ),
  );
  sessionActions.updateUser({ consents });
}
