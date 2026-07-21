/**
 * Hand-authored inline-SVG character sprites. Vector so they stay crisp at any
 * cell size, fully editable, zero binary assets. All draw on a 64x64 viewBox,
 * transparent background, centered, with a bold dark outline for readability at
 * small sizes. Swap palettes via the `variant` prop.
 */

const OUTLINE = '#241a10';

interface SpriteProps {
  size?: number;
  className?: string;
}

/** Explorer / adventurer — the player character (fedora + satchel). */
export function ExplorerSprite({ size = 48, className }: SpriteProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-label="explorer"
    >
      <ellipse cx="32" cy="59" rx="13" ry="2.8" fill="rgba(0,0,0,0.20)" />
      {/* legs */}
      <path d="M26 46 L26 55 L22 55 L23 45 Z" fill="#5a4326" stroke={OUTLINE} strokeWidth="2" strokeLinejoin="round" />
      <path d="M38 46 L38 55 L42 55 L41 45 Z" fill="#5a4326" stroke={OUTLINE} strokeWidth="2" strokeLinejoin="round" />
      {/* torso / shirt */}
      <path d="M22 30 Q22 26 32 26 Q42 26 42 30 L43 47 Q32 51 21 47 Z" fill="#8a9a4e" stroke={OUTLINE} strokeWidth="2.5" strokeLinejoin="round" />
      {/* satchel strap + bag */}
      <path d="M24 28 L40 44" stroke="#6b4a24" strokeWidth="3" strokeLinecap="round" />
      <rect x="38" y="40" width="10" height="9" rx="2" fill="#7a5124" stroke={OUTLINE} strokeWidth="2" />
      {/* arms */}
      <path d="M22 32 Q17 36 19 42" stroke={OUTLINE} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* head */}
      <circle cx="32" cy="20" r="8" fill="#e3b98a" stroke={OUTLINE} strokeWidth="2.5" />
      {/* hat */}
      <ellipse cx="32" cy="15" rx="14" ry="4" fill="#7a5124" stroke={OUTLINE} strokeWidth="2.5" />
      <path d="M25 15 Q25 8 32 8 Q39 8 39 15 Z" fill="#8a5c28" stroke={OUTLINE} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M25 15 Q32 12 39 15" stroke="#5a3d18" strokeWidth="2" fill="none" />
      {/* eyes */}
      <circle cx="29" cy="21" r="1.4" fill={OUTLINE} />
      <circle cx="35" cy="21" r="1.4" fill={OUTLINE} />
    </svg>
  );
}

/** Wrapped mummy — the fast pursuer. variant 'white' or 'red'. */
export function MummySprite({
  size = 48,
  className,
  variant = 'white',
}: SpriteProps & { variant?: 'white' | 'red' }) {
  const wrap = variant === 'red' ? '#c98c6b' : '#efe7d2';
  const band = variant === 'red' ? '#a76a4b' : '#d6c9a9';
  const eye = variant === 'red' ? '#ff4d4d' : '#ffd23e';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-label={`${variant} mummy`}
    >
      <ellipse cx="32" cy="59" rx="13" ry="2.8" fill="rgba(0,0,0,0.20)" />
      {/* body */}
      <path
        d="M19 27 Q19 13 32 13 Q45 13 45 27 L45 50 Q45 58 37 58 L27 58 Q19 58 19 50 Z"
        fill={wrap}
        stroke={OUTLINE}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* arms (shambling, raised) */}
      <path d="M19 30 Q10 30 10 38" stroke={wrap} strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d="M19 30 Q10 30 10 38" stroke={OUTLINE} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M45 30 Q54 30 54 38" stroke={wrap} strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d="M45 30 Q54 30 54 38" stroke={OUTLINE} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      {/* bandage wrap lines */}
      <path d="M20 22 Q32 26 44 21" stroke={band} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M19 40 Q32 44 45 39" stroke={band} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M20 48 L44 46" stroke={band} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M26 52 L38 54" stroke={band} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      {/* loose dangling end */}
      <path d="M37 57 L40 62 L36 61 Z" fill={wrap} stroke={OUTLINE} strokeWidth="1.6" strokeLinejoin="round" />
      {/* eye slot */}
      <rect x="22" y="28" width="20" height="7.5" rx="3.5" fill={OUTLINE} opacity="0.9" />
      <circle cx="28" cy="31.8" r="2.3" fill={eye} />
      <circle cx="36" cy="31.8" r="2.3" fill={eye} />
    </svg>
  );
}

/** Scorpion — the slower pursuer. variant 'white' or 'red'. */
export function ScorpionSprite({
  size = 48,
  className,
  variant = 'white',
}: SpriteProps & { variant?: 'white' | 'red' }) {
  const body = variant === 'red' ? '#c0392b' : '#c9a24b';
  const bodyDark = variant === 'red' ? '#8f2318' : '#9c7a2e';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-label={`${variant} scorpion`}
    >
      <ellipse cx="32" cy="56" rx="15" ry="3" fill="rgba(0,0,0,0.20)" />
      {/* claws */}
      <path d="M20 30 Q10 26 8 32 Q12 30 16 33" fill={body} stroke={OUTLINE} strokeWidth="2" strokeLinejoin="round" />
      <path d="M44 30 Q54 26 56 32 Q52 30 48 33" fill={body} stroke={OUTLINE} strokeWidth="2" strokeLinejoin="round" />
      {/* legs */}
      <path d="M24 38 L16 44 M26 40 L18 48 M40 38 L48 44 M38 40 L46 48" stroke={OUTLINE} strokeWidth="2" strokeLinecap="round" />
      {/* body segments */}
      <ellipse cx="32" cy="38" rx="11" ry="8" fill={body} stroke={OUTLINE} strokeWidth="2.5" />
      <path d="M27 36 H37 M26 40 H38" stroke={bodyDark} strokeWidth="2" strokeLinecap="round" />
      {/* tail curling up */}
      <path d="M40 34 Q50 30 48 20 Q47 14 41 15" fill="none" stroke={body} strokeWidth="6" strokeLinecap="round" />
      <path d="M40 34 Q50 30 48 20 Q47 14 41 15" fill="none" stroke={OUTLINE} strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="40" cy="14" r="3.5" fill={bodyDark} stroke={OUTLINE} strokeWidth="2" />
      {/* eyes */}
      <circle cx="29" cy="35" r="1.5" fill={OUTLINE} />
      <circle cx="35" cy="35" r="1.5" fill={OUTLINE} />
    </svg>
  );
}

/** Convenience: pick the right sprite for a monster kind. */
export function MonsterSprite({
  kind,
  size,
  className,
}: {
  kind: 'mummy_white' | 'mummy_red' | 'scorpion_white' | 'scorpion_red';
  size?: number;
  className?: string;
}) {
  const variant = kind.endsWith('red') ? 'red' : 'white';
  return kind.startsWith('scorpion') ? (
    <ScorpionSprite size={size} variant={variant} className={className} />
  ) : (
    <MummySprite size={size} variant={variant} className={className} />
  );
}
