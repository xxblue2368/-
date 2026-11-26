import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  completeOnboarding,
  fetchBodyTypes,
  fetchOnboardingCards,
  fetchOnboardingSession,
  onboardingImageUrl,
  recordConsent,
  saveBodyProfile,
  saveOnboardingSelections,
  startOnboarding,
  type BodyTypeOption,
  type OnboardingCard,
  type OnboardingPhase,
} from '../api/onboarding';
import { signIn, signUp } from '../api/auth';
import { ApiRequestError, USE_MOCK_API } from '../api/client';
import { BodyTypePicker } from '../components/auth/BodyTypePicker';
import { TermsAgreementSection } from '../components/auth/TermsAgreementSection';
import { navigate } from '../components/common/Layout';
import { resolveBodyGender, type BodyGender } from '../data/bodyTypes';
import { createEmptyAgreements, type AgreementPayload } from '../data/termsData';
import { getSessionSnapshot, sessionActions, useSessionStore } from '../store/useSessionStore';
import '../style-onboarding.css';

type Step = 'body' | 'account' | OnboardingPhase | 'result';
const REQUIRED = 4;

export function StyleOnboardingPage() {
  const user = useSessionStore((state) => state.user);
  const isEditMode = new URLSearchParams(location.search).get('mode') === 'edit';
  const [step, setStep] = useState<Step>(isEditMode ? 1 : user ? 'body' : 'account');
  const [gender, setGender] = useState<BodyGender | ''>('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [bodyType, setBodyType] = useState<string | null>(null);
  const [remoteBodyTypes, setRemoteBodyTypes] = useState<BodyTypeOption[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [agreements, setAgreements] = useState<AgreementPayload[]>(createEmptyAgreements);
  const [requiredValid, setRequiredValid] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [bodyConsent, setBodyConsent] = useState(false);
  const [bodyError, setBodyError] = useState('');
  const [consent, setConsent] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [cardsByPhase, setCardsByPhase] = useState<
    Partial<Record<OnboardingPhase, OnboardingCard[]>>
  >({});
  const [selections, setSelections] = useState<Record<OnboardingPhase, string[]>>({ 1: [], 2: [] });
  const session = useRef<{ userId: string; gender: string; id: string } | null>(null);

  const activeGender = gender || resolveBodyGender(user);
  const apiGender = activeGender === 'men' ? 'male' : 'female';
  const phase = step === 1 || step === 2 ? step : null;
  const allowed = !!user?.consents?.some(
    ({ purpose, granted }) => purpose === 'personalization' && granted,
  );
  const serverUser = !!user && !USE_MOCK_API && !user.id.startsWith('demo-');
  const validBody =
    !!gender &&
    !working &&
    (!bodyConsent ||
      (remoteBodyTypes.some(({ id }) => id === bodyType) &&
        (!height || (Number(height) >= 50 && Number(height) <= 250)) &&
        (!weight || (Number(weight) >= 10 && Number(weight) <= 350))));

  useEffect(() => {
    if (step !== 'body' || !gender || !bodyConsent) return;
    setBodyError('');
    const controller = new AbortController();
    void fetchBodyTypes(
      gender === 'men' ? 'MALE' : 'FEMALE',
      AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]),
    )
      .then((options) => {
        if (!controller.signal.aborted) setRemoteBodyTypes(options);
      })
      .catch(() => {
        if (!controller.signal.aborted) setBodyError('체형 목록을 불러오지 못했습니다.');
      });
    return () => controller.abort();
  }, [gender, step, bodyConsent, attempt]);

  useEffect(() => {
    if (!phase || !activeGender || !serverUser || !allowed) return;
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]);
    setLoadError('');
    void fetchOnboardingCards(apiGender, phase, signal)
      .then(({ cards }) => {
        if (controller.signal.aborted) return;
        const sorted = cards
          .filter((card) => card.phase == null || card.phase === phase)
          .sort((left, right) => left.position - right.position);
        if (sorted.length < REQUIRED) throw new Error('선택할 수 있는 카드가 부족합니다.');
        setCardsByPhase((previous) => ({ ...previous, [phase]: sorted }));
        setSelections((previous) => ({
          ...previous,
          [phase]: previous[phase].filter((id) => sorted.some((card) => card.card_id === id)),
        }));
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setLoadError(cause instanceof Error ? cause.message : '카드를 불러오지 못했습니다.');
      });
    return () => controller.abort();
  }, [phase, activeGender, apiGender, serverUser, user?.id, allowed, attempt]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (working || !requiredValid || USE_MOCK_API) return;
    const normalizedEmail = email.trim().toLowerCase();
    const input = { email: normalizedEmail, password, displayName: name, agreements };
    setWorking(true);
    setError('');
    try {
      if (registeredEmail !== normalizedEmail) {
        await signUp(input, AbortSignal.timeout(10000));
        setRegisteredEmail(normalizedEmail);
      }
      const signedIn = await signIn(input, AbortSignal.timeout(10000));
      sessionActions.login(signedIn);
      setPassword('');
      setStep('body');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '가입을 완료하지 못했습니다.');
    } finally {
      setWorking(false);
    }
  }

  async function saveBody() {
    if (!user || !gender || !validBody) return;
    setWorking(true);
    setError('');
    const profile = {
      height_cm: height ? Number(height) : null,
      weight_kg: weight ? Number(weight) : null,
      body_shape: bodyType,
    };
    try {
      if (bodyConsent) {
        await recordConsent('body_ad_personalization', true, AbortSignal.timeout(10000));
        if (getSessionSnapshot().user?.id !== user.id) return;
        await saveBodyProfile(profile, AbortSignal.timeout(10000));
      }
      if (getSessionSnapshot().user?.id !== user.id) return;
      sessionActions.updateUser({
        gender,
        ...(bodyConsent
          ? {
              bodyProfile: {
                ...profile,
                body_shape_label_ko: remoteBodyTypes.find(({ id }) => id === bodyType)?.label,
              },
              consents: [
                ...(user.consents ?? []).filter(
                  ({ purpose }) => purpose !== 'body_ad_personalization',
                ),
                { purpose: 'body_ad_personalization', granted: true },
              ],
            }
          : {}),
      });
      setStep(1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '체형을 저장하지 못했습니다.');
    } finally {
      setWorking(false);
    }
  }

  async function grantConsent() {
    if (!consent || working || !user) return;
    setWorking(true);
    setError('');
    try {
      await recordConsent('personalization', true, AbortSignal.timeout(10000));
      if (getSessionSnapshot().user?.id !== user.id) return;
      sessionActions.updateUser({
        consents: [
          ...(user.consents ?? []).filter(({ purpose }) => purpose !== 'personalization'),
          { purpose: 'personalization', granted: true },
        ],
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '개인화 동의를 저장하지 못했습니다.');
    } finally {
      setWorking(false);
    }
  }

  async function savePhase() {
    if (!user || !phase || !activeGender || !serverUser || working) return;
    const ids = selections[phase];
    if (
      ids.length !== REQUIRED ||
      !ids.every((id) => cardsByPhase[phase]?.some((card) => card.card_id === id))
    )
      return;

    setWorking(true);
    setError('');
    const stillSignedIn = () => getSessionSnapshot().user?.id === user.id;
    const finish = () => {
      if (!stillSignedIn()) return;
      if (isEditMode) navigate('/mypage?preferences=updated&storage=server');
      else setStep('result');
    };
    const readStatus = (id: string) => fetchOnboardingSession(id, AbortSignal.timeout(8000));
    let completing = false;
    try {
      let current = session.current;
      if (!current || current.userId !== user.id || current.gender !== apiGender) {
        const result = await startOnboarding(apiGender, AbortSignal.timeout(10000));
        if (!stillSignedIn()) return;
        current = { userId: user.id, gender: apiGender, id: result.onboarding_session_id };
        session.current = current;
      }
      if (phase === 2) {
        const status = await readStatus(current.id);
        if (!stillSignedIn()) return;
        if (status.status === 'completed') {
          finish();
          return;
        }
        if (status.status !== 'in_progress' || status.phase1_count !== status.required_per_phase) {
          if (status.status !== 'in_progress') session.current = null;
          setStep(1);
          setError('상품 선택을 다시 확인한 뒤 저장해 주세요.');
          return;
        }
      }
      await saveOnboardingSelections(current.id, ids, phase, AbortSignal.timeout(10000));
      if (!stillSignedIn()) return;
      if (phase === 1) {
        setStep(2);
        return;
      }
      completing = true;
      await completeOnboarding(current.id, AbortSignal.timeout(10000));
      finish();
    } catch (cause) {
      if (!stillSignedIn()) return;
      if (completing && session.current) {
        const status = await readStatus(session.current.id).catch(() => null);
        if (!stillSignedIn()) return;
        if (status?.status === 'completed') {
          finish();
          return;
        }
      }
      if (cause instanceof ApiRequestError && cause.status === 404 && session.current) {
        session.current = null;
        setStep(1);
        setError('이전 선택 세션을 찾을 수 없어요. 상품 선택부터 다시 저장해 주세요.');
        return;
      }
      setError(cause instanceof Error ? cause.message : '선택을 저장하지 못했습니다.');
    } finally {
      setWorking(false);
    }
  }

  const steps = isEditMode
    ? ([
        [1, '상품 원본 선택'],
        [2, 'AI 이미지 선택'],
      ] as const)
    : ([
        ['account', '회원가입'],
        ['body', '신체 정보'],
        [1, '상품 원본 선택'],
        [2, 'AI 이미지 선택'],
      ] as const);

  return (
    <section className="style-flow">
      <div className="style-stepper" aria-label="진행 단계">
        <a className="style-stepper-logo" href="/">
          ERIN
        </a>
        {step !== 'result' && (
          <div className="style-stepper-steps">
            {steps.map(([id, label]) => (
              <span key={id} aria-current={step === id ? 'step' : undefined}>
                {label}
              </span>
            ))}
          </div>
        )}
      </div>
      {step === 'body' && !isEditMode && (
        <div className="style-flow-body">
          <h1>신체 정보와 체형을 알려주세요</h1>
          <label>
            <input
              type="checkbox"
              checked={bodyConsent}
              onChange={(event) => setBodyConsent(event.target.checked)}
            />
            신체 정보를 저장하고 핏 추천에 사용하는 데 동의합니다.
          </label>
          <div className="style-two">
            <fieldset>
              <legend>성별</legend>
              <div className="style-two">
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
                      if (value === gender) return;
                      setGender(value);
                      setBodyType(null);
                      setRemoteBodyTypes([]);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="style-two">
              <label>
                키 (cm)
                <input
                  type="number"
                  disabled={!bodyConsent || working}
                  min="50"
                  max="250"
                  placeholder="예: 165"
                  value={height}
                  onChange={(event) => setHeight(event.target.value)}
                />
              </label>
              <label>
                몸무게 (kg)
                <input
                  type="number"
                  disabled={!bodyConsent || working}
                  min="10"
                  max="350"
                  placeholder="예: 55"
                  value={weight}
                  onChange={(event) => setWeight(event.target.value)}
                />
              </label>
            </div>
          </div>
          {bodyConsent && <h2>체형 선택</h2>}
          {bodyError && bodyConsent && (
            <p role="alert">
              {bodyError} <button onClick={() => setAttempt((n) => n + 1)}>다시 불러오기</button>
            </p>
          )}
          {error && <p role="alert">{error}</p>}
          {bodyConsent && (
            <BodyTypePicker
              gender={gender}
              value={bodyType}
              onChange={setBodyType}
              remoteOptions={remoteBodyTypes}
              disabled={working}
            />
          )}
          <div className="style-flow-actions">
            <button type="button" disabled={!validBody} onClick={() => void saveBody()}>
              {working ? '저장 중…' : '다음 단계로 →'}
            </button>
          </div>
        </div>
      )}

      {step === 'account' && (
        <div className="style-flow-body style-register">
          <h1>회원가입</h1>
          <p>이미지 선택을 시작하려면 계정을 만들어 주세요.</p>
          {USE_MOCK_API ? (
            <p role="status">온보딩 카드를 이용하려면 서버 모드로 접속해 주세요.</p>
          ) : (
            <form onSubmit={register}>
              <label>
                이름{' '}
                <span className="style-required" aria-hidden="true">
                  *
                </span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                  placeholder="이름 입력"
                  required
                />
              </label>
              <label>
                이메일{' '}
                <span className="style-required" aria-hidden="true">
                  *
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  placeholder="name@example.com"
                  required
                />
              </label>
              <label>
                비밀번호{' '}
                <span className="style-required" aria-hidden="true">
                  *
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  placeholder="10자 이상 입력해 주세요"
                  minLength={10}
                  required
                />
              </label>
              <TermsAgreementSection
                onChangeAgreements={(values, valid) => {
                  setAgreements(values);
                  setRequiredValid(valid);
                }}
              />

              {error && <p role="alert">{error}</p>}
              <button type="submit" disabled={working || !requiredValid}>
                {working ? '처리 중…' : '회원가입하고 계속'}
              </button>
            </form>
          )}
        </div>
      )}

      {phase && (!serverUser || !activeGender) && (
        <div className="style-flow-body">
          <h1>서버 계정과 성별 정보가 필요합니다</h1>
          <button type="button" onClick={() => navigate('/mypage')}>
            마이페이지로 이동
          </button>
        </div>
      )}

      {phase && serverUser && activeGender && !allowed && (
        <div className="style-flow-body">
          <h1>맞춤 추천 설정</h1>
          <label>
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
            />
            선택한 이미지를 취향 분석과 개인화 추천에 사용하는 데 동의합니다.
          </label>
          {error && <p role="alert">{error}</p>}
          <div className="style-flow-actions">
            <button className="secondary" onClick={() => navigate(isEditMode ? '/mypage' : '/')}>
              나중에
            </button>
            <button disabled={!consent || working} onClick={() => void grantConsent()}>
              계속
            </button>
          </div>
        </div>
      )}

      {phase && serverUser && activeGender && allowed && (
        <div className="style-flow-body style-selection">
          <h1>
            {phase === 1
              ? '마음에 드는 상품 원본을 골라주세요'
              : '마음에 드는 AI 이미지를 골라주세요'}
          </h1>
          <p>4장을 선택해 주세요.</p>
          {!cardsByPhase[phase] && !loadError && <p role="status">카드를 불러오는 중이에요…</p>}
          {loadError && (
            <div role="alert">
              <p>{loadError}</p>
              <button onClick={() => setAttempt((value) => value + 1)}>다시 불러오기</button>
            </div>
          )}
          {error && <p role="alert">{error}</p>}
          <div
            className={
              phase === 1 ? 'style-image-grid onboarding-product-grid' : 'style-image-grid'
            }
          >
            {cardsByPhase[phase]?.map((card, index) => {
              const chosen = selections[phase].includes(card.card_id);
              return (
                <button
                  key={card.card_id}
                  type="button"
                  aria-pressed={chosen}
                  className={chosen ? 'selected' : ''}
                  disabled={working || (!chosen && selections[phase].length >= REQUIRED)}
                  onClick={() =>
                    setSelections((previous) => {
                      const ids = previous[phase];
                      return {
                        ...previous,
                        [phase]: ids.includes(card.card_id)
                          ? ids.filter((id) => id !== card.card_id)
                          : ids.length < REQUIRED
                            ? [...ids, card.card_id]
                            : ids,
                      };
                    })
                  }
                >
                  <img
                    src={onboardingImageUrl(card.image_url)}
                    alt={`선택 이미지 ${index + 1}`}
                    loading="lazy"
                    decoding="async"
                  />
                  {chosen && <span aria-hidden="true">✓</span>}
                </button>
              );
            })}
          </div>
          <div className="style-sticky">
            <button
              className="secondary"
              disabled={working}
              onClick={() => {
                setError('');
                if (phase === 2) setStep(1);
                else navigate(isEditMode ? '/mypage' : '/');
              }}
            >
              {phase === 2 ? '이전 단계' : '나가기'}
            </button>
            <span aria-live="polite">{selections[phase].length} / 4장 선택</span>
            <button
              disabled={working || !!loadError || selections[phase].length !== REQUIRED}
              onClick={() => void savePhase()}
            >
              {working ? '저장 중…' : phase === 1 ? '다음 단계로 →' : '취향 저장하기 →'}
            </button>
          </div>
        </div>
      )}

      {step === 'result' && (
        <div className="style-flow-body style-lookbook-result">
          <h1>취향 설정을 완료했어요</h1>
          <p>상품 원본 4장과 AI 이미지 4장을 저장했습니다.</p>
          <div className="style-flow-actions">
            <button onClick={() => navigate('/')}>홈으로 이동</button>
          </div>
        </div>
      )}
    </section>
  );
}
