interface LogoProps {
  size?: number;
}

export function Logo({ size = 20 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Floppy ears */}
      <ellipse cx="14" cy="24" rx="8" ry="14" transform="rotate(-15 14 24)" fill="var(--accent)" opacity="0.7" />
      <ellipse cx="50" cy="24" rx="8" ry="14" transform="rotate(15 50 24)" fill="var(--accent)" opacity="0.7" />

      {/* Head */}
      <ellipse cx="32" cy="33" rx="20" ry="18" fill="var(--bg-surface)" stroke="var(--accent)" stroke-width="2.5" />

      {/* Eyes — happy, slightly squinting */}
      <ellipse cx="24" cy="30" rx="3.5" ry="3" fill="var(--text-bright)" />
      <circle cx="24.5" cy="30" r="2" fill="#333" />
      <circle cx="25.5" cy="29" r="0.8" fill="white" />

      <ellipse cx="40" cy="30" rx="3.5" ry="3" fill="var(--text-bright)" />
      <circle cx="40.5" cy="30" r="2" fill="#333" />
      <circle cx="41.5" cy="29" r="0.8" fill="white" />

      {/* Snout */}
      <ellipse cx="32" cy="38" rx="8" ry="5.5" fill="var(--bg-hover)" stroke="var(--accent)" stroke-width="1.5" />

      {/* Nose — rounded triangle */}
      <path d="M29.5 36 Q32 33 34.5 36 Q32 37.5 29.5 36Z" fill="var(--accent)" />

      {/* Smile */}
      <path d="M28 40 Q32 44 36 40" stroke="var(--accent)" stroke-width="1.5" fill="none" stroke-linecap="round" />

      {/* Magnifying glass over right eye area */}
      <circle cx="44" cy="22" r="6" stroke="var(--green)" stroke-width="2" fill="none" opacity="0.8" />
      <line x1="48.5" y1="26.5" x2="53" y2="31" stroke="var(--green)" stroke-width="2.5" stroke-linecap="round" opacity="0.8" />
    </svg>
  );
}

// Standalone SVG string for favicon
export const logoSvgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <ellipse cx="14" cy="24" rx="8" ry="14" transform="rotate(-15 14 24)" fill="#6c5ce7" opacity="0.7"/>
  <ellipse cx="50" cy="24" rx="8" ry="14" transform="rotate(15 50 24)" fill="#6c5ce7" opacity="0.7"/>
  <ellipse cx="32" cy="33" rx="20" ry="18" fill="#141414" stroke="#6c5ce7" stroke-width="2.5"/>
  <ellipse cx="24" cy="30" rx="3.5" ry="3" fill="#fff"/>
  <circle cx="24.5" cy="30" r="2" fill="#333"/>
  <circle cx="25.5" cy="29" r="0.8" fill="white"/>
  <ellipse cx="40" cy="30" rx="3.5" ry="3" fill="#fff"/>
  <circle cx="40.5" cy="30" r="2" fill="#333"/>
  <circle cx="41.5" cy="29" r="0.8" fill="white"/>
  <ellipse cx="32" cy="38" rx="8" ry="5.5" fill="#1a1a1a" stroke="#6c5ce7" stroke-width="1.5"/>
  <path d="M29.5 36 Q32 33 34.5 36 Q32 37.5 29.5 36Z" fill="#6c5ce7"/>
  <path d="M28 40 Q32 44 36 40" stroke="#6c5ce7" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  <circle cx="44" cy="22" r="6" stroke="#00b894" stroke-width="2" fill="none" opacity="0.8"/>
  <line x1="48.5" y1="26.5" x2="53" y2="31" stroke="#00b894" stroke-width="2.5" stroke-linecap="round" opacity="0.8"/>
</svg>`;
