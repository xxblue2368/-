import { useEffect } from 'react';
import type { TermContent } from '../../data/termsData';

type TermsModalProps = {
  term: TermContent | null;
  onClose: () => void;
};

export function TermsModal({ term, onClose }: TermsModalProps) {
  useEffect(() => {
    if (!term) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [term, onClose]);

  if (!term?.sections) return null;

  return (
    <div className="terms-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="terms-modal" role="dialog" aria-modal="true" aria-labelledby="terms-modal-title">
        <header className="terms-modal-header">
          <div>
            <p className="terms-kicker">AGREEMENT · v1.0</p>
            <h2 id="terms-modal-title">{term.modalTitle}</h2>
          </div>
          <button type="button" className="terms-modal-close" onClick={onClose} aria-label="약관 상세 닫기">×</button>
        </header>
        <div className="terms-modal-body">
          {term.sections.map((section) => (
            <article className="terms-modal-section" key={section.heading}>
              <h3>{section.heading}</h3>
              {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </article>
          ))}
        </div>
        <footer className="terms-modal-footer">
          <span>이 창을 닫아도 동의 상태는 변경되지 않습니다.</span>
          <button type="button" onClick={onClose}>확인</button>
        </footer>
      </section>
    </div>
  );
}
