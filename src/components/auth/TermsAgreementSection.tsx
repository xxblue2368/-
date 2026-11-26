import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createEmptyAgreements,
  PRIVACY_SUMMARY,
  REQUIRED_TERMS,
  TERMS_DATA,
  type AgreementPayload,
  type TermsCode,
} from '../../data/termsData';
import { TermsModal } from './TermsModal';
import './terms.css';

type TermsAgreementSectionProps = {
  onChangeAgreements: (agreements: AgreementPayload[], isRequiredValid: boolean) => void;
};

export function TermsAgreementSection({ onChangeAgreements }: TermsAgreementSectionProps) {
  const [agreements, setAgreements] = useState<AgreementPayload[]>(createEmptyAgreements);
  const [activeTerm, setActiveTerm] = useState<TermsCode | null>(null);
  const onChangeRef = useRef(onChangeAgreements);

  const isRequiredValid = useMemo(
    () => REQUIRED_TERMS.every((code) => agreements.find((item) => item.termsCode === code)?.agreed === true),
    [agreements],
  );
  const allAgreed = agreements.every((item) => item.agreed);
  const selectedTerm = TERMS_DATA.find((item) => item.code === activeTerm) ?? null;
  const closeModal = useCallback(() => setActiveTerm(null), []);

  useEffect(() => { onChangeRef.current = onChangeAgreements; }, [onChangeAgreements]);
  useEffect(() => {
    onChangeRef.current(agreements.map((item) => ({ ...item })), isRequiredValid);
  }, [agreements, isRequiredValid]);

  const setOne = (code: TermsCode, agreed: boolean) => {
    setAgreements((current) => current.map((item) => item.termsCode === code ? { ...item, agreed } : item));
  };

  const toggleAll = () => {
    const next = !allAgreed;
    setAgreements((current) => current.map((item) => ({ ...item, agreed: next })));
  };

  return (
    <section className="terms-agreement" aria-labelledby="terms-agreement-title">
      <div className="terms-title-row">
        <div>
          <p className="terms-kicker">BEFORE YOU JOIN</p>
          <h2 id="terms-agreement-title">약관에 동의해 주세요</h2>
        </div>
        <span className="terms-version">POLICY v1.0</span>
      </div>

      <div className="terms-all-card">
        <label className="terms-check-row terms-all-row">
          <input type="checkbox" checked={allAgreed} onChange={toggleAll} />
          <span className="terms-checkbox-mark" aria-hidden="true" />
          <span className="terms-check-label">전체 동의</span>
        </label>
        <p className="terms-all-description">전체 동의는 필수 및 선택 정보에 대한 동의를 포함하고 있으며, 개별적으로도 동의를 선택하실 수 있습니다. 선택 항목에 동의하지 않아도 서비스 이용이 가능합니다.</p>
      </div>

      <div className="terms-items">
        {TERMS_DATA.map((term) => {
          const checked = agreements.find((item) => item.termsCode === term.code)?.agreed ?? false;
          return (
            <div className="terms-item-group" key={term.code}>
              <div className="terms-item-row">
                <label className="terms-check-row">
                  <input type="checkbox" checked={checked} onChange={(event) => setOne(term.code, event.target.checked)} />
                  <span className="terms-checkbox-mark" aria-hidden="true" />
                  <span className="terms-check-label"><b className={term.required ? 'terms-required' : 'terms-optional'}>[{term.required ? '필수' : '선택'}]</b>{term.label}</span>
                </label>
                {term.modalTitle && <button type="button" className="terms-detail-button" onClick={() => setActiveTerm(term.code)}>전문 보기 <span aria-hidden="true">↗</span></button>}
              </div>
              {term.code === 'PRIVACY_COLLECTION' && (
                <div className="privacy-summary" aria-label="개인정보 수집 및 이용 요약">
                  {PRIVACY_SUMMARY.map((row, index) => <div className="privacy-summary-row" key={row.heading}>
                    <span className="privacy-summary-index">0{index + 1}</span>
                    <span className="privacy-summary-heading">{row.heading}</span>
                    <span className="privacy-summary-body">{row.body}</span>
                  </div>)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className={`terms-validity ${isRequiredValid ? 'is-valid' : ''}`} aria-live="polite">
        <span className="terms-validity-dot" />
        {isRequiredValid ? '필수 약관에 모두 동의했어요.' : '필수 항목 3개에 동의하면 가입을 진행할 수 있어요.'}
      </div>
      <TermsModal term={selectedTerm} onClose={closeModal} />
    </section>
  );
}
