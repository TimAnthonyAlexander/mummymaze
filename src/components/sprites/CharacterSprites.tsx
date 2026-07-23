/**
 * Hand-authored inline-SVG character sprites, restyled to read as early-2000s
 * low-poly PRE-RENDERS rather than flat modern vectors: a muddy, desaturated
 * palette, soft dark-brown outlines (not hard black), and BAKED top-left lighting
 * via radial gradients (light up-left, shadow down-right) that give each form
 * rounded low-poly volume. No baked shadow on the art itself — the board draws a
 * separate static blob under each (.sprite__shadow), so a sprite can be mirrored
 * to face its target without the shadow or lighting breaking. 64x64 viewBox.
 *
 * Gradient ids embed the variant so white/red instances never share a def
 * (duplicate ids in one document collide to the first match).
 */

import { memo, useEffect, useRef } from 'react';

interface SpriteProps {
  size?: number;
  className?: string;
}

/** Explorer — pulp adventurer: pith helmet, muddy khaki, olive strap. */
export const ExplorerSprite = memo(function ExplorerSprite({ size = 48, className }: SpriteProps) {
  // An upstanding, broad-shouldered man built from the same cylinder limbs as the
  // mummy, so the cast reads as one set. Pith helmet, khaki, olive sash, boots.
  const khaki = '#b89a5f';
  const khakiLt = '#d3b981';
  const khakiSh = '#836a3c';
  const helm = '#d8cba2';
  const helmLt = '#efe6c8';
  const helmSh = '#a99b6f';
  const skin = '#cf9f70';
  const boot = '#4f3a20';
  const sash = '#5c7a4a';
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-label="explorer">
      <defs>
        <linearGradient id="exp-torso" x1="0.1" y1="0" x2="0.85" y2="1">
          <stop offset="0%" stopColor={khakiLt} />
          <stop offset="50%" stopColor={khaki} />
          <stop offset="100%" stopColor={khakiSh} />
        </linearGradient>
        <linearGradient id="exp-helm" x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0%" stopColor={helmLt} />
          <stop offset="55%" stopColor={helm} />
          <stop offset="100%" stopColor={helmSh} />
        </linearGradient>
      </defs>

      {/* ── legs (cylinders) with dark boot caps ── */}
      <line x1="28.5" y1="42" x2="28.5" y2="59" stroke={khaki} strokeWidth="7.4" strokeLinecap="round" />
      <line x1="35.5" y1="42" x2="35.5" y2="59" stroke={khakiSh} strokeWidth="7.4" strokeLinecap="round" />
      <line x1="27.2" y1="43" x2="27.2" y2="55" stroke={khakiLt} strokeWidth="2.3" strokeLinecap="round" opacity="0.8" />
      <line x1="28.5" y1="56" x2="28.5" y2="60.5" stroke={boot} strokeWidth="8.4" strokeLinecap="round" />
      <line x1="35.5" y1="56" x2="35.5" y2="60.5" stroke="#3f2e18" strokeWidth="8.4" strokeLinecap="round" />

      {/* ── torso with broad shoulders ── */}
      <path
        d="M17 28 Q16 22 24 21 L40 21 Q48 22 47 28 L41 33 L39 45 Q32 48 25 45 L23 33 Z"
        fill="url(#exp-torso)"
      />
      <path d="M18 27 Q24 22 32 22 Q40 22 46 27" fill="none" stroke={khakiLt} strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
      <path d="M40 22 Q46 23 46 28 L40 33 L38.5 44 Q35 46 32 46 Z" fill={khakiSh} opacity="0.4" />
      {/* olive cross-sash + satchel */}
      <path d="M23 24 L40 44" stroke={sash} strokeWidth="3.6" strokeLinecap="round" />
      <path d="M23 24 L40 44" stroke="#48633a" strokeWidth="1.3" strokeLinecap="round" opacity="0.7" />
      <rect x="15.5" y="40" width="8.5" height="8.5" rx="2.2" fill="#6b4a24" stroke="#4a3216" strokeWidth="1" />

      {/* ── arms BENT at the elbow, forearms coming forward; the right hand
            carries the flashlight out in front ── */}
      {/* shadows the forearms cast onto the torso (separation) */}
      <ellipse cx="25.5" cy="43" rx="4" ry="2" fill="#241505" opacity="0.3" />
      <ellipse cx="38.5" cy="43" rx="4" ry="2" fill="#241505" opacity="0.34" />
      {/* left arm: upper arm straight DOWN the side, forearm bends forward-in */}
      <path d="M21 24 Q20.6 29 20.9 33 Q21.8 38 25 40.2" fill="none" stroke={khaki} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20.1 25 Q19.8 29 20.1 32.5" fill="none" stroke={khakiLt} strokeWidth="2.2" strokeLinecap="round" />
      {/* right arm: upper arm straight DOWN, forearm brings the flashlight forward */}
      <path d="M43 24 Q43.4 29 43.1 33 Q42.2 38 39 40.2" fill="none" stroke={khakiSh} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M43.2 25 Q43.5 29 43.2 32.5" fill="none" stroke={khaki} strokeWidth="2" strokeLinecap="round" opacity="0.85" />
      {/* dark seams where the upper arms meet the torso */}
      <line x1="23.7" y1="26" x2="23.7" y2="32" stroke="#241505" strokeWidth="1.8" strokeLinecap="round" opacity="0.42" />
      <line x1="40.3" y1="26" x2="40.3" y2="32" stroke="#241505" strokeWidth="2" strokeLinecap="round" opacity="0.46" />
      {/* hands */}
      <ellipse cx="25.2" cy="41" rx="3.3" ry="2.9" fill={khaki} />
      <ellipse cx="39" cy="41" rx="3.3" ry="2.9" fill={khakiSh} />
      {/* flashlight gripped in the right hand, aimed down-forward */}
      <g transform="translate(39.5 41.5) rotate(52)">
        <rect x="-1.5" y="-2.5" width="8" height="5" rx="2" fill="#b08f30" stroke="#7a5f1c" strokeWidth="1" />
        <path d="M6.5 -3 L10.5 -3.8 L10.5 3.8 L6.5 3 Z" fill="#8f7124" stroke="#5f4a15" strokeWidth="1" strokeLinejoin="round" />
      </g>

      {/* ── head: shadowed face under a wide pith helmet ── */}
      <ellipse cx="32" cy="19.5" rx="5.6" ry="5.2" fill={skin} />
      <path d="M32 15 Q37 16 37.5 20 Q37 24 32 24.5 Z" fill="#a67c4d" opacity="0.5" />
      <circle cx="29.8" cy="20.2" r="1.4" fill="#2a1d10" />
      <circle cx="34.2" cy="20.2" r="1.4" fill="#2a1d10" />
      {/* wide brim casts a shadow over the eyes */}
      <ellipse cx="32" cy="16.5" rx="12.5" ry="4" fill="url(#exp-helm)" />
      <path d="M20 16.5 Q32 20 44 16.5" fill="none" stroke={helmSh} strokeWidth="1.4" strokeLinecap="round" opacity="0.8" />
      {/* dome + knob */}
      <path d="M23 16 Q23 7 32 7 Q41 7 41 16 Z" fill="url(#exp-helm)" />
      <circle cx="32" cy="6.5" r="2" fill={helm} />
      <path d="M25 12 Q28 8.6 32 8.3" fill="none" stroke={helmLt} strokeWidth="1.6" strokeLinecap="round" opacity="0.85" />
    </svg>
  );
});

