interface LogoProps {
  size?: number;
}

export function Logo({ size = 20 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Ears — simple triangles */}
      <path d="M11 25L18 5L27 23" fill="#f0efed" stroke="#333" stroke-width="1.5" stroke-linejoin="round" />
      <path d="M53 25L46 5L37 23" fill="#f0efed" stroke="#333" stroke-width="1.5" stroke-linejoin="round" />
      <path d="M15 22L18 9L25 21" fill="#e8b4b8" />
      <path d="M49 22L46 9L39 21" fill="#e8b4b8" />

      {/* Head */}
      <circle cx="32" cy="38" r="20" fill="#f0efed" stroke="#333" stroke-width="1.5" />

      {/* Snout */}
      <ellipse cx="32" cy="43" rx="8" ry="6" fill="#e8e6e3" />

      {/* Eyes — simple dark ovals */}
      <ellipse cx="24" cy="35" rx="3.5" ry="4" fill="#222" />
      <ellipse cx="40" cy="35" rx="3.5" ry="4" fill="#222" />
      <circle cx="25.5" cy="33.5" r="1.2" fill="white" />
      <circle cx="41.5" cy="33.5" r="1.2" fill="white" />

      {/* Nose */}
      <ellipse cx="32" cy="42" rx="2.5" ry="2" fill="#333" />

      {/* Mouth */}
      <path d="M29 45C30.5 47 33.5 47 35 45" stroke="#333" stroke-width="1.2" stroke-linecap="round" fill="none" />

      {/* Collar */}
      <path d="M16 53C21 57 27 59 32 59C37 59 43 57 48 53" stroke="#c0392b" stroke-width="2.5" stroke-linecap="round" fill="none" />
    </svg>
  );
}

export const logoSvgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <path d="M11 25L18 5L27 23" fill="#f0efed" stroke="#333" stroke-width="1.5" stroke-linejoin="round"/>
  <path d="M53 25L46 5L37 23" fill="#f0efed" stroke="#333" stroke-width="1.5" stroke-linejoin="round"/>
  <path d="M15 22L18 9L25 21" fill="#e8b4b8"/>
  <path d="M49 22L46 9L39 21" fill="#e8b4b8"/>
  <circle cx="32" cy="38" r="20" fill="#f0efed" stroke="#333" stroke-width="1.5"/>
  <ellipse cx="32" cy="43" rx="8" ry="6" fill="#e8e6e3"/>
  <ellipse cx="24" cy="35" rx="3.5" ry="4" fill="#222"/>
  <ellipse cx="40" cy="35" rx="3.5" ry="4" fill="#222"/>
  <circle cx="25.5" cy="33.5" r="1.2" fill="white"/>
  <circle cx="41.5" cy="33.5" r="1.2" fill="white"/>
  <ellipse cx="32" cy="42" rx="2.5" ry="2" fill="#333"/>
  <path d="M29 45C30.5 47 33.5 47 35 45" stroke="#333" stroke-width="1.2" stroke-linecap="round" fill="none"/>
  <path d="M16 53C21 57 27 59 32 59C37 59 43 57 48 53" stroke="#c0392b" stroke-width="2.5" stroke-linecap="round" fill="none"/>
</svg>`;
