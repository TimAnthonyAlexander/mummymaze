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

/** Scorpion — the slower pursuer. variant 'white' or 'red'. Drawn TOP-DOWN. */
export function ScorpionSprite({
  size = 48,
  className,
  variant = 'white',
}: SpriteProps & { variant?: 'white' | 'red' }) {
  const isRed = variant === 'red';
  const base = isRed ? '#b04e34' : '#b28c46';
  const light = isRed ? '#c86e51' : '#cba766';
  const shade = isRed ? '#742e1d' : '#7c5f2c';
  const dark = isRed ? '#4a241a' : '#4a3a1e';
  const gid = `scorp-body-${variant}`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-label={`${variant} scorpion`}>
      <defs>
        <linearGradient id={gid} x1="0.15" y1="0.1" x2="0.85" y2="0.9">
          <stop offset="0%" stopColor={light} />
          <stop offset="52%" stopColor={base} />
          <stop offset="100%" stopColor={shade} />
        </linearGradient>
      </defs>

      {/* ── eight walking legs, jointed, splayed to the sides ── */}
      <g stroke={dark} strokeWidth="1.8" strokeLinecap="round" fill="none">
        <path d="M27 38 Q19 34 14 37 M27 42 Q18 41 13 45 M28 46 Q19 47 15 52 M29 50 Q22 53 18 58" />
        <path d="M37 38 Q45 34 50 37 M37 42 Q46 41 51 45 M36 46 Q45 47 49 52 M35 50 Q42 53 46 58" />
      </g>

      {/* ── abdomen (rear, up) then carapace (front, down) ── */}
      <path d="M32 24 Q41 26 41 34 Q41 43 32 46 Q23 43 23 34 Q23 26 32 24 Z" fill={`url(#${gid})`} />
      <ellipse cx="32" cy="47" rx="8" ry="6.2" fill={`url(#${gid})`} />
      {/* segment ridges + a lit top-left sheen */}
      <g stroke={shade} strokeWidth="1.3" fill="none" strokeLinecap="round" opacity="0.7">
        <path d="M24 30 Q32 33 40 30 M24 35 Q32 38 40 35 M25 40 Q32 43 39 40" />
      </g>
      <path d="M27 27 Q24 31 25 37" stroke={light} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.8" />

      {/* ── pedipalp claws reaching forward toward the prey ── */}
      <g>
        <path d="M28 49 L23 55" stroke={base} strokeWidth="3.2" strokeLinecap="round" />
        <path d="M22 52 Q17 54 17 59 Q17 62 20 61 Q19 58 22 57 Q20 55 24 55 Q22 53 22 52 Z" fill={base} stroke={dark} strokeWidth="0.9" strokeLinejoin="round" />
        <path d="M36 49 L41 55" stroke={shade} strokeWidth="3.2" strokeLinecap="round" />
        <path d="M42 52 Q47 54 47 59 Q47 62 44 61 Q45 58 42 57 Q44 55 40 55 Q42 53 42 52 Z" fill={shade} stroke={dark} strokeWidth="0.9" strokeLinejoin="round" />
      </g>

      {/* ── tail (metasoma) arcing up and curling over the back to the stinger ── */}
      <path d="M32 26 Q26 16 32 11 Q40 7 44 14" fill="none" stroke={base} strokeWidth="5" strokeLinecap="round" />
      <path d="M44 14 Q47 18 43 22" fill="none" stroke={shade} strokeWidth="4" strokeLinecap="round" />
      <g stroke={dark} strokeWidth="0.9" opacity="0.6" strokeLinecap="round">
        <path d="M29 21 L34 20 M28 15 L33 15 M34 11 L37 13 M41 11 L44 13" />
      </g>
      <path d="M43 22 Q47 24 45 28 L40 24 Z" fill={shade} stroke={dark} strokeWidth="0.9" strokeLinejoin="round" />

      {/* ── two eyes on the carapace ── */}
      <circle cx="30" cy="46" r="1.3" fill="#22160b" />
      <circle cx="34" cy="46" r="1.3" fill="#22160b" />
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