/** Wrapped mummy — the fast pursuer. variant 'white' or 'red'. */
export function MummySprite({
  size = 48,
  className,
  variant = 'white',
}: SpriteProps & { variant?: 'white' | 'red' }) {
  // Muddy bone vs muddy terracotta; eyes stay bright gold on both. Every limb is
  // a rounded-cap CYLINDER: base tube + a lit stripe down its upper-left edge.
  const isRed = variant === 'red';
  const base = isRed ? '#bb6349' : '#d9ccac';
  const light = isRed ? '#d4886c' : '#f1e8cf';
  const shade = isRed ? '#7c3826' : '#a5966a';
  const band = isRed ? '#8a4531' : '#a99a6c';
  const bandHi = isRed ? '#d98f75' : '#efe6cc';
  const eye = isRed ? '#ffdc55' : '#ffd23f';
  const gid = `mum-body-${variant}`;

  // A standing wrapped MAN, high 3/4 view: broad shoulders, both arms straight
  // out FORWARD (foreshortened cylinders pointing at us, the zombie reach), a
  // barrel torso, two cylinder legs whose rounded ends are the feet. Light bakes
  // from the top-left. Only the eyes show through the wrappings.
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-label={`${variant} mummy`}>
      <defs>
        <linearGradient id={gid} x1="0.1" y1="0" x2="0.85" y2="1">
          <stop offset="0%" stopColor={light} />
          <stop offset="50%" stopColor={base} />
          <stop offset="100%" stopColor={shade} />
        </linearGradient>
      </defs>

      {/* ── legs: two cylinders, rounded caps = feet ── */}
      <line x1="28.5" y1="41" x2="28.5" y2="61" stroke={base} strokeWidth="7.6" strokeLinecap="round" />
      <line x1="35.5" y1="41" x2="35.5" y2="61" stroke={shade} strokeWidth="7.6" strokeLinecap="round" />
      <line x1="27" y1="43" x2="27" y2="59" stroke={light} strokeWidth="2.4" strokeLinecap="round" opacity="0.8" />
      <line x1="34.2" y1="43" x2="34.2" y2="59" stroke={base} strokeWidth="2.2" strokeLinecap="round" opacity="0.7" />

      {/* ── torso with broad shoulders tapering to the waist ── */}
      <path
        d="M17 28 Q16 22 24 21 L40 21 Q48 22 47 28 L41 33 L39 45 Q32 48 25 45 L23 33 Z"
        fill={`url(#${gid})`}
      />
      {/* shoulder-top lit edge + shadowed right flank for cylinder volume */}
      <path d="M18 27 Q24 22 32 22 Q40 22 46 27" fill="none" stroke={light} strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
      <path d="M40 22 Q46 23 46 28 L40 33 L38.5 44 Q35 46 32 46 Z" fill={shade} opacity="0.4" />

      {/* ── arms thrust straight FORWARD, hung off the SHOULDERS: foreshortened,
            so they are SHORT stubs pointing down in 2D, out at the shoulder line
            and ending in fists — well clear of the legs ── */}
      {/* soft shadow each arm casts down onto the torso — lifts it toward us */}
      <ellipse cx="22" cy="37" rx="4.8" ry="2.7" fill="#1a0f07" opacity="0.36" />
      <ellipse cx="42" cy="37" rx="4.8" ry="2.7" fill="#1a0f07" opacity="0.4" />
      {/* short forearm cylinders, springing from the shoulder tops */}
      <line x1="21" y1="23" x2="21" y2="34" stroke={base} strokeWidth="7.2" strokeLinecap="round" />
      <line x1="43" y1="23" x2="43" y2="34" stroke={shade} strokeWidth="7.2" strokeLinecap="round" />
      {/* lit OUTER edge (arms catch the key light) so they sit in front... */}
      <line x1="19.3" y1="24.5" x2="19.3" y2="33" stroke={light} strokeWidth="3" strokeLinecap="round" />
      <line x1="41.2" y1="24.5" x2="41.2" y2="33" stroke={base} strokeWidth="2.6" strokeLinecap="round" opacity="0.9" />
      {/* ...and a dark INNER seam where each arm overlaps the torso (separation) */}
      <line x1="24.4" y1="24.5" x2="24.4" y2="33.5" stroke="#1a0f07" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
      <line x1="39.6" y1="24.5" x2="39.6" y2="33.5" stroke="#1a0f07" strokeWidth="2.3" strokeLinecap="round" opacity="0.5" />
      {/* fists — the near end seen head-on (a knuckled cap, not a floating disc) */}
      <ellipse cx="21" cy="34.5" rx="4.3" ry="3.6" fill={base} />
      <ellipse cx="43" cy="34.5" rx="4.3" ry="3.6" fill={shade} />
      <ellipse cx="19.7" cy="33.3" rx="1.7" ry="1.3" fill={light} opacity="0.75" />
      <g stroke={band} strokeWidth="0.8" opacity="0.5" strokeLinecap="round">
        <path d="M19.1 34.5 L22.9 34.5 M41.1 34.5 L44.9 34.5" />
      </g>

      {/* ── bandage wraps across everything (groove + a lit upper edge) ── */}
      <g strokeLinecap="round" fill="none">
        <g stroke={band} strokeWidth="1.5" opacity="0.85">
          {/* torso */}
          <path d="M20 31 Q32 34 44 31 M21 37 Q32 40 43 37 M23 43 Q32 46 41 43" />
          {/* arm stubs (at the shoulders) */}
          <path d="M17.6 28 L24.4 28 M39.6 28 L46.4 28" />
          {/* legs */}
          <path d="M25 48 L32 49 M25 54 L32 55 M33 48 L40 49 M33 54 L40 55" />
        </g>
        <g stroke={bandHi} strokeWidth="0.7" opacity="0.55">
          <path d="M20 30.2 Q32 33.2 44 30.2 M23 42.2 Q32 45.2 41 42.2" />
        </g>
      </g>

      {/* ── head (neck + skull + wraps + eyes), grouped and drawn LAST so it is a
            single isolated unit. The `.sprite-head` class lets the spawn intro
            turn ONLY the head (a 180° twist), never the whole body — see
            Board.css `spawn-headturn`. The head sits clear above the torso/arms,
            so drawing it last does not change the normal appearance. Nothing
            overlaps it, so a rotation stays self-contained. ── */}
      <g className="sprite-head">
        {/* neck */}
        <path d="M28.5 18 L35.5 18 L35 23 L29 23 Z" fill={shade} opacity="0.7" />
        {/* skull + shaded right side */}
        <ellipse cx="32" cy="12.5" rx="6.4" ry="7" fill={`url(#${gid})`} />
        <path d="M33 6 Q38.4 8 38.4 12.5 Q38.4 17 34 19 Z" fill={shade} opacity="0.45" />
        {/* bandage wraps across the head */}
        <path
          d="M26 9 Q32 11 38 9 M26.5 15.5 Q32 17.5 37.5 15.5"
          fill="none"
          stroke={band}
          strokeWidth="1.5"
          opacity="0.85"
          strokeLinecap="round"
        />
        {/* glaring eyes through a shadowed slit */}
        <path d="M26 12.5 Q32 10.8 38 12.5 Q37.6 16.4 32 16.8 Q26.4 16.4 26 12.5 Z" fill="#20160c" opacity="0.92" />
        <circle cx="29.4" cy="13.3" r="1.8" fill={eye} />
        <circle cx="34.6" cy="13.3" r="1.8" fill={eye} />
        <circle cx="28.9" cy="12.8" r="0.7" fill="#fff7db" />
        <circle cx="34.1" cy="12.8" r="0.7" fill="#fff7db" />
      </g>
    </svg>
  );
}

