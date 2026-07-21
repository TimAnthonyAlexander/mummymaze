/**
 * Editor domain model + pure, immutable helpers.
 *
 * The editor holds a compact draft that mirrors the engine's `LevelSpec` but
 * keeps every edge (walls/gates/exit) in a single CANONICAL representation so a
 * shared interior edge is never stored twice. All updates return NEW objects;
 * nothing here mutates its inputs (immutability rule).
 */
import { neighbor } from '../../engine';
import type {
  Dir,
  EdgeSpec,
  GateSpec,
  LevelSpec,
  MonsterKind,
  MonsterSpec,
  Pos,
} from '../../engine';

export type Tool =
  | 'start'
  | 'exit'
  | 'wall'
  | 'gate'
  | 'key'
  | 'trap'
  | 'monster'
  | 'eraser';

/** Tools that act on a cell EDGE rather than the cell body. */
export const EDGE_TOOLS: ReadonlySet<Tool> = new Set<Tool>(['wall', 'gate', 'exit']);

export const MONSTER_KINDS: readonly MonsterKind[] = [
  'mummy_white',
  'mummy_red',
  'scorpion_white',
  'scorpion_red',
];

export const MIN_DIM = 3;
export const MAX_DIM = 12;

/** The editor's working draft. */
export interface EditorState {
  readonly id: string;
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly start: Pos;
  readonly exit: EdgeSpec | null;
  readonly walls: readonly EdgeSpec[];
  readonly gates: readonly GateSpec[];
  readonly keys: readonly Pos[];
  readonly traps: readonly Pos[];
  readonly monsters: readonly MonsterSpec[];
}

export function clampDim(n: number): number {
  if (!Number.isFinite(n)) return MIN_DIM;
  return Math.max(MIN_DIM, Math.min(MAX_DIM, Math.round(n)));
}

export function emptyState(width = 6, height = 6): EditorState {
  return {
    id: 'my-level',
    name: 'My Level',
    width,
    height,
    start: { x: 0, y: height - 1 },
    exit: { x: width - 1, y: 0, dir: 'N' },
    walls: [],
    gates: [],
    keys: [],
    traps: [],
    monsters: [],
  };
}

// --- edge geometry -------------------------------------------------------

/** True when stepping from (x,y) in `dir` leaves the board (outer border). */
export function isBorderEdge(width: number, height: number, e: EdgeSpec): boolean {
  const n = neighbor({ x: e.x, y: e.y }, e.dir);
  return n.x < 0 || n.y < 0 || n.x >= width || n.y >= height;
}

/**
 * Collapse an edge to a single canonical form: interior edges are represented
 * from the smaller cell as an `E` or `S` edge; border edges keep their outward
 * direction. This makes `(x,y,S)` and `(x,y+1,N)` compare equal.
 */
export function canonEdge(e: EdgeSpec): EdgeSpec {
  if (e.dir === 'N' && e.y > 0) return { x: e.x, y: e.y - 1, dir: 'S' };
  if (e.dir === 'W' && e.x > 0) return { x: e.x - 1, y: e.y, dir: 'E' };
  return { x: e.x, y: e.y, dir: e.dir };
}

export function edgeKey(e: EdgeSpec): string {
  const c = canonEdge(e);
  return `${c.x},${c.y},${c.dir}`;
}

export function sameEdge(a: EdgeSpec, b: EdgeSpec): boolean {
  return edgeKey(a) === edgeKey(b);
}

export function samePos(a: Pos, b: Pos): boolean {
  return a.x === b.x && a.y === b.y;
}

function inBounds(width: number, height: number, p: Pos): boolean {
  return p.x >= 0 && p.y >= 0 && p.x < width && p.y < height;
}

// --- immutable edits -----------------------------------------------------

export function setField<K extends keyof EditorState>(
  s: EditorState,
  key: K,
  value: EditorState[K],
): EditorState {
  return { ...s, [key]: value };
}

/** Resize, dropping anything that no longer fits and clamping the start cell. */
export function resize(s: EditorState, width: number, height: number): EditorState {
  const w = clampDim(width);
  const h = clampDim(height);
  const fitsPos = (p: Pos) => inBounds(w, h, p);
  const fitsEdge = (e: EdgeSpec) => inBounds(w, h, { x: e.x, y: e.y });
  return {
    ...s,
    width: w,
    height: h,
    start: {
      x: Math.min(s.start.x, w - 1),
      y: Math.min(s.start.y, h - 1),
    },
    exit: s.exit && fitsEdge(s.exit) && isBorderEdge(w, h, s.exit) ? s.exit : null,
    walls: s.walls.filter(fitsEdge),
    gates: s.gates.filter(fitsEdge),
    keys: s.keys.filter(fitsPos),
    traps: s.traps.filter(fitsPos),
    monsters: s.monsters.filter(fitsPos),
  };
}

/** Apply a cell-body tool (start / key / trap / monster / eraser) at (x,y). */
export function applyCellTool(
  s: EditorState,
  tool: Tool,
  x: number,
  y: number,
  kind: MonsterKind,
): EditorState {
  const at = { x, y };
  switch (tool) {
    case 'start':
      return { ...s, start: at };
    case 'key': {
      const has = s.keys.some((k) => samePos(k, at));
      return { ...s, keys: has ? s.keys.filter((k) => !samePos(k, at)) : [...s.keys, at] };
    }
    case 'trap': {
      const has = s.traps.some((t) => samePos(t, at));
      return { ...s, traps: has ? s.traps.filter((t) => !samePos(t, at)) : [...s.traps, at] };
    }
    case 'monster': {
      const has = s.monsters.some((m) => m.x === x && m.y === y);
      return {
        ...s,
        monsters: has
          ? s.monsters.filter((m) => !(m.x === x && m.y === y))
          : [...s.monsters, { kind, x, y }],
      };
    }
    case 'eraser':
      return {
        ...s,
        keys: s.keys.filter((k) => !samePos(k, at)),
        traps: s.traps.filter((t) => !samePos(t, at)),
        monsters: s.monsters.filter((m) => !(m.x === x && m.y === y)),
      };
    default:
      return s;
  }
}

