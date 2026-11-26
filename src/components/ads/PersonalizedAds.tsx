import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  fetchAdBatch,
  fetchAdImage,
  fetchLatestAdBatch,
  hasPendingAdBatch,
  trackAd,
  type AdSlot,
} from '../../api/ads';
import { AdControls } from './AdControls';
import { fetchUserConsents } from '../../api/auth';
import { USE_MOCK_API } from '../../api/client';
import { navigate, useNavigationDrawer } from '../common/Layout';
import { getSessionVersion, sessionActions, useSessionStore } from '../../store/useSessionStore';

function AdCard({ batchId, slot, image }: { batchId: string; slot: AdSlot; image?: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  const seen = useRef(false);
  useEffect(() => {
    if (!image || !ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || seen.current) return;
        seen.current = true;
        trackAd(batchId, slot, 'impression');
        observer.disconnect();
      },
      { threshold: 0.5 },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [batchId, slot, image]);

  const name = slot.product_snapshot?.name || `광고 ${slot.slot_no}`;
  return (
    <article className="product-card">
      {image ? (
        <button
          className="image-button"
          ref={ref}
          type="button"
          onClick={() => {
            trackAd(batchId, slot, 'click');
            navigate(`/products/${encodeURIComponent(slot.article_id)}`);
          }}
        >
          <img src={image} alt={name} />
        </button>
      ) : (
        <p>{slot.status === 'completed' ? '이미지 조회 실패' : '이미지 준비 중'}</p>
      )}
      <p>{name}</p>
    </article>
  );
}

type Placement = 'home' | 'page';
type PanelAction = { label: string; onClick: () => void };

function AdPanel({
  placement,
  portrait = false,
  action,
  children,
}: {
  placement: Placement;
  portrait?: boolean;
  action?: PanelAction;
  children: ReactNode;
}) {
  const home = placement === 'home';
  const Title = home ? 'h2' : 'h1';
  const titleId = home ? 'home-ad-title' : 'ads-page-title';

  return (
    <section className={home ? 'editorial-home-ad' : 'section'} aria-labelledby={titleId}>
      <div className="section-heading">
        <Title id={titleId}>내 맞춤 광고</Title>
        {action && (
          <button type="button" className="text-button" onClick={action.onClick}>
            {action.label}
          </button>
        )}
      </div>
      <div className={portrait ? 'editorial-home-ad-media' : 'ad-panel-content'}>{children}</div>
    </section>
  );
}

function ConsentUnavailable({ placement }: { placement: Placement }) {
  const [checking, setChecking] = useState(false);
  const [failed, setFailed] = useState(false);

  async function checkAgain() {
    if (checking) return;
    setChecking(true);
    setFailed(false);
    const version = getSessionVersion();
    try {
      const consents = await fetchUserConsents(AbortSignal.timeout(8000));
      if (version === getSessionVersion()) sessionActions.updateUser({ consents });
    } catch {
      setFailed(true);
    } finally {
      setChecking(false);
    }
  }

  return (
    <AdPanel
      placement={placement}
      action={
        checking ? undefined : { label: '동의 상태 다시 확인', onClick: () => void checkAgain() }
      }
    >
      {checking ? (
        <p role="status">개인화 동의 상태를 확인하고 있어요…</p>
      ) : (
        <p role={failed ? 'alert' : undefined}>개인화 동의 상태를 불러오지 못했습니다.</p>
      )}
    </AdPanel>
  );
}

export function PersonalizedAds({ placement = 'page' }: { placement?: Placement }) {
  const user = useSessionStore((state) => state.user);
  const { openLogin } = useNavigationDrawer();

  if (!user) {
    return (
      <AdPanel placement={placement} action={{ label: '로그인', onClick: openLogin }}>
        <p>로그인하면 맞춤 광고를 볼 수 있어요.</p>
      </AdPanel>
    );
  }

  if (USE_MOCK_API || user.id.startsWith('demo-')) {
    return (
      <AdPanel placement={placement}>
        <p>맞춤 광고는 서버 계정으로 이용할 수 있어요.</p>
      </AdPanel>
    );
  }

  if (!user.consents) return <ConsentUnavailable key={user.id} placement={placement} />;

  if (!user.consents.some(({ purpose, granted }) => purpose === 'personalization' && granted)) {
    return (
      <AdPanel
        placement={placement}
        action={{ label: '개인화 설정', onClick: () => navigate('/preferences?mode=edit') }}
      >
        <p>맞춤 광고를 보려면 개인화 동의가 필요합니다.</p>
      </AdPanel>
    );
  }

  return placement === 'home' ? (
    <AdGallery key={user.id} placement="home" />
  ) : (
    <AdWorkspace key={user.id} userId={user.id} />
  );
}

function AdWorkspace({ userId }: { userId: string }) {
  const [batchId, setBatchId] = useState<string | null>(null);
  return (
    <>
      <AdControls userId={userId} batchId={batchId} selectBatch={setBatchId} />
      <AdGallery key={batchId} placement="page" batchId={batchId} />
    </>
  );
}

function AdGallery({ placement, batchId }: { placement: Placement; batchId?: string | null }) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{
    attempt: number;
    batch: Awaited<ReturnType<typeof fetchLatestAdBatch>>;
    images: Record<number, string>;
    pending?: boolean;
    listFailed?: boolean;
  }>();

  useEffect(() => {
    const controller = new AbortController();
    const urls = new Set<string>();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]);
    void (async () => {
      try {
        const batch = batchId
          ? await fetchAdBatch(batchId, signal)
          : await fetchLatestAdBatch(signal);
        const images: Record<number, string> = {};
        if (batch) {
          const completed = batch.items
            .filter(({ status }) => status === 'completed')
            .sort((a, b) => a.slot_no - b.slot_no);
          const loadImage = async (slot: AdSlot) => {
            const blob = await fetchAdImage(batch.batch_id, slot.slot_no, signal);
            signal.throwIfAborted();
            const url = URL.createObjectURL(blob);
            urls.add(url);
            try {
              const image = new Image();
              image.src = url;
              await image.decode();
              signal.throwIfAborted();
              images[slot.slot_no] = url;
            } catch (error) {
              URL.revokeObjectURL(url);
              urls.delete(url);
              throw error;
            }
          };

          if (placement === 'home') {
            for (const slot of completed) {
              try {
                await loadImage(slot);
                break;
              } catch {
                if (signal.aborted) break;
              }
            }
          } else {
            await Promise.allSettled(completed.map(loadImage));
          }
        }
        const pending = !batch && !signal.aborted && (await hasPendingAdBatch(signal));
        if (!controller.signal.aborted) setResult({ attempt, batch, images, pending });
      } catch {
        if (!controller.signal.aborted) {
          setResult({ attempt, batch: null, images: {}, listFailed: true });
        }
      }
    })();
    return () => {
      controller.abort();
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [attempt, batchId, placement]);

  const retry = (label: string): PanelAction => ({
    label,
    onClick: () => setAttempt((n) => n + 1),
  });
  const current = result?.attempt === attempt ? result : undefined;
  const batch = current?.batch;
  const slot = batch?.items.find(({ slot_no }) => current?.images[slot_no]);
  const complete = batch?.items.some(({ status }) => status === 'completed');

  if (!current) {
    return (
      <AdPanel placement={placement}>
        <p role="status">광고 이미지를 불러오는 중이에요…</p>
      </AdPanel>
    );
  }

  if (current.listFailed) {
    return (
      <AdPanel placement={placement} action={retry('다시 시도')}>
        <p role="alert">광고 목록을 불러오지 못했습니다.</p>
      </AdPanel>
    );
  }

  if (!batchId && !complete) {
    return (
      <AdPanel placement={placement} action={retry('다시 확인')}>
        <p>
          {current.pending
            ? '맞춤 광고 이미지가 준비 중이에요.'
            : '아직 업로드된 광고 이미지가 없어요.'}
        </p>
      </AdPanel>
    );
  }

  if (!batch || (!slot && (!batchId || complete))) {
    return (
      <AdPanel placement={placement} action={retry('이미지 다시 불러오기')}>
        <p role="alert">광고 이미지 다운로드에 실패했습니다.</p>
      </AdPanel>
    );
  }

  if (placement === 'home') {
    return (
      <AdPanel
        placement={placement}
        portrait
        action={{ label: '전체 광고 보기', onClick: () => navigate('/ads') }}
      >
        {slot && (
          <AdCard
            key={`${batch.batch_id}:${slot.slot_no}`}
            batchId={batch.batch_id}
            slot={slot}
            image={current.images[slot.slot_no]}
          />
        )}
      </AdPanel>
    );
  }

  return (
    <AdPanel placement={placement} action={retry('새로고침')}>
      {batchId && (
        <p role="status">
          완료 이미지 {batch.items.filter(({ status }) => status === 'completed').length} /{' '}
          {batch.items.length}장
        </p>
      )}
      <div className="product-grid">
        {[...batch.items]
          .sort((a, b) => a.slot_no - b.slot_no)
          .map((item) => (
            <AdCard
              key={`${batch.batch_id}:${item.slot_no}`}
              batchId={batch.batch_id}
              slot={item}
              image={current.images[item.slot_no]}
            />
          ))}
      </div>
    </AdPanel>
  );
}
