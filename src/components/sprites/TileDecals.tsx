/**
 * Flat floor decals for special tiles, in the pre-rendered 2002 tomb look.
 * `TrapDecal` is a SUNKEN PIT — a hole cut through the sandstone with a bone
 * skull lying at the bottom of it. `KeyDecal` is a bronze key laid in a raised
 * carved-stone medallion. Both are top-down: no facing, no mirror, no rotation.
 *
 * Lighting convention (whole project): light comes from the TOP-LEFT. For the
 * pit that means the near lip overhangs and throws a near-black crescent across
 * the TOP of the opening, while the far inner wall at the BOTTOM catches the
 * light. That inversion is what separates a hole from a medallion.
 */

interface DecalProps {
  size?: number;
  className?: string;
}

const STONE = '#b39a68';
const STONE_DK = '#8a713f';
const ENGRAVE = '#4a3617';
const RIM_HI = '#d8c290';

/** Pit palette — the cut face and floor of the recess. */
const PIT_WALL = '#4a3a1d';
const PIT_WALL_LIT = '#a98b56';
const PIT_FLOOR = '#33260f';
const PIT_FLOOR_DEEP = '#120c05';
const BONE_HI = '#efe4c8';
const BONE = '#d5c49e';
const BONE_SHADE = '#7e7052';

/** Raised stone disc — the medallion plate the key sits on. */
function Disc() {
  return (
    <>
      <circle cx="32" cy="32" r="29" fill={STONE_DK} />
      <circle cx="32" cy="32" r="29" fill="none" stroke={ENGRAVE} strokeWidth="2" opacity="0.7" />
      <circle cx="32" cy="31" r="24" fill={STONE} />
      <circle cx="32" cy="31" r="24" fill="none" stroke={ENGRAVE} strokeWidth="1.6" opacity="0.55" />
      {/* top-left lit rim: the plate stands proud of the floor */}
      <path d="M12 26 A24 24 0 0 1 50 16" fill="none" stroke={RIM_HI} strokeWidth="1.6" opacity="0.6" strokeLinecap="round" />
    </>
  );
}

/** Sunken pit with a skull at the bottom — marks a lethal trap tile. */
export function TrapDecal({ size = 40, className }: DecalProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-label="trap">
      <defs>
        <clipPath id="td-pit-clip">
          <circle cx="32" cy="32" r="30" />
        </clipPath>
        {/* far inner wall lit at the bottom, near wall unlit at the top */}
        <linearGradient id="td-pit-wall" x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor={PIT_WALL} stopOpacity="0" />
          <stop offset="0.5" stopColor={PIT_WALL} stopOpacity="0" />
          <stop offset="0.78" stopColor={PIT_WALL_LIT} stopOpacity="0.55" />
          <stop offset="1" stopColor={PIT_WALL_LIT} stopOpacity="1" />
        </linearGradient>
        <radialGradient id="td-pit-floor" cx="0.44" cy="0.38" r="0.72">
          <stop offset="0" stopColor={PIT_FLOOR} />
          <stop offset="0.62" stopColor="#22190a" />
          <stop offset="1" stopColor={PIT_FLOOR_DEEP} />
        </radialGradient>
        {/* the overhanging lip: hard shadow across the top of the opening */}
        <linearGradient id="td-pit-overhang" x1="0.25" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor="#000000" stopOpacity="0.95" />
          <stop offset="0.22" stopColor="#000000" stopOpacity="0.7" />
          <stop offset="0.5" stopColor="#000000" stopOpacity="0.25" />
          <stop offset="0.78" stopColor="#000000" stopOpacity="0" />
        </linearGradient>
        {/* edge vignette so nothing inside the hole reads as flat */}
        <radialGradient id="td-pit-vignette" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.45" stopColor="#000000" stopOpacity="0" />
          <stop offset="0.82" stopColor="#000000" stopOpacity="0.32" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.75" />
        </radialGradient>
        <linearGradient id="td-bone" x1="0.25" y1="0" x2="0.7" y2="1">
          <stop offset="0" stopColor={BONE_HI} />
          <stop offset="0.5" stopColor={BONE} />
          <stop offset="1" stopColor={BONE_SHADE} />
        </linearGradient>
      </defs>

      <circle cx="32" cy="32" r="30" fill={PIT_FLOOR_DEEP} />

      <g clipPath="url(#td-pit-clip)">
        {/* cut face of the recess */}
        <circle cx="32" cy="32" r="30" fill={PIT_WALL} />
        <circle cx="32" cy="32" r="30" fill="url(#td-pit-wall)" />
        {/* the floor of the pit, a little below the opening */}
        <ellipse cx="32" cy="33.5" rx="21.5" ry="20" fill="url(#td-pit-floor)" />
        <ellipse cx="32" cy="33.5" rx="21.5" ry="20" fill="none" stroke="#000000" strokeWidth="2.2" opacity="0.45" />

        {/* skull lying at the bottom of the hole */}
        <g transform="translate(32 34.8) scale(0.74) translate(-32 -32)">
          <ellipse cx="32" cy="52" rx="17" ry="6" fill="#000000" opacity="0.5" />
          <path
            d="M32 15 C21 15 16 23 16 31 C16 37 20 40 22 42 L22 46 C22 48 24 49 26 49 L38 49 C40 49 42 48 42 46 L42 42 C44 40 48 37 48 31 C48 23 43 15 32 15 Z"
            fill="url(#td-bone)"
            stroke="#2b2009"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <ellipse cx="26" cy="31" rx="4.8" ry="5.4" fill="#120c04" />
          <ellipse cx="38" cy="31" rx="4.8" ry="5.4" fill="#120c04" />
          <path d="M32 35 L28.6 41.4 L35.4 41.4 Z" fill="#120c04" />
          <g stroke="#2b2009" strokeWidth="1.6">
            <path d="M27 44 L27 49 M32 44 L32 49 M37 44 L37 49 M24 46 L40 46" />
          </g>
          <path d="M23 23 Q28 18 34 18" fill="none" stroke="#fbf5e4" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
        </g>

        {/* depth passes, over everything in the hole */}
        <circle cx="32" cy="32" r="30" fill="url(#td-pit-vignette)" />
        <circle cx="32" cy="32" r="30" fill="url(#td-pit-overhang)" />

        {/* far inner wall highlight: the one lit crescent, bottom / bottom-right */}
        <path
          d="M13 50.5 A27 27 0 0 0 55.5 41"
          fill="none"
          stroke={PIT_WALL_LIT}
          strokeWidth="6"
          opacity="0.3"
          strokeLinecap="round"
        />
        <path
          d="M16.5 52.5 A26 26 0 0 0 54 41.5"
          fill="none"
          stroke="#cfae70"
          strokeWidth="2.2"
          opacity="0.55"
          strokeLinecap="round"
        />
      </g>

      {/* crisp cut edge of the opening */}
      <circle cx="32" cy="32" r="30" fill="none" stroke={ENGRAVE} strokeWidth="1.5" opacity="0.85" />
      <path d="M7.4 33 A30 30 0 0 1 30.6 2.1" fill="none" stroke="#e3cfa4" strokeWidth="1.1" opacity="0.3" strokeLinecap="round" />
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
