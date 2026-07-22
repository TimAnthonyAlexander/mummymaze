/**
 * Flat floor decals for special tiles, styled as carved-stone medallions sunk
 * into the sandstone (matching the pre-rendered 2002 look) rather than flat line
 * icons. `TrapDecal` is a skull medallion (a death tile); `KeyDecal` is a bronze
 * key laid in a stone disc. Both are top-down, no facing, no mirror.
 */

interface DecalProps {
  size?: number;
  className?: string;
}

const STONE = '#b39a68';
const STONE_DK = '#8a713f';
const ENGRAVE = '#4a3617';
const RIM_HI = '#d8c290';

/** Recessed stone disc shared by every medallion. */
function Disc({ danger = false }: { danger?: boolean }) {
  return (
    <>
      <circle cx="32" cy="32" r="29" fill={STONE_DK} />
      <circle cx="32" cy="32" r="29" fill="none" stroke={ENGRAVE} strokeWidth="2" opacity="0.7" />
      <circle cx="32" cy="31" r="24" fill={STONE} />
      {/* inner engraved ring + a top-left lit rim to read as sunk */}
      <circle cx="32" cy="31" r="24" fill="none" stroke={ENGRAVE} strokeWidth="1.6" opacity="0.55" />
      <path d="M12 26 A24 24 0 0 1 50 16" fill="none" stroke={RIM_HI} strokeWidth="1.6" opacity="0.6" strokeLinecap="round" />
      {danger && <circle cx="32" cy="31" r="27" fill="none" stroke="#7a2a20" strokeWidth="2" opacity="0.5" />}
    </>
  );
}

/** Skull medallion — marks a lethal trap tile. */
export function TrapDecal({ size = 40, className }: DecalProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-label="trap">
      <Disc danger />
      {/* cranium + jaw, carved cream over the stone */}
      <path
        d="M32 15 C21 15 16 23 16 31 C16 37 20 40 22 42 L22 46 C22 48 24 49 26 49 L38 49 C40 49 42 48 42 46 L42 42 C44 40 48 37 48 31 C48 23 43 15 32 15 Z"
        fill="#e7dcc0"
        stroke={ENGRAVE}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* eye sockets + nose */}
      <ellipse cx="26" cy="31" rx="4.6" ry="5.2" fill={ENGRAVE} />
      <ellipse cx="38" cy="31" rx="4.6" ry="5.2" fill={ENGRAVE} />
      <path d="M32 35 L29 41 L35 41 Z" fill={ENGRAVE} />
      {/* teeth */}
      <g stroke={ENGRAVE} strokeWidth="1.3">
        <path d="M27 44 L27 49 M32 44 L32 49 M37 44 L37 49 M24 46 L40 46" />
      </g>
      {/* highlight */}
      <path d="M24 22 Q28 18 33 18" fill="none" stroke="#f6efdc" strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
    </svg>
  );
}

/** Bronze key laid in a stone disc — marks a gate key tile. */
export function KeyDecal({ size = 40, className }: DecalProps) {
  const bronze = '#c58a34';
  const bronzeDk = '#8a5a1c';
  const bronzeHi = '#e8b35c';
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-label="key">
      <Disc />
      <g transform="rotate(-38 32 32)">
        {/* bow (ring) */}
        <circle cx="24" cy="32" r="8.5" fill="none" stroke={bronzeDk} strokeWidth="6.5" />
        <circle cx="24" cy="32" r="8.5" fill="none" stroke={bronze} strokeWidth="4" />
        <circle cx="24" cy="32" r="3.4" fill={STONE} stroke={bronzeDk} strokeWidth="1.4" />
        {/* shaft */}
        <rect x="32" y="30" width="18" height="4.4" rx="1.5" fill={bronze} stroke={bronzeDk} strokeWidth="1.4" />
        {/* teeth */}
        <rect x="44" y="34" width="3.2" height="5" fill={bronze} stroke={bronzeDk} strokeWidth="1.2" />
        <rect x="48.5" y="34" width="3.2" height="7" fill={bronze} stroke={bronzeDk} strokeWidth="1.2" />
        {/* highlight */}
        <path d="M18 27 A8.5 8.5 0 0 1 30 27" fill="none" stroke={bronzeHi} strokeWidth="1.5" strokeLinecap="round" />
      </g>
    </svg>
  );
}
