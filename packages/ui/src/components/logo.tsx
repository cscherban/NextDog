interface LogoProps {
  size?: number;
}

export function Logo({ size = 20 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Left ear — pointy upright like Sadaharu */}
      <path d="M12 22C10 10 14 2 20 4C25 6 22 16 20 24" fill="#e8e0e0" />
      <path d="M13.5 20C12 11 15 4.5 20 6C24 7.5 21.5 16 20 23" fill="#f5f0f0" />
      {/* Inner ear pink */}
      <path d="M15 16C14 10 16 6 19 7.5C21.5 9 20 14 19 19" fill="#ffb3b3" opacity="0.5" />

      {/* Right ear */}
      <path d="M52 22C54 10 50 2 44 4C39 6 42 16 44 24" fill="#e8e0e0" />
      <path d="M50.5 20C52 11 49 4.5 44 6C40 7.5 42.5 16 44 23" fill="#f5f0f0" />
      <path d="M49 16C50 10 48 6 45 7.5C42.5 9 44 14 45 19" fill="#ffb3b3" opacity="0.5" />

      {/* Head — big round white fluffy */}
      <circle cx="32" cy="34" r="20" fill="#f5f0f0" />

      {/* Fluffy texture — subtle fur tufts */}
      <circle cx="32" cy="14" r="3" fill="#f5f0f0" />
      <circle cx="14" cy="30" r="2.5" fill="#f5f0f0" />
      <circle cx="50" cy="30" r="2.5" fill="#f5f0f0" />

      {/* Face — slightly lighter round area */}
      <circle cx="32" cy="37" r="13" fill="#faf7f7" />

      {/* Blush cheeks — pink like Sadaharu */}
      <ellipse cx="19" cy="40" rx="4" ry="2.5" fill="#ff8a8a" opacity="0.3" />
      <ellipse cx="45" cy="40" rx="4" ry="2.5" fill="#ff8a8a" opacity="0.3" />

      {/* Eyes — big round dark, Sadaharu-style */}
      <ellipse cx="25" cy="33" rx="5" ry="5.5" fill="#1a1a2e" />
      <ellipse cx="39" cy="33" rx="5" ry="5.5" fill="#1a1a2e" />

      {/* Eye highlights — big sparkly */}
      <circle cx="27.5" cy="31" r="2" fill="white" />
      <circle cx="41.5" cy="31" r="2" fill="white" />
      <circle cx="24" cy="35" r="1" fill="white" opacity="0.5" />
      <circle cx="38" cy="35" r="1" fill="white" opacity="0.5" />

      {/* Nose — big round dog nose */}
      <ellipse cx="32" cy="41" rx="3" ry="2.2" fill="#1a1a2e" />
      <ellipse cx="31.3" cy="40.3" rx="1" ry="0.6" fill="#3a3a5e" opacity="0.5" />

      {/* Mouth — happy w-shape */}
      <path d="M29 43.5Q30.5 45.5 32 43.5Q33.5 45.5 35 43.5" stroke="#1a1a2e" stroke-width="1.2" stroke-linecap="round" fill="none" />

      {/* Tiny tongue */}
      <ellipse cx="32" cy="45.5" rx="1.8" ry="1.5" fill="#ff6b6b" />
      <path d="M30.2 45 L33.8 45" stroke="#faf7f7" stroke-width="1" />

      {/* Collar — red like Sadaharu's */}
      <path d="M16 50C20 54 26 56 32 56C38 56 44 54 48 50" stroke="#e74c3c" stroke-width="3" stroke-linecap="round" fill="none" />

      {/* Collar tag */}
      <circle cx="32" cy="57.5" r="2.5" fill="#f1c40f" />
      <path d="M32 55.5L32.6 57H34L32.8 57.7L33.2 59L32 58.2L30.8 59L31.2 57.7L30 57H31.4Z" fill="#e67e22" />
    </svg>
  );
}

// Standalone SVG string for favicon
export const logoSvgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <path d="M12 22C10 10 14 2 20 4C25 6 22 16 20 24" fill="#e8e0e0"/>
  <path d="M13.5 20C12 11 15 4.5 20 6C24 7.5 21.5 16 20 23" fill="#f5f0f0"/>
  <path d="M15 16C14 10 16 6 19 7.5C21.5 9 20 14 19 19" fill="#ffb3b3" opacity="0.5"/>
  <path d="M52 22C54 10 50 2 44 4C39 6 42 16 44 24" fill="#e8e0e0"/>
  <path d="M50.5 20C52 11 49 4.5 44 6C40 7.5 42.5 16 44 23" fill="#f5f0f0"/>
  <path d="M49 16C50 10 48 6 45 7.5C42.5 9 44 14 45 19" fill="#ffb3b3" opacity="0.5"/>
  <circle cx="32" cy="34" r="20" fill="#f5f0f0"/>
  <circle cx="32" cy="14" r="3" fill="#f5f0f0"/>
  <circle cx="14" cy="30" r="2.5" fill="#f5f0f0"/>
  <circle cx="50" cy="30" r="2.5" fill="#f5f0f0"/>
  <circle cx="32" cy="37" r="13" fill="#faf7f7"/>
  <ellipse cx="19" cy="40" rx="4" ry="2.5" fill="#ff8a8a" opacity="0.3"/>
  <ellipse cx="45" cy="40" rx="4" ry="2.5" fill="#ff8a8a" opacity="0.3"/>
  <ellipse cx="25" cy="33" rx="5" ry="5.5" fill="#1a1a2e"/>
  <ellipse cx="39" cy="33" rx="5" ry="5.5" fill="#1a1a2e"/>
  <circle cx="27.5" cy="31" r="2" fill="white"/>
  <circle cx="41.5" cy="31" r="2" fill="white"/>
  <circle cx="24" cy="35" r="1" fill="white" opacity="0.5"/>
  <circle cx="38" cy="35" r="1" fill="white" opacity="0.5"/>
  <ellipse cx="32" cy="41" rx="3" ry="2.2" fill="#1a1a2e"/>
  <ellipse cx="31.3" cy="40.3" rx="1" ry="0.6" fill="#3a3a5e" opacity="0.5"/>
  <path d="M29 43.5Q30.5 45.5 32 43.5Q33.5 45.5 35 43.5" stroke="#1a1a2e" stroke-width="1.2" stroke-linecap="round" fill="none"/>
  <ellipse cx="32" cy="45.5" rx="1.8" ry="1.5" fill="#ff6b6b"/>
  <path d="M30.2 45 L33.8 45" stroke="#faf7f7" stroke-width="1"/>
  <path d="M16 50C20 54 26 56 32 56C38 56 44 54 48 50" stroke="#e74c3c" stroke-width="3" stroke-linecap="round" fill="none"/>
  <circle cx="32" cy="57.5" r="2.5" fill="#f1c40f"/>
  <path d="M32 55.5L32.6 57H34L32.8 57.7L33.2 59L32 58.2L30.8 59L31.2 57.7L30 57H31.4Z" fill="#e67e22"/>
</svg>`;
