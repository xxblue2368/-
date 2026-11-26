import { PersonalizedAds } from '../components/ads/PersonalizedAds';
import { RequireLogin } from '../components/common/Layout';

export function AdsPage() {
  return (
    <RequireLogin>
      <PersonalizedAds />
    </RequireLogin>
  );
}
