type IconProps = {
  size?: number;
  className?: string;
  filled?: boolean;
};

export function HeartIcon({ size = 18, className, filled }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M19.5 12.57 12 20l-7.5-7.43A4.75 4.75 0 0 1 12 5.35a4.75 4.75 0 0 1 7.5 7.22Z" />
    </svg>
  );
}

export function BookmarkIcon({ size = 18, className, filled }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M7 3.75h10A1.25 1.25 0 0 1 18.25 5v15.25L12 16.5l-6.25 3.75V5A1.25 1.25 0 0 1 7 3.75Z" />
    </svg>
  );
}

export function MenuIcon({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className} aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function CloseIcon({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className} aria-hidden>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

/** Compact mark: briefcase + seeker arc — no emoji, no plain letter tile */
export function BrandLogo({ size = 36, className }: IconProps) {
  const gid = 'ajh-brand-grad';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      className={className}
      aria-hidden
    >
      <rect width="36" height="36" rx="10" fill={`url(#${gid})`} />
      <path
        d="M12.5 15.2h11c1 0 1.8.8 1.8 1.8v7.2c0 1-.8 1.8-1.8 1.8h-11c-1 0-1.8-.8-1.8-1.8v-7.2c0-1 .8-1.8 1.8-1.8Z"
        stroke="var(--btn-text)"
        strokeWidth="1.7"
      />
      <path d="M15.2 15.2v-1.4c0-.9.7-1.6 1.6-1.6h2.4c.9 0 1.6.7 1.6 1.6v1.4" stroke="var(--btn-text)" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="22.6" cy="21.2" r="3.1" stroke="var(--btn-text)" strokeWidth="1.6" />
      <path d="m24.8 23.4 2.1 2.1" stroke="var(--btn-text)" strokeWidth="1.6" strokeLinecap="round" />
      <defs>
        <linearGradient id={gid} x1="4" y1="3" x2="32" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--accent)" />
          <stop offset="1" stopColor="var(--accent2)" />
        </linearGradient>
      </defs>
    </svg>
  );
}
