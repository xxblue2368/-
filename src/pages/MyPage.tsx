import { USE_MOCK_API } from '../api/client';
import { PreferenceSummary } from '../components/auth/PreferenceSummary';
import { useEffect, useState, type FormEvent } from 'react';
import { updateMyProfile } from '../api/auth';
import { fetchBodyTypes, type BodyTypeOption } from '../api/onboarding';
import { BodyTypePicker } from '../components/auth/BodyTypePicker';
import { SeasonalLookbook } from '../components/auth/SeasonalLookbook';
import {
  BODY_TYPES,
  normalizeBodyShape,
  resolveBodyGender,
  type BodyGender,
} from '../data/bodyTypes';
import { getSelectedAiCandidates } from '../data/aiCandidates';

import { money, navigate, RequireLogin } from '../components/common/Layout';
import { getSessionVersion, sessionActions, useSessionStore } from '../store/useSessionStore';

export function MyPage() {
  const user = useSessionStore((state) => state.user);
  const selections = useSessionStore((state) => state.onboardingSelections);
  const orders = useSessionStore((state) => state.orders);
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [height, setHeight] = useState(user?.bodyProfile?.height_cm?.toString() ?? '');
  const [weight, setWeight] = useState(user?.bodyProfile?.weight_kg?.toString() ?? '');
  const [gender, setGender] = useState<BodyGender | ''>(resolveBodyGender(user));
  const [bodyShape, setBodyShape] = useState(
    normalizeBodyShape(user?.bodyProfile?.body_shape) ?? '',
  );
  const [remoteBodyTypes, setRemoteBodyTypes] = useState<BodyTypeOption[]>([]);
  const [bodyConsent, setBodyConsent] = useState(
    user?.consents?.find((consent) => consent.purpose === 'body_ad_personalization')?.granted ??
      false,
  );
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const savedGender = resolveBodyGender(user);
  const savedShape = BODY_TYPES[savedGender || 'women'].find(
    (option) => option.id === normalizeBodyShape(user?.bodyProfile?.body_shape),
  );
  const selectedLooks = selections
    ? getSelectedAiCandidates(selections.selectedAiCandidateIds)
    : [];
  const updatedPreferences = new URLSearchParams(location.search).get('preferences') === 'updated';
  const localPreferences = new URLSearchParams(location.search).get('storage') === 'local';

  useEffect(() => {
    setDisplayName(user?.displayName ?? '');
    setHeight(user?.bodyProfile?.height_cm?.toString() ?? '');
    setWeight(user?.bodyProfile?.weight_kg?.toString() ?? '');
    setGender(resolveBodyGender(user));
    setBodyShape(normalizeBodyShape(user?.bodyProfile?.body_shape) ?? '');
    setBodyConsent(
      user?.consents?.find((consent) => consent.purpose === 'body_ad_personalization')?.granted ??
        false,
    );
  }, [user?.id, user?.displayName, user?.bodyProfile, user?.consents, user?.gender]);

  useEffect(() => {
    if (!editing || !gender) return;
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(2000)]);
    void fetchBodyTypes(gender === 'men' ? 'MALE' : 'FEMALE', signal)
      .then((options) => {
        if (!controller.signal.aborted) setRemoteBodyTypes(options);
      })
      .catch(() => {
        if (!controller.signal.aborted) setMessage('체형 목록을 불러오지 못했습니다.');
      });
    return () => controller.abort();
  }, [editing, gender]);

  const cancelEdit = () => {
    setEditing(false);
    setDisplayName(user?.displayName ?? '');
    setCurrentPassword('');
    setHeight(user?.bodyProfile?.height_cm?.toString() ?? '');
    setWeight(user?.bodyProfile?.weight_kg?.toString() ?? '');
    setGender(resolveBodyGender(user));
    setBodyShape(normalizeBodyShape(user?.bodyProfile?.body_shape) ?? '');
    setBodyConsent(
      user?.consents?.find((consent) => consent.purpose === 'body_ad_personalization')?.granted ??
        false,
    );
  };

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || saving) return;
    const version = getSessionVersion();
    setSaving(true);
    setMessage('');
    try {
      const updated = await updateMyProfile({
        displayName,
        currentPassword,
        heightCm: bodyConsent && height ? Number(height) : null,
        weightKg: bodyConsent && weight ? Number(weight) : null,
        bodyShape: bodyConsent ? bodyShape || null : null,
        bodyConsent,
        previousBodyConsent: !!user.consents?.some(
          ({ purpose, granted }) => purpose === 'body_ad_personalization' && granted,
        ),
      });
      if (version !== getSessionVersion()) return;
      const consents = [
        ...(user?.consents ?? []).filter(
          (consent) => consent.purpose !== 'body_ad_personalization',
        ),
        { purpose: 'body_ad_personalization', granted: bodyConsent },
      ];
      sessionActions.updateUser({
        displayName: updated.displayName,
        gender: gender || undefined,
        bodyProfile: updated.bodyProfile,
        consents,
      });
      if (user && savedGender && gender !== savedGender) {
        sessionActions.saveOnboardingSelections(user.id, {
          selectedProductIds: [],
          selectedAiCandidateIds: {},
        });
      }
      setDisplayName(updated.displayName);
      setCurrentPassword('');
      setEditing(false);
      setMessage('회원 정보를 저장했습니다.');
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : '회원 정보를 저장하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <RequireLogin>
      <section className="section my-page">
        <div className="my-page-heading">
          <div>
            <p className="eyebrow">MY PAGE</p>
            <h1>{user?.displayName}님, 반가워요</h1>
          </div>
          <button
            className="secondary logout"
            onClick={() => {
              sessionActions.logout();
              navigate('/');
            }}
          >
            로그아웃
          </button>
        </div>

        {updatedPreferences && (
          <p className="profile-message my-page-notice" role="status">
            취향이 업데이트되었습니다.
            {localPreferences && ' 이 브라우저의 계정에 저장되었습니다.'}
          </p>
        )}

        <div className="account-card account-profile-card">
          <div>
            <h2>회원 정보</h2>
            {editing ? (
              <form className="profile-edit-form" onSubmit={saveProfile}>
                <label>
                  이름
                  <input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    readOnly={!USE_MOCK_API}
                    maxLength={60}
                    required
                  />
                </label>
                <label>
                  이메일
                  <input value={user?.email ?? ''} readOnly />
                </label>
                <h3>신체 정보</h3>
                <div className="profile-gender" role="group" aria-label="성별">
                  {(
                    [
                      ['women', '여성'],
                      ['men', '남성'],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={gender === value ? 'selected' : ''}
                      aria-pressed={gender === value}
                      onClick={() => {
                        if (gender === value) return;
                        setGender(value);
                        setBodyShape('');
                        setRemoteBodyTypes([]);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <label className="body-consent-toggle">
                  <input
                    type="checkbox"
                    checked={bodyConsent}
                    onChange={(event) => setBodyConsent(event.target.checked)}
                  />{' '}
                  신체 정보를 핏 추천에 사용하는 데 동의합니다.
                </label>
                <div className="body-measurements">
                  <label>
                    키 (cm)
                    <input
                      type="number"
                      min="50"
                      max="250"
                      value={height}
                      disabled={!bodyConsent}
                      onChange={(event) => setHeight(event.target.value)}
                      placeholder="예: 165"
                    />
                  </label>
                  <label>
                    몸무게 (kg)
                    <input
                      type="number"
                      min="10"
                      max="350"
                      value={weight}
                      disabled={!bodyConsent}
                      onChange={(event) => setWeight(event.target.value)}
                      placeholder="예: 55"
                    />
                  </label>
                </div>
                <fieldset className="body-shape-picker" disabled={!bodyConsent}>
                  <legend>체형 (하나 선택)</legend>
                  <BodyTypePicker
                    gender={gender}
                    value={bodyShape}
                    onChange={setBodyShape}
                    remoteOptions={remoteBodyTypes}
                    disabled={!bodyConsent}
                  />
                </fieldset>
                {USE_MOCK_API && (
                  <label>
                    현재 비밀번호
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                      autoComplete="current-password"
                      placeholder="정보 저장을 위해 현재 비밀번호 입력"
                      required
                    />
                  </label>
                )}
                <div className="profile-edit-actions">
                  <button type="button" className="secondary" onClick={cancelEdit}>
                    취소
                  </button>
                  <button type="submit" className="primary" disabled={saving}>
                    {saving ? '저장 중…' : '변경 저장'}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <p>이름: {user?.displayName}</p>
                <p>이메일: {user?.email}</p>
                {user?.createdAt && (
                  <p>가입일: {new Date(user.createdAt).toLocaleDateString('ko-KR')}</p>
                )}
                <button
                  onClick={() => {
                    setMessage('');
                    setEditing(true);
                  }}
                >
                  회원 정보 수정
                </button>
              </>
            )}
            {message && (
              <p className="profile-message" role="status">
                {message}
              </p>
            )}
          </div>
        </div>

        {!editing && (user?.bodyProfile || savedGender) && (
          <div className="account-card body-profile-card">
            <div>
              <h2>저장된 신체 정보</h2>
              <p>
                성별: {savedGender === 'women' ? '여성' : savedGender === 'men' ? '남성' : '미입력'}
              </p>
              <p>
                키: {user?.bodyProfile?.height_cm ? `${user.bodyProfile.height_cm}cm` : '미입력'}
              </p>
              <p>
                몸무게:{' '}
                {user?.bodyProfile?.weight_kg ? `${user.bodyProfile.weight_kg}kg` : '미입력'}
              </p>
              <p>
                체형:{' '}
                {user?.bodyProfile?.body_shape_label_ko ??
                  savedShape?.label ??
                  user?.bodyProfile?.body_shape ??
                  '미입력'}
              </p>
            </div>
          </div>
        )}

        <div className="account-card preference-summary-card">
          <div>
            <h2>현재 상품 취향</h2>
            <PreferenceSummary />
            {selectedLooks.length > 0 && selections && (
              <>
                <h3>이 브라우저에 저장된 AI 시즌 룩북</h3>
                <SeasonalLookbook selections={selections.selectedAiCandidateIds} />
              </>
            )}
          </div>
          <button onClick={() => navigate('/preferences?mode=edit')}>취향 수정</button>
        </div>

        <div className="account-card">
          <h2>맞춤 광고</h2>
          <button onClick={() => navigate('/ads')}>광고 이미지 보기</button>
        </div>
        <div className="account-card order-history-card">
          <div>
            <h2>체험 주문 이력</h2>
            {orders.length ? (
              <div className="orders">
                {orders.map((order) => (
                  <article key={order.id}>
                    <div>
                      <strong>{new Date(order.createdAt).toLocaleDateString('ko-KR')}</strong>
                      <p>
                        {order.items
                          .map((item) => item.product?.name ?? `상품 ${item.productId}`)
                          .join(', ')}
                      </p>
                    </div>
                    <strong>{money(order.total)}</strong>
                  </article>
                ))}
              </div>
            ) : (
              <p>아직 체험 주문이 없어요.</p>
            )}
          </div>
        </div>
      </section>
    </RequireLogin>
  );
}
