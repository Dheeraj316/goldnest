type LogoProps = {
  variant?: 'dark' | 'light';
  className?: string;
};

// Abstract nest-cradling-an-egg mark: a rounded gold "egg" resting inside a
// simple woven arc. Reads at favicon size and scales cleanly for the header.
export function Logo({ variant = 'dark', className = '' }: LogoProps) {
  const textColor = variant === 'dark' ? 'text-ink' : 'text-white';

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path
          d="M4 21C4 21 8 25 17 25C26 25 30 21 30 21"
          stroke="#B8862A"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M2 24.5C2 24.5 7.5 29.5 17 29.5C26.5 29.5 32 24.5 32 24.5"
          stroke="#DFB95C"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.55"
        />
        <ellipse cx="17" cy="15" rx="8.5" ry="10.5" fill="#CFA23A" />
        <ellipse cx="17" cy="15" rx="8.5" ry="10.5" fill="url(#goldnest-egg-shine)" />
        <defs>
          <linearGradient id="goldnest-egg-shine" x1="10" y1="6" x2="24" y2="24" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F5E9C9" />
            <stop offset="0.45" stopColor="#CFA23A" />
            <stop offset="1" stopColor="#96691F" />
          </linearGradient>
        </defs>
      </svg>
      <span className={`font-display text-xl font-semibold tracking-tight ${textColor}`}>Goldnest</span>
    </span>
  );
}
