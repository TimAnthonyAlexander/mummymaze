import { describe, expect, it } from 'vitest';
import { computeNodes, computeTrailLayout, smoothPath } from '../trailLayout';

const OPTS = {
  count: 17,
  perRow: 4,
  cellW: 200,
  rowH: 220,
  marginX: 0,
  marginTop: 180,
  marginBottom: 60,
  tilt: 8,
} as const;

describe('computeNodes', () => {
  it('places one node per pyramid', () => {
    const { nodes } = computeNodes(OPTS);
    expect(nodes).toHaveLength(17);
    expect(nodes.map((n) => n.index)).toEqual([...Array(17).keys()]);
  });

  it('runs the bottom row left→right and the next right→left (boustrophedon)', () => {
    const { nodes } = computeNodes(OPTS);
    // Row 0: play order 0..3 with rising x (left→right).
    const row0 = nodes.slice(0, 4).map((n) => n.x);
    expect(row0).toEqual([...row0].sort((a, b) => a - b));
    // Row 1: play order 4..7 with falling x (right→left).
    const row1 = nodes.slice(4, 8).map((n) => n.x);
    expect(row1).toEqual([...row1].sort((a, b) => b - a));
  });

  it('rises upward: later rows sit above earlier ones', () => {
    const { nodes } = computeNodes(OPTS);
    const bottomRowY = nodes[0].y; // row 0
    const nextRowY = nodes[4].y; // row 1
    expect(nextRowY).toBeLessThan(bottomRowY);
  });

  it('turns back at the same edge so the trail is continuous', () => {
    const { nodes } = computeNodes(OPTS);
    // Last node of row 0 (index 3) and first of row 1 (index 4) share a column.
    expect(nodes[3].col).toBe(nodes[4].col);
  });

  it('reserves headroom for the top row and sizes the container', () => {
    const { nodes, width, height } = computeNodes(OPTS);
    expect(width).toBe(800); // perRow * cellW
    const topNodeY = Math.min(...nodes.map((n) => n.y));
    expect(topNodeY).toBeGreaterThanOrEqual(0);
    expect(height).toBeGreaterThan(Math.max(...nodes.map((n) => n.y)));
  });
});

describe('smoothPath', () => {
  it('is empty for no points and a single move for one point', () => {
    expect(smoothPath([])).toBe('');
    expect(smoothPath([{ x: 5, y: 6 }])).toBe('M 5 6');
  });

  it('starts at the first point and emits a cubic per segment', () => {
    const d = smoothPath([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 10 },
    ]);
    expect(d.startsWith('M 0 0')).toBe(true);
    expect((d.match(/C/g) ?? []).length).toBe(2);
  });
});

describe('computeTrailLayout', () => {
  it('threads the path through every node', () => {
    const layout = computeTrailLayout(OPTS);
    expect(layout.nodes).toHaveLength(17);
    expect(layout.path.startsWith(`M ${layout.nodes[0].x} ${layout.nodes[0].y}`)).toBe(true);
    expect((layout.path.match(/C/g) ?? []).length).toBe(16);
  });
});
