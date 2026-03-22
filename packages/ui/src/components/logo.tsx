interface LogoProps {
  size?: number;
}

export function Logo({ size = 20 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Dog face */}
      <circle cx="32" cy="34" r="22" fill="var(--accent)" opacity="0.15" />

      {/* Floppy ears */}
      <path d="M14 22C10 14 6 16 8 26C10 32 14 34 18 32" fill="var(--accent)" opacity="0.6" />
      <path d="M50 22C54 14 58 16 56 26C54 32 50 34 46 32" fill="var(--accent)" opacity="0.6" />

      {/* Head */}
      <ellipse cx="32" cy="32" rx="18" ry="16" fill="var(--bg-surface)" stroke="var(--accent)" stroke-width="2" />

      {/* Eyes - one normal, one with a monocle/magnifying glass */}
      <circle cx="24" cy="29" r="3" fill="var(--text-bright)" />
      <circle cx="24" cy="29" r="1.5" fill="var(--accent)" />

      {/* Right eye with trace/observability ring */}
      <circle cx="40" cy="29" r="3" fill="var(--text-bright)" />
      <circle cx="40" cy="29" r="1.5" fill="var(--green)" />
      <circle cx="40" cy="29" r="5" stroke="var(--green)" stroke-width="1.5" fill="none" opacity="0.6" />
      <line x1="44" y1="33" x2="48" y2="37" stroke="var(--green)" stroke-width="1.5" stroke-linecap="round" opacity="0.6" />

      {/* Snout */}
      <ellipse cx="32" cy="37" rx="7" ry="5" fill="var(--bg-hover)" stroke="var(--accent)" stroke-width="1" />

      {/* Nose */}
      <ellipse cx="32" cy="35.5" rx="3" ry="2" fill="var(--accent)" />

      {/* Mouth */}
      <path d="M29 39 Q32 42 35 39" stroke="var(--accent)" stroke-width="1" fill="none" stroke-linecap="round" />

      {/* Tongue */}
      <path d="M32 40 Q33 44 31 44 Q30 44 31 41" fill="var(--red)" opacity="0.8" />

      {/* Eyebrows - one raised (curious) */}
      <path d="M21 24 Q24 22 27 24" stroke="var(--text-dim)" stroke-width="1.5" fill="none" stroke-linecap="round" />
      <path d="M37 23 Q40 21 43 24" stroke="var(--text-dim)" stroke-width="1.5" fill="none" stroke-linecap="round" />

      {/* Signal lines coming off the monocle eye - observability */}
      <path d="M49 27 L52 25" stroke="var(--green)" stroke-width="1" stroke-linecap="round" opacity="0.4" />
      <path d="M49 29 L53 29" stroke="var(--green)" stroke-width="1" stroke-linecap="round" opacity="0.4" />
      <path d="M49 31 L52 33" stroke="var(--green)" stroke-width="1" stroke-linecap="round" opacity="0.4" />
    </svg>
  );
}
