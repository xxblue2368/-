type IconName = 'search' | 'user' | 'heart' | 'bag' | 'menu' | 'close' | 'arrow';

export function LineIcon({ name }: { name: IconName }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {name === 'search' && (
        <>
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m16 16 5 5" />
        </>
      )}
      {name === 'user' && (
        <>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
        </>
      )}
      {name === 'heart' && (
        <path d="M20.5 4.8a5.5 5.5 0 0 0-8.5 1 5.5 5.5 0 0 0-8.5-1c-2.5 2.4-1.8 6.2.5 8.5l8 7.2 8-7.2c2.3-2.3 3-6.1.5-8.5Z" />
      )}
      {name === 'bag' && (
        <>
          <path d="M5 7h14l1 14H4L5 7Z" />
          <path d="M8 9V6a4 4 0 0 1 8 0v3" />
        </>
      )}
      {name === 'menu' && <path d="M3 8h18M3 16h18" />}
      {name === 'close' && <path d="m5 5 14 14M5 19 19 5" />}
      {name === 'arrow' && <path d="M3 12h18m-6-6 6 6-6 6" />}
    </svg>
  );
}
