import { useEffect, useState } from 'react';
import { fetchProductFilters, type ProductFilterOption } from '../../api/products';
import { CategoryDrawerTabs } from './CategoryDrawerTabs';

type GlobalCategoryDrawerProps = {
  accountActive: boolean;
  closeDrawer: () => void;
  openProducts: (path: string) => void;
  openAccount: () => void;
};

export function GlobalCategoryDrawer({
  accountActive,
  closeDrawer,
  openProducts,
  openAccount,
}: GlobalCategoryDrawerProps) {
  const [major, setMajor] = useState('');
  const [middle, setMiddle] = useState('');
  const scope = `${major}:${middle}`;
  const [options, setOptions] = useState<{
    scope: string;
    middles: ProductFilterOption[];
    minors: ProductFilterOption[];
  }>();
  const middles = options?.scope === scope ? options.middles : [];
  const minors = options?.scope === scope ? options.minors : [];
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!major) return;

    const controller = new AbortController();
    setLoading(true);
    fetchProductFilters({ major, middle: middle || undefined }, controller.signal)
      .then((filters) => {
        if (!controller.signal.aborted)
          setOptions({ scope, middles: filters.middles, minors: filters.minors });
      })
      .catch(() => {
        if (!controller.signal.aborted) setOptions({ scope, middles: [], minors: [] });
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [major, middle, scope]);

  const moveToProducts = (minor = '') => {
    const params = new URLSearchParams({ major });
    if (middle) params.set('middle', middle);
    if (minor) params.set('minor', minor);
    closeDrawer();
    openProducts(`/products?${params}`);
  };

  return (
    <div className="drawer-categories">
      <CategoryDrawerTabs
        activeTab={major || (accountActive ? 'my' : null)}
        onSelectMajor={(code) => {
          setMajor(code);
          setMiddle('');
        }}
        onSelectMy={openAccount}
      />

      {major && (
        <fieldset className="drawer-category-list">
          <legend>중분류</legend>
          <button type="button" onClick={() => moveToProducts()}>
            전체 종류
          </button>
          {middles.map((option) => (
            <button
              key={option.code}
              type="button"
              className={middle === option.code ? 'selected' : ''}
              onClick={() => setMiddle(option.code)}
            >
              {option.label}
            </button>
          ))}
        </fieldset>
      )}

      {major && middle && (
        <fieldset className="drawer-category-list">
          <legend>소분류</legend>
          <button type="button" onClick={() => moveToProducts()}>
            전체 품목
          </button>
          {minors.map((option) => (
            <button key={option.code} type="button" onClick={() => moveToProducts(option.code)}>
              {option.label}
              {option.count != null ? ` (${option.count})` : ''}
            </button>
          ))}
        </fieldset>
      )}

      {loading && <p className="drawer-category-status">카테고리를 불러오는 중이에요…</p>}
    </div>
  );
}
