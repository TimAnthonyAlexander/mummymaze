/**
 * Ornate Egyptian frame art for the "cabinet" border around the play field.
 *
 * All hand-authored, tileable SVG returned as CSS `url("data:...")` strings:
 *   - `glyphBand`  — a horizontal hieroglyph frieze (ankh, sun disc, seated
 *                    pharaoh, eye of horus) that repeats along the top/bottom.
 *   - `braid`      — a vertical twisted-rope band that repeats down the sides.
 *   - `rosette`    — a corner sun-disc medallion.
 *
 * Carved-relief look: each motif is a light sandstone fill with a dark engraved
 * edge, so it reads as chiselled into the darker frame stone. Original artwork.
 */

function encode(svg: string): string {
  const clean = svg.replace(/\n\s*/g, ' ').trim();
  return `url("data:image/svg+xml,${encodeURIComponent(clean)}")`;
}

// Carved tones: raised face, engraved shadow, and the register lines that box a
// real Egyptian frieze top and bottom.
const FACE = '#d8c08a';
const FACE_SH = '#a3854e';
const ENGRAVE = '#4b3617';
const LINE = '#c8ac74';

/** One horizontal repeat of the glyph frieze (four glyphs across 200×44). */
function glyphBand(): string {
  // Each glyph is drawn in a 50-wide cell, vertically centred around y=22.
  const ankh = `
    <g transform="translate(25 22)" stroke="${ENGRAVE}" stroke-width="1.1">
      <path d="M0 -12 a5 6 0 1 1 -0.1 0 Z" fill="${FACE}"/>
      <rect x="-1.6" y="-2" width="3.2" height="15" fill="${FACE}"/>
      <rect x="-8" y="-1" width="16" height="3" fill="${FACE}"/>
    </g>`;
  const disc = `
    <g transform="translate(75 22)" stroke="${ENGRAVE}" stroke-width="1.1">
      <circle cx="0" cy="-2" r="8" fill="${FACE}"/>
      <circle cx="0" cy="-2" r="3.4" fill="${FACE_SH}" stroke="none"/>
      <path d="M-13 8 Q0 2 13 8" fill="none" stroke="${FACE}" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M-11 11 Q0 6 11 11" fill="none" stroke="${FACE_SH}" stroke-width="1.8" stroke-linecap="round"/>
    </g>`;
  const seated = `
    <g transform="translate(125 22)" stroke="${ENGRAVE}" stroke-width="1.1" fill="${FACE}">
      <circle cx="0" cy="-11" r="4"/>
      <path d="M-1 -13 l-6 -2 l0 3 l5 1 Z"/>
      <path d="M-3 -7 L-3 4 L7 4 L7 1 L2 1 L2 -7 Z"/>
      <rect x="-8" y="4" width="16" height="3.5"/>
      <path d="M2 -5 L10 -8 L11 -5 L3 -2 Z"/>
    </g>`;
  const eye = `
    <g transform="translate(175 22)" stroke="${ENGRAVE}" stroke-width="1.1" fill="none">
      <path d="M-13 -2 Q0 -12 13 -4 Q0 6 -13 -2 Z" fill="${FACE}"/>
      <circle cx="1" cy="-3" r="3" fill="${ENGRAVE}" stroke="none"/>
      <path d="M-13 -2 Q-15 4 -11 8" stroke="${FACE}" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M4 3 L2 11" stroke="${FACE}" stroke-width="2.6" stroke-linecap="round"/>
    </g>`;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="44" viewBox="0 0 200 44">
      <rect x="0" y="3" width="200" height="2" fill="${LINE}"/>
      <rect x="0" y="39" width="200" height="2" fill="${LINE}"/>
      ${ankh}${disc}${seated}${eye}
    </svg>`;
}

/** One vertical repeat of a twisted-rope braid (44×48). */
function braid(): string {
  // Two interleaving strands read as a twist; a light face over a dark engrave.
  const strand = (dir: 1 | -1, fill: string, w: number) => {
    const x1 = 22 - dir * 12;
    const x2 = 22 + dir * 12;
    return `<path d="M${x1} 0 Q22 12 ${x2} 24 Q22 36 ${x1} 48"
      fill="none" stroke="${fill}" stroke-width="${w}" stroke-linecap="round"/>`;
  };
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="44" height="48" viewBox="0 0 44 48">
      <rect x="4" y="0" width="2" height="48" fill="${LINE}"/>
      <rect x="38" y="0" width="2" height="48" fill="${LINE}"/>
      ${strand(1, ENGRAVE, 11)}
      ${strand(-1, ENGRAVE, 11)}
      ${strand(1, FACE, 7)}
      ${strand(-1, FACE_SH, 7)}
    </svg>`;
}

/** A corner sun-disc rosette (48×48). */
function rosette(): string {
  const rays: string[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const x1 = 24 + Math.cos(a) * 11;
    const y1 = 24 + Math.sin(a) * 11;
    const x2 = 24 + Math.cos(a) * 19;
    const y2 = 24 + Math.sin(a) * 19;
    rays.push(
      `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${FACE}" stroke-width="2.2" stroke-linecap="round"/>`,
    );
  }
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
      ${rays.join('')}
      <circle cx="24" cy="24" r="11" fill="${FACE}" stroke="${ENGRAVE}" stroke-width="1.4"/>
      <circle cx="24" cy="24" r="5" fill="${FACE_SH}" stroke="${ENGRAVE}" stroke-width="1"/>
    </svg>`;
}

export const frameArt = {
  glyphBand: encode(glyphBand()),
  braid: encode(braid()),
  rosette: encode(rosette()),
} as const;
