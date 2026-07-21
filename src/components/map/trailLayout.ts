/**
 * Pure geometry for the world-map "expedition trail".
 *
 * Pyramids are placed in a boustrophedon (ox-turning) layout that RISES upward:
 * the first row runs left→right along the bottom, the next runs right→left just
 * above it, and so on — a Z/serpentine path climbing the screen. Each row is
 * given a slight upward tilt along the direction of travel so the trail reads as
 * an organic hand-drawn route rather than a rigid grid.
 *
 * No React, no DOM — this is a pure function of numbers so it can be unit tested
 * and reused. The consumer positions pyramid nodes at each anchor and strokes
 * {@link TrailLayout.path} behind them.
 */

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface TrailNode extends Point {
  /** 0-based index in play order (pyramid 1 = 0). */
  readonly index: number;
  /** Row from the bottom (0 = bottom row). */
  readonly row: number;
  /** Visual column, 0 = leftmost on screen. */
  readonly col: number;
}

export interface TrailLayout {
  readonly nodes: readonly TrailNode[];
  readonly width: number;
  readonly height: number;
  /** SVG path `d` threading every anchor in play order, smoothed. */
  readonly path: string;
}

export interface TrailLayoutOpts {
  /** How many pyramids to place. */
  readonly count: number;
  /** Pyramids per row before the trail turns back. */
  readonly perRow: number;
  /** Horizontal distance between adjacent node centers. */
  readonly cellW: number;
  /** Vertical distance between rows. */
  readonly rowH: number;
  /** Horizontal inset from the container edges to the first/last node center. */
  readonly marginX: number;
  /** Space reserved above the top row for its pyramid shapes (+ marker). */
  readonly marginTop: number;
  /** Space reserved below the bottom row for its labels. */
  readonly marginBottom: number;
  /** Per-step upward tilt within a row (px). Keep small for a subtle slope. */
  readonly tilt: number;
}

/** Visual column of the k-th node within a row, honoring the row's direction. */
function visualCol(k: number, row: number, perRow: number): number {
  // Even rows run left→right, odd rows right→left (the boustrophedon turn).
  return row % 2 === 0 ? k : perRow - 1 - k;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Compute node anchors (the base-center of each pyramid) and the container size.
 * Row 0 sits at the bottom; rows climb upward as the play order advances.
 */
export function computeNodes(opts: TrailLayoutOpts): {
  nodes: TrailNode[];
  width: number;
  height: number;
} {
  const { count, perRow, cellW, rowH, marginX, marginTop, marginBottom, tilt } = opts;
  const rows = Math.max(1, Math.ceil(count / perRow));
  const width = round(marginX * 2 + perRow * cellW);
  const height = round(marginTop + (rows - 1) * rowH + marginBottom);

  const nodes: TrailNode[] = [];
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / perRow);
    const k = i % perRow;
    const col = visualCol(k, row, perRow);
    const x = marginX + cellW * (col + 0.5);
    // Row 0 at the bottom; each higher row sits `rowH` up. Within a row, each
    // successive step in play order lifts slightly for an organic climb.
    const y = marginTop + (rows - 1 - row) * rowH - k * tilt;
    nodes.push({ index: i, row, col, x: round(x), y: round(y) });
  }
  return { nodes, width, height };
}

/**
 * Smooth a polyline through `points` into an SVG cubic path using a uniform
 * Catmull-Rom spline (endpoints duplicated). Produces the gently curving,
 * looping-at-the-turns route that connects one pyramid to the next.
 */
export function smoothPath(points: readonly Point[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${round(points[0].x)} ${round(points[0].y)}`;

  let d = `M ${round(points[0].x)} ${round(points[0].y)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? points[i + 1];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${round(c1x)} ${round(c1y)}, ${round(c2x)} ${round(c2y)}, ${round(p2.x)} ${round(p2.y)}`;
  }
  return d;
}

/** Full layout: node anchors, container size, and the smoothed trail path. */
export function computeTrailLayout(opts: TrailLayoutOpts): TrailLayout {
  const { nodes, width, height } = computeNodes(opts);
  const path = smoothPath(nodes);
  return { nodes, width, height, path };
}
