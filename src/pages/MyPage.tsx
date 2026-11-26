import { useEffect, useState, type FormEvent } from 'react';
import { updateMyProfile } from '../api/auth';
import { findProduct } from '../api/products';
import { money, navigate, RequireLogin } from '../components/common/Layout';
import { sessionActions, useSessionStore } from '../store/useSessionStore';

export function MyPage() {
  const { user, preferences, orders } = useSessionStore();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [height, setHeight] = useState(user?.bodyProfile?.height_cm?.toString() ?? '');
  const [weight, setWeight] = useState(user?.bodyProfile?.weight_kg?.toString() ?? '');
  const [bodyShape, setBodyShape] = useState(user?.bodyProfile?.body_shape ?? '');
  const [bodyConsent, setBodyConsent] = useState(user?.consents?.find((consent) => consent.purpose === 'body_ad_personalization')?.granted ?? false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setDisplayName(user?.displayName ?? '');
    setHeight(user?.bodyProfile?.height_cm?.toString() ?? '');
    setWeight(user?.bodyProfile?.weight_kg?.toString() ?? '');
    setBodyShape(user?.bodyProfile?.body_shape ?? '');
    setBodyConsent(user?.consents?.find((consent) => consent.purpose === 'body_ad_personalization')?.granted ?? false);
  }, [user?.id, user?.displayName, user?.bodyProfile, user?.consents]);

  const cancelEdit = () => {
    setEditing(false);
    setDisplayName(user?.displayName ?? '');
    setCurrentPassword('');
    setHeight(user?.bodyProfile?.height_cm?.toString() ?? '');
    setWeight(user?.bodyProfile?.weight_kg?.toString() ?? '');
    setBodyShape(user?.bodyProfile?.body_shape ?? '');
    setBodyConsent(user?.consents?.find((consent) => consent.purpose === 'body_ad_personalization')?.granted ?? false);
  };

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const updated = await updateMyProfile({
        displayName, currentPassword,
        heightCm: bodyConsent && height ? Number(height) : null,
        weightKg: bodyConsent && weight ? Number(weight) : null,
        bodyShape: bodyConsent ? bodyShape || null : null,
        bodyConsent,
      });
      const consents = [...(user?.consents ?? []).filter((consent) => consent.purpose !== 'body_ad_personalization'), { purpose: 'body_ad_personalization', granted: bodyConsent }];
      sessionActions.updateUser({ displayName: updated.displayName, bodyProfile: updated.bodyProfile, consents });
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

  return <RequireLogin><section className="section">
    <p className="eyebrow">MY PAGE</p>
    <h1>{user?.displayName}님, 반가워요</h1>

    <div className="account-card account-profile-card">
      <div>
        <h2>회원 정보</h2>
        {editing ? <form className="profile-edit-form" onSubmit={saveProfile}>
          <label>이름<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={60} required /></label>
          <label>이메일<input value={user?.email ?? ''} readOnly /></label>
          <h3>신체 정보</h3>
          <label className="body-consent-toggle"><input type="checkbox" checked={bodyConsent} onChange={(event) => setBodyConsent(event.target.checked)} /> 신체 정보를 핏 추천에 사용하는 데 동의합니다.</label>
          <div className="body-measurements">
            <label>키 (cm)<input type="number" min="50" max="250" value={height} disabled={!bodyConsent} onChange={(event) => setHeight(event.target.value)} placeholder="예: 165" /></label>
            <label>몸무게 (kg)<input type="number" min="10" max="350" value={weight} disabled={!bodyConsent} onChange={(event) => setWeight(event.target.value)} placeholder="예: 55" /></label>
          </div>
          <fieldset className="body-shape-picker" disabled={!bodyConsent}><legend>체형 (하나 선택)</legend><div className="body-shape-options">{[
            ['hourglass', '모래시계형'], ['pear', '하체 발달형'], ['inverted_triangle', '상체 발달형'], ['rectangle', '일자형'], ['apple', '복부 중심형'],
          ].map(([value, label]) => <button type="button" key={value} className={bodyShape === value ? 'body-shape-choice selected' : 'body-shape-choice'} onClick={() => setBodyShape(bodyShape === value ? '' : value)}>
            <span className="body-shape-image-placeholder" aria-hidden="true">이미지 영역</span><span>{label}</span>
          </button>)}</div></fieldset>
          <label>현재 비밀번호<input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" required /></label>
          <div className="profile-edit-actions"><button type="button" className="secondary" onClick={cancelEdit}>취소</button><button type="submit" disabled={saving}>{saving ? '저장 중…' : '변경 저장'}</button></div>
        </form> : <>
          <p>이름: {user?.displayName}</p>
          <p>이메일: {user?.email}</p>
          {user?.createdAt && <p>가입일: {new Date(user.createdAt).toLocaleDateString('ko-KR')}</p>}
          <button onClick={() => { setMessage(''); setEditing(true); }}>회원 정보 수정</button>
        </>}
        {message && <p className="profile-message" role="status">{message}</p>}
      </div>
    </div>

    {!editing && user?.bodyProfile && <div className="account-card body-profile-card"><div><h2>저장된 신체 정보</h2><p>키: {user.bodyProfile.height_cm ? `${user.bodyProfile.height_cm}cm` : '미입력'}</p><p>몸무게: {user.bodyProfile.weight_kg ? `${user.bodyProfile.weight_kg}kg` : '미입력'}</p><p>체형: {user.bodyProfile.body_shape ?? '미입력'}</p></div></div>}

    <div className="account-card"><div><h2>현재 상품 취향</h2><p>{preferences.styles.length ? preferences.styles.join(' · ') : '아직 설정하지 않았어요'}</p><p>광고 취향: {preferences.creativeStyle ?? '미설정'}</p></div><button onClick={() => navigate('/preferences')}>취향 수정</button></div>

    <h2 className="order-title">체험 주문 이력</h2>
    {orders.length ? <div className="orders">{orders.map((order) => <article key={order.id}><div><strong>{new Date(order.createdAt).toLocaleDateString('ko-KR')}</strong><p>{order.items.map((item) => findProduct(item.productId)?.name).join(', ')}</p></div><strong>{money(order.total)}</strong></article>)}</div> : <p>아직 체험 주문이 없어요.</p>}
    <button className="secondary logout" onClick={() => { sessionActions.logout(); navigate('/'); }}>로그아웃</button>
  </section></RequireLogin>;
}