/**
 * The mummy's head turning a full 360° on the neck for the spawn intro. The head
 * is drawn IDENTICALLY to MummySprite's flat head at rest (same gradient, skull,
 * shade, wraps, slit, eyes) so when it takes over from — and hands back to — the
 * flat head there is NO pop. The turn is the sphere trick a flat card can't do:
 * the round skull silhouette stays put (a ball's outline never collapses), while
 * only the FACE (slit + eyes) orbits across the surface — sliding by `sin`,
 * foreshortening by `cos`, fading as it rounds the rim — and the back-of-head
 * seam swings round through the far hemisphere. Fixed top-left light, as a real
 * turning object has. Same 64×64 viewBox/size as MummySprite → exact overlay.
 */
export const SpawnHead3D = memo(function SpawnHead3D({
  size = 48,
  variant = 'white',
  durationMs = 720,
}: SpriteProps & { variant?: 'white' | 'red'; durationMs?: number }) {
  const isRed = variant === 'red';
  const base = isRed ? '#bb6349' : '#d9ccac';
  const light = isRed ? '#d4886c' : '#f1e8cf';
  const shade = isRed ? '#7c3826' : '#a5966a';
  const band = isRed ? '#8a4531' : '#a99a6c';
  const eye = isRed ? '#ffdc55' : '#ffd23f';
  const gid = `sph-${variant}`;

  const faceRef = useRef<SVGGElement>(null);
  const seamRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

    // The whole FACE (slit + eyes, absolute coords centred on x=32) as one plate:
    // foreshorten horizontally about x=32 by cos, slide by sin, fade at the rim.
    // At a=0 this is the identity → pixel-identical to the flat head.
    const placeFace = (g: SVGGElement | null, a: number) => {
      if (!g) return;
      const depth = Math.cos(a);
      const sx = Math.max(0, depth);
      const dx = 4.4 * Math.sin(a);
      const op = Math.max(0, Math.min(1, (depth - 0.03) / 0.26));
      g.style.opacity = String(op);
      g.setAttribute('transform', `translate(${32 - 32 * sx + dx} 0) scale(${sx} 1)`);
    };
    // The back seam sits on the far pole (longitude π): visible while the face is
    // away. Its content is centred at the origin, so translate + scaleX directly.
    const placeSeam = (g: SVGGElement | null, a: number) => {
      if (!g) return;
      const ang = Math.PI + a;
      const depth = Math.cos(ang);
      const sx = Math.max(0.04, depth);
      const dx = 5 * Math.sin(ang);
      const op = Math.max(0, Math.min(1, (depth - 0.03) / 0.3));
      g.style.opacity = String(op);
      g.setAttribute('transform', `translate(${32 + dx} 12.5) scale(${sx} 1)`);
    };

    let raf = 0;
    let start = 0;
    const tick = (ts: number) => {
      if (!start) start = ts;
      const t = Math.min(1, (ts - start) / durationMs);
      const a = 2 * Math.PI * easeInOut(t); // one full revolution
      placeFace(faceRef.current, a);
      placeSeam(seamRef.current, a);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [durationMs, variant]);

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        {/* EXACT MummySprite head gradient (not a sphere-special radial) so the
            resting head is pixel-identical to the flat one. */}
        <linearGradient id={gid} x1="0.1" y1="0" x2="0.85" y2="1">
          <stop offset="0%" stopColor={light} />
          <stop offset="50%" stopColor={base} />
          <stop offset="100%" stopColor={shade} />
        </linearGradient>
        <clipPath id={`${gid}-clip`}>
          <ellipse cx="32" cy="12.5" rx="6.4" ry="7" />
        </clipPath>
      </defs>

      {/* neck (static — the twist axis) — same as the flat head */}
      <path d="M28.5 18 L35.5 18 L35 23 L29 23 Z" fill={shade} opacity="0.7" />

      {/* skull — same ellipse, gradient, and shade as the flat head. Its round
          outline is the sphere: it never collapses while the face orbits. */}
      <ellipse cx="32" cy="12.5" rx="6.4" ry="7" fill={`url(#${gid})`} />
      <path d="M33 6 Q38.4 8 38.4 12.5 Q38.4 17 34 19 Z" fill={shade} opacity="0.45" />
      {/* static wraps — exactly the flat head's */}
      <path
        d="M26 9 Q32 11 38 9 M26.5 15.5 Q32 17.5 37.5 15.5"
        fill="none"
        stroke={band}
        strokeWidth="1.5"
        opacity="0.85"
        strokeLinecap="round"
      />

      {/* orbiting surface features, clipped to the ball so they can't spill */}
      <g clipPath={`url(#${gid}-clip)`}>
        {/* back-of-head seam on the far hemisphere */}
        <g ref={seamRef} style={{ opacity: 0 }}>
          <line x1="0" y1="-6.2" x2="0" y2="6.2" stroke={shade} strokeWidth="1.5" strokeLinecap="round" />
        </g>
        {/* the FACE — slit + eyes, EXACT flat-head coords; identity at rest */}
        <g ref={faceRef} style={{ opacity: 1 }}>
          <path d="M26 12.5 Q32 10.8 38 12.5 Q37.6 16.4 32 16.8 Q26.4 16.4 26 12.5 Z" fill="#20160c" opacity="0.92" />
          <circle cx="29.4" cy="13.3" r="1.8" fill={eye} />
          <circle cx="34.6" cy="13.3" r="1.8" fill={eye} />
          <circle cx="28.9" cy="12.8" r="0.7" fill="#fff7db" />
          <circle cx="34.1" cy="12.8" r="0.7" fill="#fff7db" />
        </g>
      </g>
    </svg>
  );
});

