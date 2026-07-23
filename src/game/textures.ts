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
 * the "software-rendered, upscaled" softness), a broad low-frequency blotch (the
 * uneven staining of old stone) and a finer grain (the compression fuzz).
 *
 * DELIBERATELY NO CRACKS, NO LINEWORK, NO SHAPES OF ANY KIND. This texture tiles
 * once per CELL, so anything with a legible silhouette becomes the same glyph
 * stamped on every square of the board — it reads as a printed rune, not as
 * weathering, and lowering the alpha only makes it a faint rune. Per-cell texture
 * carries formless noise only; all crack-like detail lives in the board-scale
 * `crackSheet`, which tiles at several cells so its fractures cross tile
 * boundaries and read as damage to one continuous slab.
 */
function sandstoneTile(base: string, darken: number, lighten: number, seed: number): string {
  // Gentle mottle: mostly transparent, with occasional darker/lighter flecks, so
  // the base sand stays LIGHT and the checker contrast survives the texture.
  const dark = speckleLayer('d', '0.05 0.055', 3, seed, { r: 0.32, g: 0.24, b: 0.13 }, 0.42, -0.26 + darken);
  // Broad, soft staining — very low frequency, so it never resolves into a shape;
  // this is what keeps a tile from reading as pristine now the cracks are gone.
  const stain = speckleLayer('s', '0.012 0.014', 2, seed + 120, { r: 0.3, g: 0.22, b: 0.11 }, 0.24, -0.3);
  const grain = speckleLayer('g', '0.22 0.22', 2, seed + 40, { r: 0.28, g: 0.21, b: 0.11 }, 0.4, -0.42);
  // Light flecks kept weak so they don't lift the dark checker tiles toward the
  // light ones (that washout made the two-tone board read as flat sand).
  const light = speckleLayer('l', '0.05 0.06', 3, seed + 80, { r: 1, g: 0.98, b: 0.9 }, 0.3, -0.34 - lighten);

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="${TILE}" viewBox="0 0 ${TILE} ${TILE}">
      <defs>${dark.filter}${stain.filter}${grain.filter}${light.filter}</defs>
      <rect width="${TILE}" height="${TILE}" fill="${base}"/>
      ${light.rect}
      ${stain.rect}
      ${dark.rect}
      ${grain.rect}
    </svg>`;
}

/** Tiny deterministic PRNG so the crack sheet is stable across builds. */
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

/** Edge, in px, of the board-scale crack sheet. Much larger than one cell. */
export const CRACK_TILE = 512;

/**
 * A board-scale sheet of cracks. It tiles at several cells across, so the
 * fractures CROSS cell boundaries and read as damage to one continuous stone
 * slab instead of per-tile decoration. Long branching trunks are warped by a
 * turbulence displacement so the lines wander like real fractures, and every
 * crack is kept clear of the sheet edge so the repeat has no hard seam.
 */
function crackSheet(seed: number, trunks: number): string {
  const rng = mulberry((seed * 2246822519) >>> 0);
  const M = 48; // keep-clear margin from the sheet edge
  const span = CRACK_TILE - M * 2;
  const paths: string[] = [];

  for (let t = 0; t < trunks; t++) {
    let x = M + rng() * span;
    let y = M + rng() * span;
    let ang = rng() * Math.PI * 2;
    const pts: Array<[number, number]> = [[x, y]];
    const segs = 5 + Math.floor(rng() * 4);
    for (let s = 0; s < segs; s++) {
      ang += (rng() - 0.5) * 0.9;
      const len = 26 + rng() * 40;
      x = Math.min(CRACK_TILE - M, Math.max(M, x + Math.cos(ang) * len));
      y = Math.min(CRACK_TILE - M, Math.max(M, y + Math.sin(ang) * len));
      pts.push([x, y]);
    }
    paths.push(pts.map(([px, py], i) => `${i ? 'L' : 'M'} ${px.toFixed(1)} ${py.toFixed(1)}`).join(' '));

    // One or two short branches off a mid joint.
    const branches = 1 + Math.floor(rng() * 2);
    for (let b = 0; b < branches; b++) {
      const [bx0, by0] = pts[1 + Math.floor(rng() * (pts.length - 2))];
      let bx = bx0;
      let by = by0;
      let bang = ang + (rng() - 0.5) * 2.4;
      const bpts: Array<[number, number]> = [[bx, by]];
      for (let s = 0; s < 2 + Math.floor(rng() * 2); s++) {
        bang += (rng() - 0.5) * 0.8;
        const len = 16 + rng() * 24;
        bx = Math.min(CRACK_TILE - M, Math.max(M, bx + Math.cos(bang) * len));
        by = Math.min(CRACK_TILE - M, Math.max(M, by + Math.sin(bang) * len));
        bpts.push([bx, by]);
      }
      paths.push(bpts.map(([px, py], i) => `${i ? 'L' : 'M'} ${px.toFixed(1)} ${py.toFixed(1)}`).join(' '));
    }
  }

  // Fine hairline chips between the trunks. They live HERE rather than in the
  // per-cell tile because this sheet spans several cells, so they scatter over
  // the board instead of repeating identically inside every square.
  const chips = Math.round(trunks * 1.1);
  for (let c = 0; c < chips; c++) {
    let x = M + rng() * span;
    let y = M + rng() * span;
    let ang = rng() * Math.PI * 2;
    const pts: Array<[number, number]> = [[x, y]];
    for (let s = 0; s < 2; s++) {
      ang += (rng() - 0.5) * 1.1;
      const len = 9 + rng() * 16;
      x = Math.min(CRACK_TILE - M, Math.max(M, x + Math.cos(ang) * len));
      y = Math.min(CRACK_TILE - M, Math.max(M, y + Math.sin(ang) * len));
      pts.push([x, y]);
    }
    paths.push(pts.map(([px, py], i) => `${i ? 'L' : 'M'} ${px.toFixed(1)} ${py.toFixed(1)}`).join(' '));
  }

  const strokes = paths
    .map(
      (d, i) => {
        // Vary the weight per path so the field never reads as one uniform mesh.
        const w = 0.9 + ((i * 37) % 11) / 12;
        return (
          `<path d="${d}" fill="none" stroke="rgba(240,226,192,0.16)" stroke-width="${w.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" transform="translate(-1,-1)"/>` +
          `<path d="${d}" fill="none" stroke="rgba(48,32,12,0.38)" stroke-width="${(w + 0.1).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>`
        );
      },
    )
    .join('');

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${CRACK_TILE}" height="${CRACK_TILE}" viewBox="0 0 ${CRACK_TILE} ${CRACK_TILE}">
      <defs>
        <filter id="warp" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.014" numOctaves="3"
            seed="${seed}" stitchTiles="stitch" result="n"/>
          <feDisplacementMap in="SourceGraphic" in2="n" scale="16"
            xChannelSelector="R" yChannelSelector="G"/>
        </filter>
      </defs>
      <g filter="url(#warp)">${strokes}</g>
    </svg>`;
}

/**
 * All board textures as CSS `url(...)` strings, keyed for use as CSS custom
 * properties. Floor A/B are the light/dark checker; wallTop is the lit sandstone
 * cap of a wall block; grain is the unifying film; cracks is the board-scale
 * fracture sheet laid over the whole floor.
 */
export const boardTextures = {
  floorA: encode(sandstoneTile('#c8b189', 0.0, 0.02, 7)),
  // B is the SAME sandstone family, clearly darker and nudged toward olive so the
  // checker is readable at a glance — without tipping into grey dirt. Its base is
  // pushed below the nominal target because the mottle/light-fleck layers lift a
  // dark tile several points; measured on-screen the pair lands near the intended
  // #C4AE86 / #9C8560 with a ~25% luminance gap.
  floorB: encode(sandstoneTile('#8f7a55', 0.04, 0.05, 19)),
  wallTop: encode(sandstoneTile('#ccb184', -0.02, 0.04, 31)),
  grain: encode(grainOverlay()),
  // Board-scale fractures, tiled far larger than a cell so they cross tiles.
  // This sheet carries ALL of the floor's crack detail on its own.
  cracks: encode(crackSheet(23, 9)),
  // Dark, richer carved sandstone for the ornate cabinet frame around the board.
  frameStone: encode(sandstoneTile('#4a3820', 0.04, 0.02, 53)),
} as const;
