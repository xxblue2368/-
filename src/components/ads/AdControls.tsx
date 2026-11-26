import { useEffect, useRef, useState } from 'react';
import {
  createAdBatch,
  fetchAdHistory,
  fetchAdJob,
  previewAdBatch,
  requestAdJob,
  type AdJob,
} from '../../api/ads';
import { ApiRequestError } from '../../api/client';

const HISTORY_PAGE_SIZE = 10;
const jobStatusLabels: Record<string, string> = {
  queued: '대기 중',
  running: '처리 중',
  completed: '완료',
  failed: '실패',
  cancelled: '취소됨',
};

export function AdControls({
  userId,
  batchId,
  selectBatch,
}: {
  userId: string;
  batchId: string | null;
  selectBatch: (id: string | null) => void;
}) {
  const storage = `erin-ad:${userId}:`;
  const savedJobKey = storage + 'job';
  const savedBatchKey = storage + 'batch';
  const [savedBatchId, setSavedBatchId] = useState(() => sessionStorage.getItem(savedBatchKey));
  const [jobId, setJobId] = useState(() => sessionStorage.getItem(savedJobKey));
  const [job, setJob] = useState<AdJob>();
  const [jobError, setJobError] = useState('');
  const [jobAttempt, setJobAttempt] = useState(0);
  const [plan, setPlan] = useState<Awaited<ReturnType<typeof previewAdBatch>>>();
  const [history, setHistory] = useState<string[]>();
  const [hasMore, setHasMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const request = useRef<AbortController | null>(null);

  useEffect(() => () => request.current?.abort(), []);

  useEffect(() => {
    if (!jobId) return;
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]);
    setJobError('');
    let timer: number | undefined;
    void fetchAdJob(jobId, signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setJob(result);
        if (result.status === 'queued' || result.status === 'running') {
          timer = window.setTimeout(() => setJobAttempt((attempt) => attempt + 1), 10000);
        }
      })
      .catch((cause) => {
        if (controller.signal.aborted) return;
        if (cause instanceof ApiRequestError && cause.status === 404) {
          sessionStorage.removeItem(savedJobKey);
          setJobId(null);
          setJob(undefined);
        }
        setJobError('광고 작업 상태를 불러오지 못했어요.');
      });
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [jobId, jobAttempt, savedJobKey]);

  async function run(task: (signal: AbortSignal) => Promise<void>) {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setMessage('');
    setError('');
    try {
      await task(controller.signal);
    } catch (cause) {
      if (!controller.signal.aborted)
        setError(cause instanceof Error ? cause.message : '요청을 처리하지 못했어요.');
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  // A retry of a request whose response was lost must refer to the same server record.
  function requestKey(action: 'create-batch' | 'request-job') {
    const key = storage + action;
    const value = sessionStorage.getItem(key) ?? crypto.randomUUID();
    sessionStorage.setItem(key, value);
    return value;
  }

  function loadHistory(offset: number) {
    void run(async (signal) => {
      const { batch_ids } = await fetchAdHistory(offset, HISTORY_PAGE_SIZE, signal);
      signal.throwIfAborted();
      setHistory((previous) => (offset === 0 ? batch_ids : [...(previous ?? []), ...batch_ids]));
      setHasMore(batch_ids.length === HISTORY_PAGE_SIZE);
    });
  }

  const jobPending = !!jobId && (!job || job.status === 'queued' || job.status === 'running');
  return (
    <section className="section ad-controls" aria-label="광고 요청 및 이력">
      <div className="ad-controls-actions">
        <button type="button" className="secondary" disabled={busy} onClick={() => loadHistory(0)}>
          광고 이력 조회
        </button>
        {batchId && (
          <button type="button" className="secondary" onClick={() => selectBatch(null)}>
            최신 이미지 보기
          </button>
        )}
        {savedBatchId && savedBatchId !== batchId && (
          <button type="button" className="secondary" onClick={() => selectBatch(savedBatchId)}>
            최근 저장한 배치 보기
          </button>
        )}
      </div>
      {history &&
        (history.length ? (
          <div className="ad-controls-actions" aria-label="저장된 광고 배치">
            {history.map((id, index) => (
              <button
                type="button"
                className="secondary"
                key={id}
                aria-pressed={id === batchId}
                onClick={() => selectBatch(id)}
              >
                광고 이력 {index + 1} 보기
              </button>
            ))}
            {hasMore && (
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={() => loadHistory(history.length)}
              >
                이력 더 보기
              </button>
            )}
          </div>
        ) : (
          <p>저장된 광고 이미지 이력이 없어요.</p>
        ))}
      <details>
        <summary>광고 계획 및 작업 요청</summary>
        <div className="ad-controls-actions">
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={() =>
              void run(async (signal) => {
                const preview = await previewAdBatch(signal);
                signal.throwIfAborted();
                setPlan(preview);
              })
            }
          >
            6개 상품 계획 미리보기
          </button>
          <button
            type="button"
            className="secondary"
            disabled={busy || jobPending}
            onClick={() =>
              void run(async (signal) => {
                const queued = await requestAdJob(requestKey('request-job'), signal);
                signal.throwIfAborted();
                if (!queued?.job_id) throw new Error('접수된 광고 작업을 확인하지 못했어요.');
                sessionStorage.setItem(savedJobKey, queued.job_id);
                sessionStorage.removeItem(storage + 'request-job');
                setJob(queued);
                setJobId(queued.job_id);
                setMessage('광고 작업이 접수됐어요.');
              })
            }
          >
            개별 광고 작업 요청
          </button>
        </div>
        <p>배치 저장은 상품 계획을 등록해요. 개별 광고 작업은 별도 대기열에 접수돼요.</p>
        {plan && (
          <div>
            <ol>
              {[...plan.slots]
                .sort((a, b) => a.slot_no - b.slot_no)
                .map((slot) => (
                  <li key={slot.slot_no}>{slot.product?.name ?? slot.article_id}</li>
                ))}
            </ol>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void run(async (signal) => {
                  const batch = await createAdBatch(requestKey('create-batch'), signal);
                  signal.throwIfAborted();
                  sessionStorage.setItem(savedBatchKey, batch.batch_id);
                  sessionStorage.removeItem(storage + 'create-batch');
                  setSavedBatchId(batch.batch_id);
                  setPlan(undefined);
                  selectBatch(batch.batch_id);
                  setMessage('광고 배치 계획이 저장됐어요.');
                })
              }
            >
              광고 배치 저장
            </button>
          </div>
        )}
        {jobId && (
          <div className="ad-controls-actions">
            <p role="status">
              광고 작업 상태: {job ? (jobStatusLabels[job.status] ?? job.status) : '확인 중'}
            </p>
            <button
              type="button"
              className="secondary"
              onClick={() => setJobAttempt((attempt) => attempt + 1)}
            >
              작업 상태 다시 확인
            </button>
          </div>
        )}
        {jobError && <p role="alert">{jobError}</p>}
      </details>
      {busy && (
        <div className="ad-controls-actions">
          <p role="status">광고 서버 응답을 기다리고 있어요…</p>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              request.current?.abort();
              setBusy(false);
              setMessage('응답 대기를 중단했어요.');
            }}
          >
            대기 취소
          </button>
        </div>
      )}
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
