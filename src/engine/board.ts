/**
 * Board geometry: bounds, neighbors, and edge-crossing rules (walls + gates).
 * Pure functions only.
 */
import type { Dir, Gate, Level, Pos } from './types';

export const DELTA: Readonly<Record<Dir, Pos>> = {
  N: { x: 0, y: -1 },
  E: { x: 1, y: 0 },
  S: { x: 0, y: 1 },
  W: { x: -1, y: 0 },
};

export const OPPOSITE: Readonly<Record<Dir, Dir>> = {
  N: 'S',
  S: 'N',
  E: 'W',
  W: 'E',
};

export function neighbor(pos: Pos, dir: Dir): Pos {
  const d = DELTA[dir];
  return { x: pos.x + d.x, y: pos.y + d.y };
}

export function samePos(a: Pos, b: Pos): boolean {
  return a.x === b.x && a.y === b.y;
}

export function inBounds(level: Level, pos: Pos): boolean {
  return pos.x >= 0 && pos.y >= 0 && pos.x < level.width && pos.y < level.height;
}

/** True if `from`->`dir` is the same edge a gate occupies (either side). */
function gateOnEdge(gate: Gate, from: Pos, dir: Dir): boolean {
  if (samePos(gate.a, from) && gate.dir === dir) return true;
  const other = neighbor(from, dir);
  return samePos(gate.a, other) && gate.dir === OPPOSITE[dir];
}

/** Returns the id of a gate on edge `from`->`dir`, or null. */
export function gateIdAt(level: Level, from: Pos, dir: Dir): string | null {
  for (const g of level.gates) {
    if (gateOnEdge(g, from, dir)) return g.id;
  }
  return null;
}

/**
 * Can an entity cross from `from` in `dir`? Considers destination bounds,
 * the wall on that edge, and any closed gate. Does NOT consider the exit
 * (which is a special border edge handled by the step logic).
 */
export function canCross(
  level: Level,
  gatesOpen: Readonly<Record<string, boolean>>,
  from: Pos,
  dir: Dir,
): boolean {
  const to = neighbor(from, dir);
  if (!inBounds(level, to)) return false;
  if (level.cells[from.y][from.x].walls[dir]) return false;
  const gid = gateIdAt(level, from, dir);
  if (gid !== null && gatesOpen[gid] === false) return false;
  return true;
}
