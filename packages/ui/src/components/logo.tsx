interface LogoProps {
  size?: number;
}

export function Logo({ size = 20 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Left ear outer */}
      <path d="M10 24L17 3L26 22" fill="#f8f8f8" stroke="#1a1a2e" stroke-width="1.5" stroke-linejoin="round" />
      {/* Left ear inner pink */}
      <path d="M14 21L17 7L24 20" fill="#f9a8b8" />

      {/* Right ear outer */}
      <path d="M54 24L47 3L38 22" fill="#f8f8f8" stroke="#1a1a2e" stroke-width="1.5" stroke-linejoin="round" />
      {/* Right ear inner pink */}
      <path d="M50 21L47 7L40 20" fill="#f9a8b8" />

      {/* Head shape — wide, slightly flat top */}
      <path d="M12 28C12 18 20 14 32 14C44 14 52 18 52 28L52 42C52 52 44 58 32 58C20 58 12 52 12 42Z" fill="#f8f8f8" stroke="#1a1a2e" stroke-width="1.5" />

      {/* Fur tufts at cheeks */}
      <path d="M12 32C10 30 9 34 11 36" stroke="#c8d0d8" stroke-width="1" fill="none" />
      <path d="M52 32C54 30 55 34 53 36" stroke="#c8d0d8" stroke-width="1" fill="none" />

      {/* Grey eyebrow dots */}
      <circle cx="23" cy="27" r="1.5" fill="#a0a0a0" />
      <circle cx="41" cy="27" r="1.5" fill="#a0a0a0" />

      {/* Left eye — large, blue, anime-style */}
      <ellipse cx="24" cy="34" rx="6" ry="6.5" fill="#1a3a6e" stroke="#1a1a2e" stroke-width="1" />
      <ellipse cx="24" cy="35" rx="5" ry="5.5" fill="#2563eb" />
      {/* Pupil */}
      <ellipse cx="24" cy="35.5" rx="3" ry="3.5" fill="#1a1a3e" />
      {/* Highlight */}
      <circle cx="26.5" cy="32.5" r="2" fill="white" />
      <circle cx="22" cy="36.5" r="1" fill="white" opacity="0.6" />

      {/* Right eye */}
      <ellipse cx="40" cy="34" rx="6" ry="6.5" fill="#1a3a6e" stroke="#1a1a2e" stroke-width="1" />
      <ellipse cx="40" cy="35" rx="5" ry="5.5" fill="#2563eb" />
      <ellipse cx="40" cy="35.5" rx="3" ry="3.5" fill="#1a1a3e" />
      <circle cx="42.5" cy="32.5" r="2" fill="white" />
      <circle cx="38" cy="36.5" r="1" fill="white" opacity="0.6" />

      {/* Nose — small, pink, upside-down triangle */}
      <path d="M30.5 42L32 44L33.5 42Z" fill="#f9a8b8" stroke="#1a1a2e" stroke-width="0.5" />

      {/* Mouth — happy open */}
      <path d="M28 45C30 47 34 47 36 45" stroke="#1a1a2e" stroke-width="1.2" stroke-linecap="round" fill="none" />
      {/* Tongue */}
      <ellipse cx="32" cy="47" rx="2.5" ry="2" fill="#f9a8b8" />
      <path d="M29.5 45.5C30.5 47 33.5 47 34.5 45.5" fill="#1a1a2e" />

      {/* Blush marks — horizontal lines */}
      <g stroke="#f9a8b8" stroke-width="1" stroke-linecap="round" opacity="0.7">
        <line x1="14" y1="39" x2="17" y2="39" />
        <line x1="14" y1="41" x2="17" y2="41" />
        <line x1="14" y1="43" x2="17" y2="43" />
        <line x1="47" y1="39" x2="50" y2="39" />
        <line x1="47" y1="41" x2="50" y2="41" />
        <line x1="47" y1="43" x2="50" y2="43" />
      </g>

      {/* Collar — red */}
      <path d="M18 52C22 55 28 57 32 57C36 57 42 55 46 52" stroke="#dc2626" stroke-width="3" stroke-linecap="round" fill="none" />

      {/* Collar tag */}
      <circle cx="32" cy="58" r="2" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.5" />
    </svg>
  );
}

// Standalone SVG string for favicon
export const logoSvgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <path d="M10 24L17 3L26 22" fill="#f8f8f8" stroke="#1a1a2e" stroke-width="1.5" stroke-linejoin="round"/>
  <path d="M14 21L17 7L24 20" fill="#f9a8b8"/>
  <path d="M54 24L47 3L38 22" fill="#f8f8f8" stroke="#1a1a2e" stroke-width="1.5" stroke-linejoin="round"/>
  <path d="M50 21L47 7L40 20" fill="#f9a8b8"/>
  <path d="M12 28C12 18 20 14 32 14C44 14 52 18 52 28L52 42C52 52 44 58 32 58C20 58 12 52 12 42Z" fill="#f8f8f8" stroke="#1a1a2e" stroke-width="1.5"/>
  <circle cx="23" cy="27" r="1.5" fill="#a0a0a0"/>
  <circle cx="41" cy="27" r="1.5" fill="#a0a0a0"/>
  <ellipse cx="24" cy="34" rx="6" ry="6.5" fill="#1a3a6e" stroke="#1a1a2e" stroke-width="1"/>
  <ellipse cx="24" cy="35" rx="5" ry="5.5" fill="#2563eb"/>
  <ellipse cx="24" cy="35.5" rx="3" ry="3.5" fill="#1a1a3e"/>
  <circle cx="26.5" cy="32.5" r="2" fill="white"/>
  <circle cx="22" cy="36.5" r="1" fill="white" opacity="0.6"/>
  <ellipse cx="40" cy="34" rx="6" ry="6.5" fill="#1a3a6e" stroke="#1a1a2e" stroke-width="1"/>
  <ellipse cx="40" cy="35" rx="5" ry="5.5" fill="#2563eb"/>
  <ellipse cx="40" cy="35.5" rx="3" ry="3.5" fill="#1a1a3e"/>
  <circle cx="42.5" cy="32.5" r="2" fill="white"/>
  <circle cx="38" cy="36.5" r="1" fill="white" opacity="0.6"/>
  <path d="M30.5 42L32 44L33.5 42Z" fill="#f9a8b8" stroke="#1a1a2e" stroke-width="0.5"/>
  <path d="M28 45C30 47 34 47 36 45" stroke="#1a1a2e" stroke-width="1.2" stroke-linecap="round" fill="none"/>
  <ellipse cx="32" cy="47" rx="2.5" ry="2" fill="#f9a8b8"/>
  <path d="M29.5 45.5C30.5 47 33.5 47 34.5 45.5" fill="#1a1a2e"/>
  <g stroke="#f9a8b8" stroke-width="1" stroke-linecap="round" opacity="0.7">
    <line x1="14" y1="39" x2="17" y2="39"/><line x1="14" y1="41" x2="17" y2="41"/><line x1="14" y1="43" x2="17" y2="43"/>
    <line x1="47" y1="39" x2="50" y2="39"/><line x1="47" y1="41" x2="50" y2="41"/><line x1="47" y1="43" x2="50" y2="43"/>
  </g>
  <path d="M18 52C22 55 28 57 32 57C36 57 42 55 46 52" stroke="#dc2626" stroke-width="3" stroke-linecap="round" fill="none"/>
  <circle cx="32" cy="58" r="2" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.5"/>
</svg>`;
