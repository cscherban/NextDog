interface LogoProps {
  size?: number;
}

export function Logo({ size = 20 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Left ear — soft floppy */}
      <path d="M14 28C11 16 11 6 18 8C24 10 23 20 21 28" fill="#6c5ce7" />
      <path d="M15.5 26C13 17 13 9 18.5 10.5C23 12 22 20 20.5 27" fill="#7b6ef0" />

      {/* Right ear */}
      <path d="M50 28C53 16 53 6 46 8C40 10 41 20 43 28" fill="#6c5ce7" />
      <path d="M48.5 26C51 17 51 9 45.5 10.5C41 12 42 20 43.5 27" fill="#7b6ef0" />

      {/* Head — big round kawaii shape */}
      <circle cx="32" cy="34" r="20" fill="#6c5ce7" />

      {/* Face — lighter round area */}
      <circle cx="32" cy="37" r="13" fill="#8577ed" />

      {/* Blush cheeks — kawaii signature */}
      <ellipse cx="19" cy="40" rx="4" ry="2.5" fill="#fd79a8" opacity="0.35" />
      <ellipse cx="45" cy="40" rx="4" ry="2.5" fill="#fd79a8" opacity="0.35" />

      {/* Eyes — BIG kawaii sparkly eyes */}
      <ellipse cx="25" cy="34" rx="5.5" ry="6" fill="white" />
      <ellipse cx="39" cy="34" rx="5.5" ry="6" fill="white" />

      {/* Pupils — large, round, looking slightly up */}
      <ellipse cx="26" cy="35" rx="3.5" ry="4" fill="#2d1b69" />
      <ellipse cx="40" cy="35" rx="3.5" ry="4" fill="#2d1b69" />

      {/* Eye sparkles — big kawaii catch lights */}
      <circle cx="28" cy="32.5" r="1.8" fill="white" />
      <circle cx="42" cy="32.5" r="1.8" fill="white" />
      <circle cx="25" cy="36" r="1" fill="white" opacity="0.7" />
      <circle cx="39" cy="36" r="1" fill="white" opacity="0.7" />

      {/* Nose — tiny and cute */}
      <ellipse cx="32" cy="41" rx="2.5" ry="1.8" fill="#2d1b69" />
      <ellipse cx="31.5" cy="40.5" rx="0.8" ry="0.5" fill="#4a3a8a" opacity="0.5" />

      {/* Mouth — small happy "w" shape */}
      <path d="M29 43.5Q30.5 45 32 43.5Q33.5 45 35 43.5" stroke="#2d1b69" stroke-width="1.2" stroke-linecap="round" fill="none" />

      {/* Tiny tongue peek */}
      <ellipse cx="32" cy="45" rx="1.8" ry="1.5" fill="#e17055" />
      <path d="M30.2 44.5 L33.8 44.5" stroke="#8577ed" stroke-width="1.2" />

      {/* Collar */}
      <path d="M16 50C20 54 26 56 32 56C38 56 44 54 48 50" stroke="#fd79a8" stroke-width="2.5" stroke-linecap="round" fill="none" />
      {/* Tag — little star */}
      <circle cx="32" cy="57" r="2.2" fill="#fdcb6e" />
      <path d="M32 55L32.6 56.5H34L32.8 57.2L33.2 58.5L32 57.7L30.8 58.5L31.2 57.2L30 56.5H31.4Z" fill="#f39c12" />
    </svg>
  );
}

// Standalone SVG string for favicon
export const logoSvgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <path d="M14 28C11 16 11 6 18 8C24 10 23 20 21 28" fill="#6c5ce7"/>
  <path d="M15.5 26C13 17 13 9 18.5 10.5C23 12 22 20 20.5 27" fill="#7b6ef0"/>
  <path d="M50 28C53 16 53 6 46 8C40 10 41 20 43 28" fill="#6c5ce7"/>
  <path d="M48.5 26C51 17 51 9 45.5 10.5C41 12 42 20 43.5 27" fill="#7b6ef0"/>
  <circle cx="32" cy="34" r="20" fill="#6c5ce7"/>
  <circle cx="32" cy="37" r="13" fill="#8577ed"/>
  <ellipse cx="19" cy="40" rx="4" ry="2.5" fill="#fd79a8" opacity="0.35"/>
  <ellipse cx="45" cy="40" rx="4" ry="2.5" fill="#fd79a8" opacity="0.35"/>
  <ellipse cx="25" cy="34" rx="5.5" ry="6" fill="white"/>
  <ellipse cx="39" cy="34" rx="5.5" ry="6" fill="white"/>
  <ellipse cx="26" cy="35" rx="3.5" ry="4" fill="#2d1b69"/>
  <ellipse cx="40" cy="35" rx="3.5" ry="4" fill="#2d1b69"/>
  <circle cx="28" cy="32.5" r="1.8" fill="white"/>
  <circle cx="42" cy="32.5" r="1.8" fill="white"/>
  <circle cx="25" cy="36" r="1" fill="white" opacity="0.7"/>
  <circle cx="39" cy="36" r="1" fill="white" opacity="0.7"/>
  <ellipse cx="32" cy="41" rx="2.5" ry="1.8" fill="#2d1b69"/>
  <ellipse cx="31.5" cy="40.5" rx="0.8" ry="0.5" fill="#4a3a8a" opacity="0.5"/>
  <path d="M29 43.5Q30.5 45 32 43.5Q33.5 45 35 43.5" stroke="#2d1b69" stroke-width="1.2" stroke-linecap="round" fill="none"/>
  <ellipse cx="32" cy="45" rx="1.8" ry="1.5" fill="#e17055"/>
  <path d="M30.2 44.5 L33.8 44.5" stroke="#8577ed" stroke-width="1.2"/>
  <path d="M16 50C20 54 26 56 32 56C38 56 44 54 48 50" stroke="#fd79a8" stroke-width="2.5" stroke-linecap="round" fill="none"/>
  <circle cx="32" cy="57" r="2.2" fill="#fdcb6e"/>
  <path d="M32 55L32.6 56.5H34L32.8 57.2L33.2 58.5L32 57.7L30.8 58.5L31.2 57.2L30 56.5H31.4Z" fill="#f39c12"/>
</svg>`;
