export const DRAWER_MAJOR_TABS = [
  { code: 'kids', label: 'KIDS' },
  { code: 'women', label: 'WOMEN' },
  { code: 'men', label: 'MEN' },
] as const;

type CategoryDrawerTabsProps = {
  activeTab?: string | null;
  onSelectMajor: (code: string) => void;
  onSelectMy: () => void;
};

export function CategoryDrawerTabs({
  activeTab,
  onSelectMajor,
  onSelectMy,
}: CategoryDrawerTabsProps) {
  return (
    <div className="drawer-top-tabs" role="tablist" aria-label="상품 대분류">
      {DRAWER_MAJOR_TABS.map((tab) => (
        <button
          key={tab.code}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.code}
          className={activeTab === tab.code ? 'is-active' : ''}
          onClick={() => onSelectMajor(tab.code)}
        >
          {tab.label}
        </button>
      ))}
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'my'}
        className={activeTab === 'my' ? 'is-active' : ''}
        onClick={onSelectMy}
      >
        MY
      </button>
    </div>
  );
}
