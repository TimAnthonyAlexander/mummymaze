/**
 * Procedural, self-contained stone/sand textures for the 2002 pre-rendered look.
 *
 * Each texture is an SVG built from `feTurbulence` fractal noise (baked into the
 * diffuse — no real-time lighting), then tinted to a muddy sandstone tone. The
 * noise is generated with `stitchTiles="stitch"` so the tile repeats seamlessly,
 * and the tiles are deliberately SMALL (see `TILE`) so the repeat is faintly
 * visible when stretched over the board — the biggest early-2000s tell.
 *
 * Everything returns a ready-to-use `url("data:image/svg+xml,...")` string so it
 * can be dropped straight into a CSS `background-image` (via a CSS custom prop set
 * on the board). No external files, no network, fully original.
 */

/** Tile edge, in px, of every generated texture. Small = visibly repeating. */
export const TILE = 128;

function encode(svg: string): string {
  // Collapse whitespace to keep the data URI compact, then percent-encode.
  const clean = svg.replace(/\n\s*/g, ' ').trim();
  return `url("data:image/svg+xml,${encodeURIComponent(clean)}")`;
}

/**
 * A turbulence layer that paints a single flat colour whose ALPHA is driven by
 * the fractal noise luminance — i.e. a semi-transparent speckle of `color`. Two
 * of these (a dark one and a light one, different seeds) stacked over a base fill
 * read as mottled, weathered stone.
 */
function speckleLayer(
  id: string,
  baseFreq: string,
  octaves: number,
  seed: number,
  color: { r: number; g: number; b: number },
  alphaGain: number,
  alphaBias: number,
): { filter: string; rect: string } {
  const { r, g, b } = color;
  const filter = `
    <filter id="${id}" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="${baseFreq}"
        numOctaves="${octaves}" seed="${seed}" stitchTiles="stitch" result="n"/>
      <feColorMatrix in="n" type="matrix" values="
        0 0 0 0 ${r}
        0 0 0 0 ${g}
        0 0 0 0 ${b}
        ${alphaGain} ${alphaGain} ${alphaGain} 0 ${alphaBias}"/>
    </filter>`;
  const rect = `<rect width="${TILE}" height="${TILE}" filter="url(#${id})"/>`;
  return { filter, rect };
}

/**
 * A weathered sandstone tile: a base colour, a coarse mottle (large soft blobs =
 * the "software-rendered, upscaled" softness) and a finer grain (the compression
 * fuzz), plus a faint scatter of hairline cracks.
 */
function sandstoneTile(
  base: string,
  darken: number,
  lighten: number,
  seed: number,
  cracks = 2,
): string {
  // Gentle mottle: mostly transparent, with occasional darker/lighter flecks, so
  // the base sand stays LIGHT and the checker contrast survives the texture.
  const dark = speckleLayer('d', '0.05 0.055', 3, seed, { r: 0.32, g: 0.24, b: 0.13 }, 0.42, -0.26 + darken);
  const grain = speckleLayer('g', '0.22 0.22', 2, seed + 40, { r: 0.28, g: 0.21, b: 0.11 }, 0.4, -0.42);
  // Light flecks kept weak so they don't lift the dark checker tiles toward the
  // light ones (that washout made the two-tone board read as flat sand).
  const light = speckleLayer('l', '0.05 0.06', 3, seed + 80, { r: 1, g: 0.98, b: 0.9 }, 0.3, -0.34 - lighten);

  // A couple of short painted hairline cracks, deterministic per seed.
  const rng = mulberry((seed * 2654435761) >>> 0);
  const crackPaths: string[] = [];
  for (let i = 0; i < cracks; i++) {
    let x = 20 + rng() * (TILE - 40);
    let y = 20 + rng() * (TILE - 40);
    let d = `M ${x.toFixed(1)} ${y.toFixed(1)}`;
    const segs = 2 + Math.floor(rng() * 2);
    for (let s = 0; s < segs; s++) {
      x += (rng() - 0.5) * 22;
      y += (rng() - 0.5) * 22;
      d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    crackPaths.push(
      `<path d="${d}" fill="none" stroke="rgba(70,50,24,0.22)" stroke-width="${(0.5 + rng() * 0.5).toFixed(2)}" stroke-linecap="round"/>`,
    );
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="${TILE}" viewBox="0 0 ${TILE} ${TILE}">
      <defs>${dark.filter}${grain.filter}${light.filter}</defs>
      <rect width="${TILE}" height="${TILE}" fill="${base}"/>
      ${light.rect}
      ${dark.rect}
      ${grain.rect}
      ${crackPaths.join('')}
    </svg>`;
}

/** Tiny deterministic PRNG so cracks are stable across builds. */
function mulberry(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A soft, tileable grain overlay in transparent black/white — laid over the whole
 * board at low opacity to unify everything under one film of "compression fuzz".
 */
function grainOverlay(): string {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="${TILE}" viewBox="0 0 ${TILE} ${TILE}">
      <defs>
        <filter id="grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2"
            seed="11" stitchTiles="stitch" result="n"/>
          <feColorMatrix in="n" type="matrix" values="
            0 0 0 0 0
            0 0 0 0 0
            0 0 0 0 0
            0.5 0.5 0.5 0 -0.5"/>
        </filter>
      </defs>
      <rect width="${TILE}" height="${TILE}" filter="url(#grain)"/>
    </svg>`;
}

/**
 * All board textures as CSS `url(...)` strings, keyed for use as CSS custom
 * properties. Floor A/B are the light/dark checker; wallTop is the lit sandstone
 * cap of a wall block; grain is the unifying film.
 */
export const boardTextures = {
  floorA: encode(sandstoneTile('#d2b781', 0.0, 0.0, 7, 2)),
  // B is the SAME sandstone, only a gentle shade darker — a soft two-tone, not a
  // muddy contrasting tile.
  floorB: encode(sandstoneTile('#c3a870', 0.0, 0.0, 19, 2)),
  wallTop: encode(sandstoneTile('#ccb184', -0.02, 0.04, 31, 2)),
  grain: encode(grainOverlay()),
} as const;
