import * as THREE from 'three';

/**
 * Procedural bandage textures. Bright bone-white (or dusty red) base with SHORT,
 * irregular, mostly-parallel gray stripes — deliberately NOT full-width seam
 * lines (those wrapped each limb and read as concentric "toilet paper"). The two
 * variants are a pure palette swap.
 *
 * The HEAD gets its own texture: the same bandages plus a PAINTED face (dark eye
 * band + two gold eyes). Painting it into the texture makes the eyes perfectly
 * flush with the sphere — no protruding geometry — and they still rotate with the
 * head because they live on its surface. The face is centred at the sphere's
 * front: three.js SphereGeometry maps +Z (front) to u=0.25, the equator to
 * v=0.5, so we draw the face at (0.25·S, 0.5·S).
 */
export type Variant = 'white' | 'red';

interface Palette {
  base: string;
  baseHi: string;
  line: string; // the dark crease line between overlapping wraps
  edge: string; // the lit lifted edge just above a crease
  fleck: string;
  speck: string;
  eyeDark: string; // the eye-band shadow
}

const PALETTES: Record<Variant, Palette> = {
  white: {
    base: '#efe8d3',
    baseHi: '#f8f3e6',
    line: '#2b2315',
    edge: '#fcf8ee',
    fleck: '#fdf8ec',
    speck: '#b9ad8d',
    eyeDark: '#160f07',
  },
  red: {
    base: '#c66a4b',
    baseHi: '#d9855f',
    line: '#20110a',
    edge: '#e8a17c',
    fleck: '#e0956f',
    speck: '#7f4028',
    eyeDark: '#120804',
  },
};

// Deterministic PRNG so textures are identical every build (stable bakes).
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dash(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y: number,
  len: number,
  thick: number,
  color: string,
  alpha: number,
  rnd: () => number,
) {
  ctx.strokeStyle = color;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = thick;
  ctx.lineCap = 'round';
  ctx.beginPath();
  const segs = 4;
  ctx.moveTo(x0, y);
  for (let s = 1; s <= segs; s++) {
    ctx.lineTo(x0 + (len / segs) * s, y + (rnd() - 0.5) * (thick * 0.6));
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/** Draw the bandage field onto a canvas context (shared by body + head). */
function drawBandage(ctx: CanvasRenderingContext2D, S: number, p: Palette, rnd: () => number) {
  ctx.fillStyle = p.base;
  ctx.fillRect(0, 0, S, S);

  for (let i = 0; i < 26; i++) {
    ctx.fillStyle = rnd() > 0.5 ? p.baseHi : p.speck;
    ctx.globalAlpha = 0.06 + rnd() * 0.06;
    ctx.beginPath();
    ctx.arc(rnd() * S, rnd() * S, 20 + rnd() * 40, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // wrapped bandage strips: each row is a DARK crease line (the overlap between
  // two strips) with a faint LIT edge just above it, so the wraps read as
  // layered cloth. Short + irregular so nothing rings the limb.
  let y = 5 + rnd() * 6;
  while (y < S) {
    const count = 1 + Math.floor(rnd() * 3);
    for (let d = 0; d < count; d++) {
      const len = S * (0.16 + rnd() * 0.4);
      const x0 = rnd() * (S - len * 0.5) - len * 0.15;
      const wobble = (rnd() - 0.5) * 3;
      const thick = 1.1 + rnd() * 1.7;
      // lit lifted edge just above the crease
      dash(ctx, x0 + rnd() * 4, y - thick + wobble, len * 0.92, thick * 0.8, p.edge, 0.16 + rnd() * 0.16, rnd);
      // the dark crease line itself
      dash(ctx, x0, y + wobble, len, thick, p.line, 0.34 + rnd() * 0.28, rnd);
    }
    y += 5 + rnd() * 9;
  }

  for (let i = 0; i < 900; i++) {
    const bright = rnd() > 0.5;
    ctx.fillStyle = bright ? p.fleck : p.speck;
    ctx.globalAlpha = 0.05 + rnd() * 0.1;
    ctx.beginPath();
    ctx.arc(rnd() * S, rnd() * S, 0.5 + rnd() * 1.1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Paint the face (flush) at the sphere's front: u=0.25, v=0.5. Just a wide dark
 *  eye band — no eyes. */
function drawFace(ctx: CanvasRenderingContext2D, S: number, p: Palette) {
  const cx = 0.25 * S;
  const cy = 0.5 * S;
  const bandRx = S * 0.115; // a bit wider
  const bandRy = S * 0.038;

  ctx.fillStyle = p.eyeDark;
  ctx.globalAlpha = 0.96;
  ctx.beginPath();
  ctx.ellipse(cx, cy, bandRx, bandRy, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function finish(cv: HTMLCanvasElement): THREE.Texture {
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function makeBandageTexture(variant: Variant): THREE.Texture {
  const p = PALETTES[variant];
  const S = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const ctx = cv.getContext('2d')!;
  drawBandage(ctx, S, p, mulberry32(variant === 'white' ? 1337 : 4242));
  return finish(cv);
}

export function makeHeadTexture(variant: Variant): THREE.Texture {
  const p = PALETTES[variant];
  const S = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const ctx = cv.getContext('2d')!;
  drawBandage(ctx, S, p, mulberry32(variant === 'white' ? 91 : 92));
  drawFace(ctx, S, p);
  return finish(cv);
}