/**
 * Scorpion palette. One ramp per variant, darkest → lightest, so the same
 * artwork reads as the amber (white) or the red monster. Keys are shared with
 * the drawing below; nothing else in the sprite hardcodes a colour.
 */
const SCORPION_PALETTE = {
  white: {
    ink: '#0D0804',
    shadow: '#1C1008',
    speck: '#3F2209',
    legMid: '#6E3F12',
    bodyMid: '#8E5419',
    limb: '#96591C',
    legLite: '#A8641F',
    bodyLite: '#B0702A',
    hi: '#BE7C2C',
    clawMid: '#C4832F',
    plate: '#CF9040',
    clawHi: '#DDA155',
  },
  red: {
    ink: '#0F0402',
    shadow: '#1F0B07',
    speck: '#45170F',
    legMid: '#7C2E1B',
    bodyMid: '#9C3C22',
    limb: '#A54126',
    legLite: '#B94D2C',
    bodyLite: '#C15733',
    hi: '#CC6238',
    clawMid: '#D06A3D',
    plate: '#DA7A4A',
    clawHi: '#E28C5F',
  },
} as const;

/** The eight walking legs: [full jointed limb, the lit inner segment]. */
const SCORPION_LEGS: ReadonlyArray<readonly [string, string]> = [
  ['M 302 336 L 248 370 L 198 358 L 172 376', 'M 302 336 L 260 362'],
  ['M 296 306 L 232 320 L 180 298 L 152 304', 'M 296 306 L 246 316'],
  ['M 294 276 L 232 262 L 184 230 L 156 224', 'M 294 276 L 246 265'],
  ['M 298 246 L 242 214 L 204 172 L 182 154', 'M 298 246 L 254 221'],
  ['M 378 336 L 432 370 L 482 358 L 508 376', 'M 378 336 L 420 362'],
  ['M 384 306 L 448 320 L 500 298 L 528 304', 'M 384 306 L 434 316'],
  ['M 386 276 L 448 262 L 496 230 L 524 224', 'M 386 276 L 434 265'],
  ['M 382 246 L 438 214 L 476 172 L 498 154', 'M 382 246 L 426 221'],
];

