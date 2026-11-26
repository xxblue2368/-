import { useEffect, useState } from 'react';
import { ApiRequestError, USE_MOCK_API } from '../../api/client';
import { fetchPreferences, type PreferenceProfile } from '../../api/preferences';
import { useSessionStore } from '../../store/useSessionStore';

export function PreferenceSummary() {
  const user = useSessionStore((state) => state.user);
  const permitted =
    !USE_MOCK_API &&
    !!user?.consents?.some(({ purpose, granted }) => purpose === 'personalization' && granted);
  const [result, setResult] = useState<{
    userId: string;
    profile?: PreferenceProfile;
    message?: string;
  }>();
  useEffect(() => {
    if (!user?.id || !permitted) return;
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]);
    void fetchPreferences(signal)
      .then((profile) => setResult({ userId: user.id, profile }))
      .catch((error) => {
        if (!controller.signal.aborted)
          setResult({
            userId: user.id,
            message:
              error instanceof ApiRequestError && error.status === 404
                ? '아직 저장된 취향이 없어요.'
                : '취향 프로필을 불러오지 못했습니다.',
          });
      });
    return () => controller.abort();
  }, [user?.id, permitted]);

  if (!permitted || !user) return null;
  if (result?.userId !== user.id) return <p role="status">취향을 불러오는 중이에요…</p>;
  if (result.message) return <p>{result.message}</p>;
  const styles = Object.entries(result.profile?.weights?.style ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([label]) => label);
  if (!result.profile?.selected_image_count && !styles.length)
    return <p>아직 저장된 취향이 없어요.</p>;
  return (
    <div>
      {result.profile?.selected_image_count != null && (
        <p>온보딩 선택 {result.profile.selected_image_count}장</p>
      )}
      {styles.length > 0 && <p>선호 스타일 {styles.join(' · ')}</p>}
    </div>
  );
}
