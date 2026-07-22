/**
 * A gilded ankh (☥) — the ancient Egyptian "life" symbol: a looped cross, drawn
 * as a gold amulet (bright bevel top, deep gold below, dark engraved rim). Purely
 * decorative; marks the current-pyramid plaque in the sidebar.
 */
interface AnkhProps {
  size?: number;
  className?: string;
}

export function Ankh({ size = 30, className }: AnkhProps) {
  const w = Math.round(size * 0.64);
  return (
    <svg
      width={w}
      height={size}
      viewBox="0 0 28 46"
      fill="none"
      className={className}
      role="img"
      aria-label="Ankh — symbol of life"
    >
      <defs>
        <linearGradient id="ankh-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f7de88" />
          <stop offset="45%" stopColor="#e2ba49" />
          <stop offset="100%" stopColor="#a67d1d" />
        </linearGradient>
      </defs>
      {/* vertical shaft (behind the loop) */}
      <rect x="11" y="13" width="6" height="29" rx="2.6" fill="url(#ankh-gold)" stroke="#6e4f14" strokeWidth="1" />
      {/* cross arms */}
      <rect x="3" y="18.5" width="22" height="6" rx="2.6" fill="url(#ankh-gold)" stroke="#6e4f14" strokeWidth="1" />
      {/* looped top — a gold ring (outer ellipse minus inner, even-odd) */}
      <path
        fillRule="evenodd"
        d="M7.5 9.5 a6.5 8.6 0 1 0 13 0 a6.5 8.6 0 1 0 -13 0 Z
           M10.6 9.5 a3.4 4.9 0 1 1 6.8 0 a3.4 4.9 0 1 1 -6.8 0 Z"
        fill="url(#ankh-gold)"
        stroke="#6e4f14"
        strokeWidth="1"
      />
      {/* specular highlight on the loop's upper-left */}
      <path d="M9.2 4.6 Q7.4 7.6 7.9 11.2" fill="none" stroke="#fff2cd" strokeWidth="1.3" strokeLinecap="round" opacity="0.85" />
      <path d="M12.6 14 L12.6 40" stroke="#fff2cd" strokeWidth="0.9" strokeLinecap="round" opacity="0.4" />
    </svg>
  );
}