/**
 * Square frame, deliberately NOT centred on the art's bounding box: the extra
 * headroom above the tail pushes the creature DOWN the tile so its body — not
 * its face — sits over the board's contact shadow. `.sprite--scorpion` in
 * Board.css raises that shadow from the biped foot line to meet the body here.
 */
const SCORPION_VIEWBOX = '68 25 545 545';

/** Speckle on the mesosoma plates — flat carved dots, not a texture. */
const SCORPION_SPECKS: ReadonlyArray<readonly [number, number]> = [
  [322, 300],
  [358, 298],
  [338, 270],
  [314, 242],
  [364, 244],
  [330, 214],
  [354, 188],
];

/**
 * Scorpion — the slower pursuer. variant 'white' (amber) or 'red'.
 * Drawn TOP-DOWN, head/pincers pointing DOWN-screen, tail curled up over the
 * back. Chunky banded plates, baked top-light, no real-time shading — the same
 * pre-render read as the rest of the cast. Carries NO baked ground shadow: the
 * board draws a separate `.sprite__shadow` beneath it.
 */
export function ScorpionSprite({
  size = 48,
  className,
  variant = 'white',
}: SpriteProps & { variant?: 'white' | 'red' }) {
  const c = SCORPION_PALETTE[variant];
  return (
    <svg
      width={size}
      height={size}
      viewBox={SCORPION_VIEWBOX}
      fill="none"
      className={className}
      aria-label={`${variant} scorpion`}
    >
      {/* ── eight walking legs: dark casing, mid limb, lit inner segment ── */}
      {SCORPION_LEGS.map(([limb, lit]) => (
        <g key={limb}>
          <path d={limb} fill="none" stroke={c.ink} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
          <path d={limb} fill="none" stroke={c.legMid} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
          <path d={lit} fill="none" stroke={c.legLite} strokeWidth="4" strokeLinecap="round" />
        </g>
      ))}

      {/* ── left pedipalp: two arm segments into a heavy pincer ── */}
      <g transform="rotate(-14 220 460)">
        <path d="M 310 342 L 272 384" fill="none" stroke={c.ink} strokeWidth="26" strokeLinecap="round" />
        <path d="M 310 342 L 272 384" fill="none" stroke={c.bodyMid} strokeWidth="19" strokeLinecap="round" />
        <path d="M 306 348 L 280 376" fill="none" stroke={c.hi} strokeWidth="7" strokeLinecap="round" />
        <path d="M 272 384 L 242 410" fill="none" stroke={c.ink} strokeWidth="28" strokeLinecap="round" />
        <path d="M 272 384 L 242 410" fill="none" stroke={c.limb} strokeWidth="21" strokeLinecap="round" />
        <path d="M 268 390 L 248 406" fill="none" stroke={c.hi} strokeWidth="7" strokeLinecap="round" />
        <path
          d="M 240 412 C 260 416 266 434 261 452 C 256 472 242 482 224 480 C 220 502 218 528 216 556 C 207 528 198 500 188 474 C 174 468 169 448 174 430 C 181 410 208 403 240 412 Z"
          fill={c.limb}
          stroke={c.ink}
          strokeWidth="2.5"
        />
        <path d="M 234 420 C 248 425 250 440 245 451 C 238 462 222 464 211 455 C 200 444 205 424 218 418 C 223 416 229 418 234 420 Z" fill={c.clawMid} />
        <path d="M 228 425 C 236 428 237 437 232 442 C 226 448 217 444 215 438 C 214 431 220 423 228 425 Z" fill={c.clawHi} />
        <path d="M 200 476 C 208 500 213 528 218 554 C 213 528 206 500 196 476 Z" fill={c.speck} opacity="0.7" />
        <path d="M 224 480 C 246 489 259 514 253 542 C 250 552 242 554 238 546 C 244 518 237 497 222 482 Z" fill={c.legMid} stroke={c.ink} strokeWidth="2.5" />
        <path d="M 229 488 C 244 500 250 518 247 536" fill="none" stroke={c.legLite} strokeWidth="4" strokeLinecap="round" />
        <path d="M 211 490 Q 222 494 231 503 M 213 508 Q 224 512 233 521" fill="none" stroke={c.ink} strokeWidth="1.6" opacity="0.6" />
      </g>

      {/* ── right pedipalp (mirrored) ── */}
      <g transform="rotate(14 460 460)">
        <path d="M 370 342 L 408 384" fill="none" stroke={c.ink} strokeWidth="26" strokeLinecap="round" />
        <path d="M 370 342 L 408 384" fill="none" stroke={c.bodyMid} strokeWidth="19" strokeLinecap="round" />
        <path d="M 374 348 L 400 376" fill="none" stroke={c.hi} strokeWidth="7" strokeLinecap="round" />
        <path d="M 408 384 L 438 410" fill="none" stroke={c.ink} strokeWidth="28" strokeLinecap="round" />
        <path d="M 408 384 L 438 410" fill="none" stroke={c.limb} strokeWidth="21" strokeLinecap="round" />
        <path d="M 412 390 L 432 406" fill="none" stroke={c.hi} strokeWidth="7" strokeLinecap="round" />
        <path
          d="M 440 412 C 420 416 414 434 419 452 C 424 472 438 482 456 480 C 460 502 462 528 464 556 C 473 528 482 500 492 474 C 506 468 511 448 506 430 C 499 410 472 403 440 412 Z"
          fill={c.limb}
          stroke={c.ink}
          strokeWidth="2.5"
        />
        <path d="M 446 420 C 432 425 430 440 435 451 C 442 462 458 464 469 455 C 480 444 475 424 462 418 C 457 416 451 418 446 420 Z" fill={c.clawMid} />
        <path d="M 452 425 C 444 428 443 437 448 442 C 454 448 463 444 465 438 C 466 431 460 423 452 425 Z" fill={c.clawHi} />
        <path d="M 480 476 C 472 500 467 528 462 554 C 467 528 474 500 484 476 Z" fill={c.speck} opacity="0.7" />
        <path d="M 456 480 C 434 489 421 514 427 542 C 430 552 438 554 442 546 C 436 518 443 497 458 482 Z" fill={c.legMid} stroke={c.ink} strokeWidth="2.5" />
        <path d="M 451 488 C 436 500 430 518 433 536" fill="none" stroke={c.legLite} strokeWidth="4" strokeLinecap="round" />
        <path d="M 469 490 Q 458 494 449 503 M 467 508 Q 456 512 447 521" fill="none" stroke={c.ink} strokeWidth="1.6" opacity="0.6" />
      </g>

      {/* ── cephalothorax: front plate, median eyes, lateral eyes, mouthparts ── */}
      <path d="M 296 386 Q 340 404 384 386 L 390 318 Q 340 300 290 318 Z" fill={c.bodyMid} stroke={c.ink} strokeWidth="2.5" />
      <path d="M 302 378 Q 340 392 378 378 L 382 330 Q 340 316 298 330 Z" fill={c.bodyLite} />
      <path d="M 296 386 Q 340 404 384 386 L 385 376 Q 340 393 295 376 Z" fill={c.shadow} />
      <ellipse cx="340" cy="352" rx="16" ry="11" fill={c.plate} />
      <circle cx="334" cy="352" r="3" fill="#080503" />
      <circle cx="346" cy="352" r="3" fill="#080503" />
      <circle cx="305" cy="332" r="1.8" fill="#080503" />
      <circle cx="311" cy="339" r="1.6" fill="#080503" />
      <circle cx="375" cy="332" r="1.8" fill="#080503" />
      <circle cx="369" cy="339" r="1.6" fill="#080503" />
      <path d="M 324 386 Q 332 376 340 376 Q 348 376 356 386 Z" fill={c.shadow} stroke={c.ink} strokeWidth="1.5" />

      {/* ── mesosoma: seven banded plates, each lit on top and shadowed at the seam ── */}
      <path d="M 290 318 Q 340 300 390 318 L 394 288 Q 340 268 286 288 Z" fill={c.bodyMid} stroke={c.ink} strokeWidth="2.5" />
      <path d="M 296 312 Q 340 296 384 312 L 386 294 Q 340 278 294 294 Z" fill={c.bodyLite} />
      <path d="M 290 318 Q 340 300 390 318 L 391 309 Q 340 291 289 309 Z" fill={c.shadow} />
      <path d="M 286 288 Q 340 268 394 288 L 396 258 Q 340 238 284 258 Z" fill={c.bodyMid} stroke={c.ink} strokeWidth="2.5" />
      <path d="M 292 282 Q 340 264 388 282 L 389 264 Q 340 248 291 264 Z" fill={c.bodyLite} />
      <path d="M 286 288 Q 340 268 394 288 L 395 279 Q 340 259 285 279 Z" fill={c.shadow} />
      <path d="M 284 258 Q 340 238 396 258 L 394 228 Q 340 210 286 228 Z" fill={c.bodyMid} stroke={c.ink} strokeWidth="2.5" />
      <path d="M 290 252 Q 340 234 390 252 L 390 234 Q 340 219 290 234 Z" fill={c.bodyLite} />
      <path d="M 284 258 Q 340 238 396 258 L 396 249 Q 340 229 283 249 Z" fill={c.shadow} />
      <path d="M 286 228 Q 340 210 394 228 L 390 198 Q 340 182 290 198 Z" fill={c.bodyMid} stroke={c.ink} strokeWidth="2.5" />
      <path d="M 292 222 Q 340 206 388 222 L 387 205 Q 340 191 293 205 Z" fill={c.bodyLite} />
      <path d="M 286 228 Q 340 210 394 228 L 394 219 Q 340 201 285 219 Z" fill={c.shadow} />
      <path d="M 290 198 Q 340 182 390 198 L 384 170 Q 340 156 296 170 Z" fill={c.bodyMid} stroke={c.ink} strokeWidth="2.5" />
      <path d="M 296 193 Q 340 179 384 193 L 382 177 Q 340 164 298 177 Z" fill={c.bodyLite} />
      <path d="M 290 198 Q 340 182 390 198 L 389 189 Q 340 173 289 189 Z" fill={c.shadow} />
      <path d="M 296 170 Q 340 156 384 170 L 374 144 Q 340 132 306 144 Z" fill={c.bodyMid} stroke={c.ink} strokeWidth="2.5" />
      <path d="M 302 165 Q 340 153 378 165 L 375 150 Q 340 139 305 150 Z" fill={c.bodyLite} />
      <path d="M 296 170 Q 340 156 384 170 L 382 161 Q 340 147 295 161 Z" fill={c.shadow} />
      <path d="M 306 144 Q 340 132 374 144 L 364 122 Q 340 114 316 122 Z" fill={c.bodyMid} stroke={c.ink} strokeWidth="2.5" />
      <path d="M 311 140 Q 340 130 369 140 L 366 127 Q 340 119 314 127 Z" fill={c.bodyLite} />
      <path d="M 306 144 Q 340 132 374 144 L 372 136 Q 340 124 305 136 Z" fill={c.shadow} />

      {SCORPION_SPECKS.map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.5" fill={c.speck} opacity="0.7" />
      ))}

      {/* ── metasoma: the tail arcing up over the back, five beads to the telson ── */}
      <path
        d="M 340 120 Q 374 96 410 96 Q 448 100 462 134 Q 472 164 468 200 L 462 232"
        fill="none"
        stroke={c.ink}
        strokeWidth="7"
        opacity="0.45"
        strokeLinecap="round"
      />
      <g transform="rotate(-28 370 110)">
        <ellipse cx="370" cy="110" rx="25" ry="19" fill={c.limb} stroke={c.ink} strokeWidth="2.5" />
        <ellipse cx="368" cy="105" rx="16" ry="10" fill={c.hi} />
        <path d="M 348 116 Q 370 126 392 116 L 392 110 Q 370 120 348 110 Z" fill={c.shadow} />
      </g>
      <g transform="rotate(-4 410 104)">
        <ellipse cx="410" cy="104" rx="24" ry="18" fill={c.limb} stroke={c.ink} strokeWidth="2.5" />
        <ellipse cx="409" cy="99" rx="15" ry="9" fill={c.hi} />
        <path d="M 389 110 Q 410 120 431 110 L 431 104 Q 410 114 389 104 Z" fill={c.shadow} />
      </g>
      <g transform="rotate(28 444 124)">
        <ellipse cx="444" cy="124" rx="22" ry="17" fill={c.limb} stroke={c.ink} strokeWidth="2.5" />
        <ellipse cx="443" cy="119" rx="14" ry="8" fill={c.hi} />
        <path d="M 426 130 Q 444 139 462 130 L 462 124 Q 444 133 426 124 Z" fill={c.shadow} />
      </g>
      <g transform="rotate(58 462 160)">
        <ellipse cx="462" cy="160" rx="21" ry="16" fill={c.limb} stroke={c.ink} strokeWidth="2.5" />
        <ellipse cx="461" cy="155" rx="13" ry="8" fill={c.hi} />
        <path d="M 445 166 Q 462 174 479 166 L 479 160 Q 462 168 445 160 Z" fill={c.shadow} />
      </g>
      <g transform="rotate(80 468 196)">
        <ellipse cx="468" cy="196" rx="20" ry="15" fill={c.limb} stroke={c.ink} strokeWidth="2.5" />
        <ellipse cx="467" cy="191" rx="12" ry="7" fill={c.hi} />
        <path d="M 452 202 Q 468 209 484 202 L 484 196 Q 468 203 452 196 Z" fill={c.shadow} />
      </g>

      {/* ── telson + the barb hooking forward over the body ── */}
      <path d="M 462 230 C 476 244 476 264 460 274 C 444 282 428 272 426 256 C 424 240 438 226 452 226 Z" fill={c.legLite} stroke={c.ink} strokeWidth="2.5" />
      <ellipse cx="450" cy="243" rx="10" ry="7" fill={c.plate} />
      <path d="M 428 268 C 414 284 400 298 384 310 C 396 294 410 278 422 262 Z" fill={c.shadow} stroke={c.ink} strokeWidth="1.5" />
    </svg>
  );
}

/** Convenience: pick the right sprite for a monster kind. */
export const MonsterSprite = memo(function MonsterSprite({
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
});
