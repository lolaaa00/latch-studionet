export function LatchMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" fill="none" aria-hidden="true">
      <path d="M10 14H42L55 27V58H23L10 45V14Z" stroke="currentColor" strokeWidth="3"/>
      <path d="M22 25H43V46H22" stroke="currentColor" strokeWidth="3"/>
      <path d="M43 25L55 13" stroke="currentColor" strokeWidth="3"/>
      <path d="M50 13H61V24" stroke="currentColor" strokeWidth="3"/>
      <circle cx="22" cy="46" r="4" fill="currentColor"/>
    </svg>
  );
}
