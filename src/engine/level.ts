/**
 * Level authoring format + loader/validator. Levels are authored as compact
 * JSON (walls/gates/keys/traps as sparse lists) and expanded into a validated,
 * runtime-ready `Level`. Invalid levels fail fast with a clear message so bad
 * data never reaches the engine (input-validation rule).
 */
import { OPPOSITE, neighbor } from './board';
import type { Cell, Dir, Gate, Level, Monster, MonsterKind, Pos } from './types';

const DIR_SET = new Set<Dir>(['N', 'E', 'S', 'W']);
const KIND_SET = new Set<MonsterKind>([
  'mummy_white',
  'mummy_red',
  'scorpion_white',
  'scorpion_red',
]);

export interface EdgeSpec {
  x: number;
  y: number;
  dir: Dir;
}

export interface GateSpec extends EdgeSpec {
  open?: boolean;
}

export interface MonsterSpec {
  kind: MonsterKind;
  x: number;
  y: number;
}

/** The on-disk authoring shape (see docs/SPEC.md §4.1). */
export interface LevelSpec {
  id: string;
  name: string;
  width: number;
  height: number;
  start: Pos;
  exit: EdgeSpec;
  walls?: EdgeSpec[];
  gates?: GateSpec[];
  keys?: Pos[];
  traps?: Pos[];
  monsters?: MonsterSpec[];
  par?: number;
}

function fail(id: string, msg: string): never {
  throw new Error(`Invalid level "${id}": ${msg}`);
}

function inRange(width: number, height: number, p: Pos): boolean {
  return p.x >= 0 && p.y >= 0 && p.x < width && p.y < height;
}

/** Is this edge on the outer border, pointing outward? */
function isBorderEdge(width: number, height: number, e: EdgeSpec): boolean {
  const n = neighbor({ x: e.x, y: e.y }, e.dir);
  return !inRange(width, height, n);
}

export function loadLevel(spec: LevelSpec): Level {
  const id = spec.id ?? '(no id)';
  if (!spec.name) fail(id, 'missing name');
  if (!Number.isInteger(spec.width) || spec.width < 1) fail(id, 'bad width');
  if (!Number.isInteger(spec.height) || spec.height < 1) fail(id, 'bad height');
  const { width, height } = spec;

  if (!spec.start || !inRange(width, height, spec.start)) {
    fail(id, 'start out of bounds');
  }
  if (!spec.exit || !DIR_SET.has(spec.exit.dir)) fail(id, 'bad exit');
  if (!inRange(width, height, { x: spec.exit.x, y: spec.exit.y })) {
    fail(id, 'exit tile out of bounds');
  }
  if (!isBorderEdge(width, height, spec.exit)) {
    fail(id, 'exit must sit on the outer border, pointing outward');
  }

  // Build mutable grid, then freeze into the immutable Level.
  const cells: Cell[][] = [];
  for (let y = 0; y < height; y++) {
    const row: Cell[] = [];
    for (let x = 0; x < width; x++) {
      row.push({
        walls: { N: false, E: false, S: false, W: false },
        trap: false,
        key: false,
      });
    }
    cells.push(row);
  }

  const setWall = (x: number, y: number, dir: Dir, on: boolean) => {
    const c = cells[y][x];
    cells[y][x] = { ...c, walls: { ...c.walls, [dir]: on } };
  };

  for (const w of spec.walls ?? []) {
    if (!DIR_SET.has(w.dir)) fail(id, `bad wall dir ${w.dir}`);
    if (!inRange(width, height, { x: w.x, y: w.y })) {
      fail(id, `wall out of bounds at ${w.x},${w.y}`);
    }
    setWall(w.x, w.y, w.dir, true);
    // Mirror onto the neighbor so lookups are symmetric.
    const nb = neighbor({ x: w.x, y: w.y }, w.dir);
    if (inRange(width, height, nb)) setWall(nb.x, nb.y, OPPOSITE[w.dir], true);
  }

  for (const t of spec.traps ?? []) {
    if (!inRange(width, height, t)) fail(id, `trap out of bounds at ${t.x},${t.y}`);
    cells[t.y][t.x] = { ...cells[t.y][t.x], trap: true };
  }

  for (const k of spec.keys ?? []) {
    if (!inRange(width, height, k)) fail(id, `key out of bounds at ${k.x},${k.y}`);
    cells[k.y][k.x] = { ...cells[k.y][k.x], key: true };
  }

  const gates: Gate[] = (spec.gates ?? []).map((g, i) => {
    if (!DIR_SET.has(g.dir)) fail(id, `bad gate dir ${g.dir}`);
    if (!inRange(width, height, { x: g.x, y: g.y })) {
      fail(id, `gate out of bounds at ${g.x},${g.y}`);
    }
    return {
      id: `${id}-gate-${i}`,
      a: { x: g.x, y: g.y },
      dir: g.dir,
      startOpen: g.open ?? false,
    };
  });

  const monstersStart: Monster[] = (spec.monsters ?? []).map((m, i) => {
    if (!KIND_SET.has(m.kind)) fail(id, `bad monster kind ${m.kind}`);
    if (!inRange(width, height, { x: m.x, y: m.y })) {
      fail(id, `monster out of bounds at ${m.x},${m.y}`);
    }
    return {
      id: `${id}-mon-${i}`,
      kind: m.kind,
      pos: { x: m.x, y: m.y },
      alive: true,
    };
  });

  if (cells[spec.start.y][spec.start.x].trap) {
    fail(id, 'start tile is a trap');
  }

  return {
    id,
    name: spec.name,
    width,
    height,
    cells,
    gates,
    exit: { pos: { x: spec.exit.x, y: spec.exit.y }, dir: spec.exit.dir },
    start: { x: spec.start.x, y: spec.start.y },
    monstersStart,
    par: spec.par,
  };
}
