/**
 * Hand-authored inline-SVG character sprites, styled after the pre-rendered PNG
 * art (cream bulky mummy, pith-helmet explorer, side-on amber scorpion) but with
 * NO baked shadow — the board draws a separate static circular shadow under each
 * (.sprite__shadow), so a sprite can be mirrored to face its target without the
 * shadow moving or the perspective breaking. Warm cel shading: flat fills + one
 * hard shadow tone down-right and a light tone up-left (light source top-left,
 * matching the walls), a modest dark outline, a bit of personality. No smooth
 * gradients. 64x64 viewBox, transparent, centered.
 */

const OUTLINE = '#2a1d10';

interface SpriteProps {
  size?: number;
  className?: string;
}

/** Explorer — pulp adventurer: pith helmet, khaki, green strap, off flashlight. */
export function ExplorerSprite({ size = 48, className }: SpriteProps) {
  const khaki = '#c0a469';
  const khakiSh = '#977c44';
  const helm = '#ece2c6';
  const helmSh = '#c7ba92';
  const skin = '#e4b485';
  const skinSh = '#c68f61';
  const strap = '#3f8253';
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-label="explorer">
      {/* boots */}
      <ellipse cx="26.5" cy="55" rx="4.4" ry="3" fill="#5a4326" stroke={OUTLINE} strokeWidth="2" />
      <ellipse cx="37.5" cy="55" rx="4.4" ry="3" fill="#5a4326" stroke={OUTLINE} strokeWidth="2" />
      {/* legs */}
      <path d="M27 46 L26 53 M37 46 L38 53" stroke={khaki} strokeWidth="6" strokeLinecap="round" />
      <path d="M27 46 L26 53 M37 46 L38 53" stroke={OUTLINE} strokeWidth="2.2" strokeLinecap="round" opacity="0.55" />
      {/* left arm */}
      <path d="M22 34 Q17 39 18 45" stroke={khaki} strokeWidth="5.5" fill="none" strokeLinecap="round" />
      <path d="M22 34 Q17 39 18 45" stroke={OUTLINE} strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.5" />
      {/* torso */}
      <path d="M22 32 Q22 29 32 29 Q42 29 42 32 L43 47 Q32 51 21 47 Z" fill={khaki} stroke={OUTLINE} strokeWidth="2.4" strokeLinejoin="round" />
      {/* torso cel shadow (right) */}
      <path d="M43 47 Q38 49 33 49.5 L34 30 Q42 30.5 42 32 Z" fill={khakiSh} />
      {/* green cross-strap + satchel */}
      <path d="M24 31 L41 46" stroke={strap} strokeWidth="3.4" strokeLinecap="round" />
      <rect x="38.5" y="43" width="8.5" height="8" rx="2" fill="#7a5124" stroke={OUTLINE} strokeWidth="2" />
      {/* right arm holding the flashlight */}
      <path d="M42 33 Q47 36 47 41" stroke={khaki} strokeWidth="5.5" fill="none" strokeLinecap="round" />
      <path d="M42 33 Q47 36 47 41" stroke={OUTLINE} strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.5" />
      {/* flashlight — OFF — aimed down-forward */}
      <g transform="translate(47 41) rotate(52)">
        <rect x="-1" y="-3" width="8" height="6" rx="2.2" fill="#c2a038" stroke={OUTLINE} strokeWidth="2" />
        <path d="M7 -3.6 L11 -4.6 L11 4.6 L7 3.6 Z" fill="#a5842a" stroke={OUTLINE} strokeWidth="2" strokeLinejoin="round" />
        <ellipse cx="10.6" cy="0" rx="1.4" ry="2.8" fill="#241a10" stroke="#3c2c18" strokeWidth="1" />
      </g>
      {/* face */}
      <path d="M25 24 Q25 31 32 31 Q39 31 39 24 Z" fill={skin} stroke={OUTLINE} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M39 24 Q39 30 33 31 L33 24 Z" fill={skinSh} />
      <circle cx="29.5" cy="26.5" r="1.5" fill={OUTLINE} />
      <circle cx="35" cy="26.5" r="1.5" fill={OUTLINE} />
      <path d="M29 29 Q32 31 35 29" stroke={OUTLINE} strokeWidth="1.4" fill="none" strokeLinecap="round" />
      {/* pith helmet: brim + dome + knob */}
      <ellipse cx="32" cy="22.5" rx="13.5" ry="4.6" fill={helm} stroke={OUTLINE} strokeWidth="2.4" />
      <path d="M20 22 Q20 11 32 11 Q44 11 44 22 Z" fill={helm} stroke={OUTLINE} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M44 22 Q44 13 36 11.3 L36 22 Z" fill={helmSh} />
      <path d="M18.6 23 Q32 27 45.4 23" stroke={helmSh} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M23 16 Q32 12 41 16" stroke={helmSh} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <circle cx="32" cy="10" r="2.1" fill={helm} stroke={OUTLINE} strokeWidth="2" />
      {/* helmet highlight */}
      <path d="M24 15 Q27 12 31 11.6" stroke="#f6efd9" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/** Wrapped mummy — the fast pursuer. variant 'white' or 'red'. */
export function MummySprite({
  size = 48,
  className,
  variant = 'white',
}: SpriteProps & { variant?: 'white' | 'red' }) {
  const base = variant === 'red' ? '#d8a07a' : '#e7dec2';
  const shade = variant === 'red' ? '#b07a54' : '#c9bc95';
  const hi = variant === 'red' ? '#e6b895' : '#f3ecd7';
  const band = variant === 'red' ? '#9a6844' : '#b3a67f';
  const eye = variant === 'red' ? '#ff4b4b' : '#ffcf3a';
  const cid = `mumclip-${variant}`;
  const body =
    'M32 14 C 44 14, 47 25, 46 34 C 45 47, 40 56, 32 56 C 24 56, 19 47, 18 34 C 17 25, 20 14, 32 14 Z';
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-label={`${variant} mummy`}>
      <defs>
        <clipPath id={cid}>
          <path d={body} />
        </clipPath>
      </defs>
      {/* stubby arms out to the sides */}
      <path d="M19 33 Q11 33 10 41" stroke={base} strokeWidth="7" fill="none" strokeLinecap="round" />
      <path d="M19 33 Q11 33 10 41" stroke={OUTLINE} strokeWidth="2.3" fill="none" strokeLinecap="round" />
      <path d="M45 33 Q53 33 54 41" stroke={base} strokeWidth="7" fill="none" strokeLinecap="round" />
      <path d="M45 33 Q53 33 54 41" stroke={OUTLINE} strokeWidth="2.3" fill="none" strokeLinecap="round" />
      {/* little feet */}
      <ellipse cx="26" cy="55.5" rx="4.2" ry="2.6" fill={base} stroke={OUTLINE} strokeWidth="2.2" />
      <ellipse cx="38" cy="55.5" rx="4.2" ry="2.6" fill={base} stroke={OUTLINE} strokeWidth="2.2" />
      {/* body */}
      <path d={body} fill={base} stroke={OUTLINE} strokeWidth="2.5" strokeLinejoin="round" />
      {/* cel shading + wrap bands, contained to the body */}
      <g clipPath={`url(#${cid})`}>
        <path d="M32 14 C 40 17, 40 28, 40 36 C 40 46, 37 54, 32 56 C 40 56, 45 47, 46 34 C 47 25, 44 14, 32 14 Z" fill={shade} />
        <path d="M23 18 C 20 22, 19 28, 19.5 34 C 21 30, 24 25, 27 22 C 25 20, 24 18.5, 23 18 Z" fill={hi} />
        <g stroke={band} strokeWidth="2.1" fill="none" strokeLinecap="round">
          <path d="M18 23 Q32 28 46 23" />
          <path d="M18 31 Q32 36 46 31" />
          <path d="M18 39 Q32 44 46 38" />
          <path d="M20 47 Q32 52 44 46" />
          <path d="M24 20 L28 25 M40 25 L44 20 M28 42 L33 47 M37 34 L41 38" />
        </g>
      </g>
      {/* loose dangling wrap end */}
      <path d="M40 53 L45 58 L39 57.5 Z" fill={base} stroke={OUTLINE} strokeWidth="1.8" strokeLinejoin="round" />
      {/* shadowed eye band + glaring eyes */}
      <path d="M21 33 Q32 30 43 33 Q43 39 32 39 Q21 39 21 33 Z" fill="#241a10" opacity="0.92" />
      <circle cx="27" cy="35" r="3.1" fill={eye} opacity="0.3" />
      <circle cx="37" cy="35" r="3.1" fill={eye} opacity="0.3" />
      <circle cx="27" cy="35" r="2.2" fill={eye} />
      <circle cx="37" cy="35" r="2.2" fill={eye} />
      <circle cx="26.4" cy="34.4" r="0.8" fill="#fff7db" />
      <circle cx="36.4" cy="34.4" r="0.8" fill="#fff7db" />
    </svg>
  );
}

