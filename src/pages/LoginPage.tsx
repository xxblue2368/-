import { useCallback, useState, type FormEvent } from 'react';
import { AuthError, signIn, signUp } from '../api/auth';
import { TermsAgreementSection } from '../components/auth/TermsAgreementSection';
import { createEmptyAgreements, type AgreementPayload } from '../data/termsData';
import {
  completeOnboarding,
  fetchOnboardingCards,
  recordConsent,
  saveBodyProfile,
  saveOnboardingSelections,
  startOnboarding,
  type OnboardingCard,
  type OnboardingCards,
} from '../api/onboarding';
import { navigate } from '../components/common/Layout';
import { sessionActions } from '../store/useSessionStore';
import '../onboarding.css';

type Phase = 'account' | 'profile' | 'styles' | 'complete';
const bodyShapes = [
  { value: 'hourglass', label: '모래시계형' },
  { value: 'pear', label: '하체가 발달한 편' },
  { value: 'inverted_triangle', label: '상체가 발달한 편' },
  { value: 'rectangle', label: '일자형' },
  { value: 'apple', label: '복부가 있는 편' },
  { value: 'unsure', label: '잘 모르겠어요' },
];

export function LoginPage({ mode }: { mode: 'login' | 'signup' }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [phase, setPhase] = useState<Phase>('account');
  const [agreementPayload, setAgreementPayload] = useState<AgreementPayload[]>(createEmptyAgreements);
  const [isRequiredValid, setIsRequiredValid] = useState(false);
  const [personalizationAccepted, setPersonalizationAccepted] = useState(false);
  const [bodyConsentAccepted, setBodyConsentAccepted] = useState(false);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [bodyShape, setBodyShape] = useState('');
  const [cards, setCards] = useState<OnboardingCard[]>([]);
  const [targetCount, setTargetCount] = useState(8);
  const [sessionId, setSessionId] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  const returnTo = new URLSearchParams(location.search).get('returnTo') || '/';
  const isSignup = mode === 'signup';
  const handleAgreementsChange = useCallback((agreements: AgreementPayload[], requiredValid: boolean) => {
    setAgreementPayload(agreements);
    setIsRequiredValid(requiredValid);
  }, []);
  const hasAgreement = (code: AgreementPayload['termsCode']) => agreementPayload.find((item) => item.termsCode === code)?.agreed === true;
  const imageUrl = (url: string) => url.startsWith('http')
    ? url
    : `${import.meta.env.VITE_API_ORIGIN ?? ''}${url}`;

  const submitAccount = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (!email.includes('@')) return setError('올바른 이메일 주소를 입력해 주세요.');
    if (password.length < 10) return setError('비밀번호는 10자 이상으로 입력해 주세요.');
    if (isSignup && !displayName.trim()) return setError('이름을 입력해 주세요.');
    if (isSignup && !isRequiredValid) return setError('필수 약관 3개에 동의해 주세요.');

    setSubmitting(true);
    try {
      if (isSignup) {
        await signUp({ email, password, displayName, agreements: agreementPayload });
        const user = await signIn({ email, password });
        sessionActions.login(user);
        const aiConsent = hasAgreement('AI_MODEL_TRAIN');
        setPersonalizationAccepted(aiConsent);
        setPhase('profile');
        const consentResults = await Promise.allSettled([
          // The current API calls this purpose "personalization".
          recordConsent('personalization', aiConsent),
          recordConsent('marketing_messages', hasAgreement('MARKETING_OPT_IN')),
        ]);
        if (consentResults.some((item) => item.status === 'rejected')) {
          setError('회원가입은 완료됐지만 선택 동의 저장에 실패했습니다. 설정에서 다시 확인할 수 있어요.');
        }
      } else {
        const user = await signIn({ email, password });
        sessionActions.login(user);
        navigate(returnTo.startsWith('/') ? returnTo : '/');
      }
    } catch (cause) {
      setError(cause instanceof AuthError ? cause.message : cause instanceof Error ? cause.message : '잠시 후 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  const continueProfile = async () => {
    setError('');
    setSubmitting(true);
    try {
      const hasBodyData = Boolean(height || weight || bodyShape);
      if (hasBodyData && !bodyConsentAccepted) {
        throw new Error('신체 정보를 입력했다면 신체 정보 이용 동의가 필요합니다. 동의하지 않으려면 입력값을 지워 주세요.');
      }
      if (bodyConsentAccepted) {
        await recordConsent('body_ad_personalization', true);
        if (hasBodyData) {
          await saveBodyProfile({
            height_cm: height ? Number(height) : null,
            weight_kg: weight ? Number(weight) : null,
            body_shape: bodyShape || null,
          });
        }
      }
      await recordConsent('personalization', hasAgreement('AI_MODEL_TRAIN') || personalizationAccepted);
      await recordConsent('marketing_messages', hasAgreement('MARKETING_OPT_IN'));
      if (!personalizationAccepted) {
        setPhase('complete');
        return;
      }
      await recordConsent('personalization', true);
      const cardSet: OnboardingCards = await fetchOnboardingCards();
      const session = await startOnboarding();
      setCards(cardSet.cards);
      setTargetCount(session.target_selection_count || cardSet.target_selection_count);
      setSessionId(session.onboarding_session_id);
      setPhase('styles');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '정보를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleCard = (id: string) => {
    setSelectedIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= targetCount) return current;
      return [...current, id];
    });
  };

  const finishOnboarding = async () => {
    setError('');
    setSubmitting(true);
    try {
      await saveOnboardingSelections(sessionId, selectedIds);
      const completed = await completeOnboarding(sessionId);
      setResult(completed.initial_preferences);
      setPhase('complete');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '취향 선택을 저장하지 못했습니다. 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  const finish = () => navigate(returnTo.startsWith('/') ? returnTo : '/');

  if (phase === 'profile') {
    return (
      <section className="onboarding-wrap">
        <div className="onboarding-card">
          <p className="eyebrow">WELCOME, {displayName.trim().toUpperCase()}</p>
          <h1>나에게 맞는 상품을 찾아볼까요?</h1>
          <p className="onboarding-lead">선택 사항을 입력하면 체형 정보를 저장하거나 취향 분석을 시작할 수 있어요. 모두 건너뛰어도 가입은 완료됩니다.</p>

          <section className="onboarding-section">
            <h2>체형 정보 <span>선택</span></h2>
            <label className="consent-line">
              <input type="checkbox" checked={bodyConsentAccepted} onChange={(event) => {
                const accepted = event.target.checked;
                setBodyConsentAccepted(accepted);
                if (!accepted) { setHeight(''); setWeight(''); setBodyShape(''); }
              }} />
              <span>키·몸무게·체형 정보를 상품 핏 개인화에 사용하는 데 동의합니다. 동의는 나중에 설정에서 변경할 수 있어요.</span>
            </label>
            <div className="body-fields">
              <label>키 (cm)<input type="number" min="50" max="250" value={height} disabled={!bodyConsentAccepted} onChange={(event) => setHeight(event.target.value)} placeholder="예: 165" /></label>
              <label>몸무게 (kg)<input type="number" min="10" max="350" value={weight} disabled={!bodyConsentAccepted} onChange={(event) => setWeight(event.target.value)} placeholder="예: 55" /></label>
            </div>
            <fieldset className="shape-options" disabled={!bodyConsentAccepted}>
              <legend>체형</legend>
              <div>{bodyShapes.map((shape) => <button type="button" key={shape.value} className={bodyShape === shape.value ? 'selected' : ''} onClick={() => setBodyShape(bodyShape === shape.value ? '' : shape.value)}>{shape.label}</button>)}</div>
            </fieldset>
          </section>

          <section className="onboarding-section">
            <h2>스타일 취향 분석 <span>선택</span></h2>
            <label className="consent-line">
              <input type="checkbox" checked={personalizationAccepted} onChange={(event) => setPersonalizationAccepted(event.target.checked)} />
              <span>선택한 스타일을 개인화 추천과 취향 분석에 사용하는 데 동의합니다.</span>
            </label>
            <p className="onboarding-help">동의하면 실제 등록된 스타일 카드 중 마음에 드는 이미지를 골라 취향 프로필을 저장합니다.</p>
          </section>

          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="onboarding-actions">
            <button type="button" className="text-button" onClick={finish}>건너뛰기</button>
            <button type="button" disabled={submitting} onClick={continueProfile}>{submitting ? '저장 중…' : personalizationAccepted ? '계속해서 스타일 고르기' : '저장하고 시작하기'}</button>
          </div>
        </div>
      </section>
    );
  }

  if (phase === 'styles') {
    return (
      <section className="onboarding-wrap styles-wrap">
        <div className="styles-heading">
          <p className="eyebrow">STYLE ONBOARDING</p>
          <h1>마음에 드는 스타일을 골라주세요</h1>
          <p>정확히 {targetCount}장을 선택해 주세요. 현재 {selectedIds.length} / {targetCount}</p>
        </div>
        {cards.length ? <div className="style-card-grid">{cards.map((card) => {
          const selected = selectedIds.includes(card.card_id);
          return <button type="button" key={card.card_id} className={`style-card ${selected ? 'selected' : ''}`} onClick={() => toggleCard(card.card_id)} aria-pressed={selected}>
            <img src={imageUrl(card.image_url)} alt={card.style_tags?.join(', ') || '스타일 참고 이미지'} loading="lazy" />
            <span className="style-card-caption">{selected ? '✓ 선택됨' : (card.style_tags?.join(' · ') || `스타일 ${card.position + 1}`)}</span>
          </button>;
        })}</div> : <p className="empty">표시할 스타일 이미지가 없습니다.</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="onboarding-actions style-actions">
          <button type="button" className="text-button" onClick={() => setPhase('profile')}>이전</button>
          <button type="button" disabled={submitting || selectedIds.length !== targetCount} onClick={finishOnboarding}>{submitting ? '취향 저장 중…' : '선택 완료'}</button>
        </div>
      </section>
    );
  }

  if (phase === 'complete') {
    return (
      <section className="onboarding-wrap">
        <div className="onboarding-card completion-card">
          <div className="completion-mark">✓</div>
          <p className="eyebrow">ACCOUNT READY</p>
          <h1>{result ? '취향 프로필을 저장했어요' : '회원가입이 완료됐어요'}</h1>
          <p className="onboarding-lead">{result ? '선택한 스타일을 바탕으로 개인화 기능을 준비했어요.' : '이제 상품을 둘러보고 찜 목록을 사용할 수 있습니다.'}</p>
          <button type="button" onClick={finish}>상품 둘러보기</button>
        </div>
      </section>
    );
  }

  return (
    <section className="auth auth-showcase">
      <div className="signup-story" aria-hidden="true">
        <span className="story-kicker"><i /> YOUR STYLE, YOUR WAY</span>
        <h2>{isSignup ? <>취향을 담아<br /><em>더 나다운</em> 쇼핑</> : <>다시 만나 반가워요<br /><em>취향은 그대로</em></>}</h2>
        <p>{isSignup ? '마음에 드는 스타일을 고르면, 나에게 맞는 상품을 발견하는 일이 더 쉬워져요.' : '로그인하고 찜해둔 상품과 나만의 스타일을 이어서 확인해 보세요.'}</p>
        <div className="story-orbit orbit-one" />
        <div className="story-orbit orbit-two" />
        <span className="float-chip chip-style">✦ &nbsp; PERSONAL STYLE</span>
        <span className="float-chip chip-fit">YOUR FIT</span>
        <div className="story-bottom"><span>01</span><span className="story-line" /><span>STYLE PROFILE</span></div>
      </div>
      <div className="auth-panel">
        <p className="eyebrow">{isSignup ? 'CREATE YOUR ACCOUNT' : 'WELCOME BACK'}</p>
        <h1>{isSignup ? '회원가입' : '로그인'}</h1>
        <p className="auth-intro">찜한 상품과 나만의 스타일을 저장해 보세요.</p>
        <form onSubmit={submitAccount} noValidate>
          {isSignup && <label>이름<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" placeholder="이름을 입력해 주세요" /></label>}
          <label>이메일<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="name@example.com" /></label>
          <label>비밀번호<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={isSignup ? 'new-password' : 'current-password'} placeholder="10자 이상 입력해 주세요" /></label>
          {isSignup && <TermsAgreementSection onChangeAgreements={handleAgreementsChange} />}
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="auth-submit" disabled={submitting || (isSignup && !isRequiredValid)}>{submitting ? '처리 중…' : isSignup ? '회원가입 완료' : '로그인하기'}<span aria-hidden="true">↗</span></button>
        </form>
        <p className="auth-switch">{isSignup ? '이미 계정이 있나요?' : '처음이신가요?'}{' '}
          <a href={`${isSignup ? '/login' : '/signup'}${location.search}`} onClick={(event) => { event.preventDefault(); navigate(`${isSignup ? '/login' : '/signup'}${location.search}`); }}>{isSignup ? '로그인' : '회원가입'}</a>
        </p>
        {isSignup && <p className="mock-note">체형 정보와 스타일 취향 설정은 가입 후 선택할 수 있습니다.</p>}
      </div>
    </section>
  );
}
