import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AuthError, signIn } from '../../api/auth';
import { USE_MOCK_API } from '../../api/client';
import { DEMO_EMAIL, DEMO_PASSWORD } from '../../api/demoAuth';
import { sessionActions } from '../../store/useSessionStore';

type LoginModalProps = {
  onClose: () => void;
  onSuccess: () => void;
  onSignup: () => void;
};

export function LoginModal({ onClose, onSuccess, onSignup }: LoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    emailRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled)',
        ) ?? [],
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus();
    };
  }, [onClose]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setError('');
    if (!email.includes('@')) return setError('올바른 이메일 주소를 입력해 주세요.');
    if (password.length < 10) return setError('비밀번호는 10자 이상으로 입력해 주세요.');
    setSubmitting(true);
    try {
      const user = await signIn({ email, password });
      sessionActions.login(user);
      onSuccess();
    } catch (cause) {
      setError(
        cause instanceof AuthError
          ? cause.message
          : cause instanceof Error
            ? cause.message
            : '잠시 후 다시 시도해 주세요.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="login-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        className="login-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-modal-title"
      >
        <header className="login-modal-header">
          <h2 id="login-modal-title">로그인</h2>
          <button type="button" aria-label="로그인 닫기" onClick={onClose}>
            <svg
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
              aria-hidden="true"
            >
              <path d="M5 5 19 19M19 5 5 19" />
            </svg>
          </button>
        </header>
        <p className="login-modal-intro">
          이메일과 비밀번호로 로그인하거나 비회원이시면 회원가입을 진행해 주세요.
        </p>
        <form onSubmit={submit} noValidate>
          <label>
            이메일 <span aria-hidden="true">*</span>
            <input
              ref={emailRef}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              placeholder="name@example.com"
              required
            />
          </label>
          <label>
            비밀번호 <span aria-hidden="true">*</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              placeholder="10자 이상 입력해 주세요"
              required
            />
          </label>
          {error && (
            <p className="login-modal-error" role="alert">
              {error}
            </p>
          )}
          <button className="login-modal-submit" type="submit" disabled={submitting}>
            {submitting ? '처리 중…' : '로그인하기'}
          </button>
        </form>
        <p className="login-modal-security">
          <svg
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            aria-hidden="true"
          >
            <rect x="5" y="10" width="14" height="11" rx="1" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </svg>
          모든 데이터는 안전하게 보호됩니다.
        </p>
        <button className="login-modal-signup" type="button" onClick={onSignup}>
          회원가입
        </button>
        {USE_MOCK_API && (
          <p className="login-modal-demo">
            데모 로그인: {DEMO_EMAIL} / {DEMO_PASSWORD}
            <br />
            데모 계정과 변경한 정보는 이 브라우저에만 저장됩니다.
          </p>
        )}
      </section>
    </div>
  );
}