/** Scorpion — the slower pursuer. variant 'white' or 'red'. Drawn side-on. */
export function ScorpionSprite({
  size = 48,
  className,
  variant = 'white',
}: SpriteProps & { variant?: 'white' | 'red' }) {
  const base = variant === 'red' ? '#b34532' : '#b98b46';
  const shade = variant === 'red' ? '#82291d' : '#8a6531';
  const hi = variant === 'red' ? '#cf6350' : '#cfa259';
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-label={`${variant} scorpion`}>
      {/* tail arcing over from the rear, stinger poised */}
      <path d="M32 32 Q29 15 39 12 Q49 11 46 21" fill="none" stroke={base} strokeWidth="6.5" strokeLinecap="round" />
      <path d="M32 32 Q29 15 39 12 Q49 11 46 21" fill="none" stroke={OUTLINE} strokeWidth="2.3" strokeLinecap="round" />
      <path d="M45 20 L51 22 L47 26 Z" fill={shade} stroke={OUTLINE} strokeWidth="2" strokeLinejoin="round" />
      {/* legs */}
      <g stroke={OUTLINE} strokeWidth="2.3" strokeLinecap="round">
        <path d="M26 40 L15 36 M26 44 L14 46 M27 48 L17 53" />
        <path d="M38 40 L49 36 M38 44 L50 46 M37 48 L47 53" />
      </g>
      {/* abdomen (rear) */}
      <ellipse cx="32" cy="37" rx="11.5" ry="9" fill={base} stroke={OUTLINE} strokeWidth="2.5" />
      <path d="M32 28 Q40 30 43 37 Q42 44 36 45.5 Q40 40 39 34 Q37 30 32 28 Z" fill={shade} />
      {/* head / thorax (front) */}
      <ellipse cx="32" cy="46" rx="9" ry="7" fill={base} stroke={OUTLINE} strokeWidth="2.4" />
      <path d="M32 39 Q39 41 41 46 Q40 51 35 52 Q39 48 38 44 Q36 40 32 39 Z" fill={shade} />
      {/* segment lines */}
      <path d="M23 35 Q32 38 41 35 M24 40 Q32 43 40 40" stroke={shade} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {/* claws reaching forward */}
      <path d="M25 50 Q17 55 19 61 Q22 56 27 57 Z" fill={base} stroke={OUTLINE} strokeWidth="2.3" strokeLinejoin="round" />
      <path d="M39 50 Q47 55 45 61 Q42 56 37 57 Z" fill={base} stroke={OUTLINE} strokeWidth="2.3" strokeLinejoin="round" />
      {/* highlight + eyes */}
      <ellipse cx="27.5" cy="33.5" rx="3.4" ry="2.2" fill={hi} />
      <circle cx="29.5" cy="45" r="1.4" fill={OUTLINE} />
      <circle cx="34.5" cy="45" r="1.4" fill={OUTLINE} />
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