/** Apply an edge tool (wall / gate / exit / eraser) to edge (x,y,dir). */
export function applyEdgeTool(
  s: EditorState,
  tool: Tool,
  x: number,
  y: number,
  dir: Dir,
): EditorState {
  const edge: EdgeSpec = { x, y, dir };
  const border = isBorderEdge(s.width, s.height, edge);
  switch (tool) {
    case 'wall': {
      const has = s.walls.some((w) => sameEdge(w, edge));
      const walls = has
        ? s.walls.filter((w) => !sameEdge(w, edge))
        : [...s.walls, canonEdge(edge)];
      // A wall and a gate can't share an edge — placing a wall clears the gate.
      const gates = has ? s.gates : s.gates.filter((g) => !sameEdge(g, edge));
      return { ...s, walls, gates };
    }
    case 'gate': {
      const has = s.gates.some((g) => sameEdge(g, edge));
      const gates = has
        ? s.gates.filter((g) => !sameEdge(g, edge))
        : [...s.gates, { ...canonEdge(edge), open: false }];
      const walls = has ? s.walls : s.walls.filter((w) => !sameEdge(w, edge));
      return { ...s, gates, walls };
    }
    case 'exit': {
      if (!border) return s; // exits may only sit on the outer border
      const c = canonEdge(edge);
      if (s.exit && sameEdge(s.exit, edge)) return { ...s, exit: null };
      return { ...s, exit: c };
    }
    case 'eraser': {
      const clearedExit = s.exit && sameEdge(s.exit, edge) ? null : s.exit;
      return {
        ...s,
        walls: s.walls.filter((w) => !sameEdge(w, edge)),
        gates: s.gates.filter((g) => !sameEdge(g, edge)),
        exit: clearedExit,
      };
    }
    default:
      return s;
  }
}

// --- spec (de)serialisation ---------------------------------------------

/**
 * Build a `LevelSpec` for validation / export. Empty arrays are omitted and,
 * when a solved length is supplied, it is written as `par`.
 */
export function toSpec(s: EditorState, par?: number): LevelSpec {
  const spec: LevelSpec = {
    id: s.id.trim() || 'untitled',
    name: s.name.trim() || 'Untitled',
    width: s.width,
    height: s.height,
    start: { x: s.start.x, y: s.start.y },
    // A null exit yields an obviously-invalid placeholder so loadLevel reports it.
    exit: s.exit ?? { x: -1, y: -1, dir: 'N' },
  };
  if (s.walls.length) spec.walls = s.walls.map((w) => ({ x: w.x, y: w.y, dir: w.dir }));
  if (s.gates.length) {
    spec.gates = s.gates.map((g) => ({ x: g.x, y: g.y, dir: g.dir, open: g.open ?? false }));
  }
  if (s.keys.length) spec.keys = s.keys.map((k) => ({ x: k.x, y: k.y }));
  if (s.traps.length) spec.traps = s.traps.map((t) => ({ x: t.x, y: t.y }));
  if (s.monsters.length) {
    spec.monsters = s.monsters.map((m) => ({ kind: m.kind, x: m.x, y: m.y }));
  }
  if (par !== undefined) spec.par = par;
  return spec;
}

/** Load a parsed `LevelSpec` (or unknown JSON) into an editor draft. */
export function fromSpec(raw: unknown): EditorState {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('JSON must be an object');
  }
  const o = raw as Record<string, unknown>;
  const width = clampDim(Number(o.width));
  const height = clampDim(Number(o.height));
  const start = o.start as Pos | undefined;
  const exit = o.exit as EdgeSpec | undefined;
  const asEdges = (v: unknown): EdgeSpec[] =>
    Array.isArray(v) ? v.map((e) => canonEdge(e as EdgeSpec)) : [];
  const asGates = (v: unknown): GateSpec[] =>
    Array.isArray(v)
      ? v.map((g) => ({ ...canonEdge(g as EdgeSpec), open: Boolean((g as GateSpec).open) }))
      : [];
  const asPositions = (v: unknown): Pos[] =>
    Array.isArray(v) ? v.map((p) => ({ x: Number((p as Pos).x), y: Number((p as Pos).y) })) : [];
  const asMonsters = (v: unknown): MonsterSpec[] =>
    Array.isArray(v)
      ? v.map((m) => {
          const mm = m as MonsterSpec;
          return { kind: mm.kind, x: Number(mm.x), y: Number(mm.y) };
        })
      : [];

  return {
    id: typeof o.id === 'string' ? o.id : 'imported',
    name: typeof o.name === 'string' ? o.name : 'Imported Level',
    width,
    height,
    start: start ? { x: Number(start.x), y: Number(start.y) } : { x: 0, y: height - 1 },
    exit: exit ? canonEdge(exit) : null,
    walls: asEdges(o.walls),
    gates: asGates(o.gates),
    keys: asPositions(o.keys),
    traps: asPositions(o.traps),
    monsters: asMonsters(o.monsters),
  };
}
