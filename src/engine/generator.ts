/**
 * Procedural level generator. PURE and SEEDED: it never calls Math.random —
 * the caller injects an `rng: () => number` (e.g. a seeded mulberry32) so a
 * given seed always yields the same pack.
 *
 * Strategy per attempt: randomly place exit (a border edge pointing outward),
 * start, walls, traps, an optional key+gate, and the requested monsters (never
 * on the start tile; start is never a trap). Then run the exact solver: reject
 * if unsolvable, score difficulty, reject if outside the target range. Return
 * the first candidate that passes, or null after `attempts` tries.
 */
import { loadLevel } from './level';
import type { EdgeSpec, GateSpec, LevelSpec, MonsterSpec } from './level';
import { scoreDifficulty } from './difficulty';
import type { DifficultyResult } from './difficulty';
import { solve } from './solver';
import type { Action, Dir, Level, MonsterKind, Pos } from './types';

export interface GenerateOptions {
  readonly id: string;
  readonly name: string;
  readonly width: number;
  readonly height: number;
  /** One entry per monster to place. */
  readonly monsters: readonly MonsterKind[];
  /** Fraction of interior edges to wall (0..1). */
  readonly wallDensity?: number;
  /** Number of trap tiles. */
  readonly traps?: number;
  /** If true, place one key tile and one (initially closed) gate. */
  readonly key?: boolean;
  /** Inclusive target difficulty band. */
  readonly minDifficulty?: number;
  readonly maxDifficulty?: number;
  /** Max attempts before giving up. */
  readonly attempts?: number;
  /**
   * Minimum Manhattan distance between start and the exit tile, to avoid
   * trivial one-step wins on larger boards. Default 0 (no constraint).
   */
  readonly minStartExitDistance?: number;
}

export interface GeneratedLevel {
  readonly spec: LevelSpec;
  readonly level: Level;
  readonly solution: Action[];
  readonly difficulty: DifficultyResult;
}

type RNG = () => number;

function randInt(rng: RNG, n: number): number {
  return Math.floor(rng() * n);
}

function pick<T>(rng: RNG, arr: readonly T[]): T {
  return arr[randInt(rng, arr.length)];
}

const DELTAS: Readonly<Record<Dir, Pos>> = {
  N: { x: 0, y: -1 },
  E: { x: 1, y: 0 },
  S: { x: 0, y: 1 },
  W: { x: -1, y: 0 },
};

function inBounds(w: number, h: number, p: Pos): boolean {
  return p.x >= 0 && p.y >= 0 && p.x < w && p.y < h;
}

function posKey(p: Pos): string {
  return `${p.x},${p.y}`;
}

/** All outward-pointing border edges as EdgeSpecs. */
function borderExits(w: number, h: number): EdgeSpec[] {
  const out: EdgeSpec[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      for (const dir of ['N', 'E', 'S', 'W'] as Dir[]) {
        const d = DELTAS[dir];
        if (!inBounds(w, h, { x: x + d.x, y: y + d.y })) {
          out.push({ x, y, dir });
        }
      }
    }
  }
  return out;
}

function manhattan(a: Pos, b: Pos): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/** Build a single candidate LevelSpec (unsolved / unchecked). */
function buildSpec(opts: GenerateOptions, rng: RNG): LevelSpec | null {
  const { width: w, height: h } = opts;

  // Exit: a random outward border edge.
  const exits = borderExits(w, h);
  if (exits.length === 0) return null;
  const exit = pick(rng, exits);
  const exitTile: Pos = { x: exit.x, y: exit.y };

  // Start: a random tile, honoring the min distance from the exit tile.
  const minDist = opts.minStartExitDistance ?? 0;
  let start: Pos | null = null;
  for (let t = 0; t < 200 && start === null; t++) {
    const cand: Pos = { x: randInt(rng, w), y: randInt(rng, h) };
    if (manhattan(cand, exitTile) >= minDist) start = cand;
  }
  if (start === null) return null;
  const startKey = posKey(start);

  // Walls: for each interior edge (each cell's E and S neighbor), maybe wall it.
  const density = opts.wallDensity ?? 0;
  const walls: EdgeSpec[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x + 1 < w && rng() < density) walls.push({ x, y, dir: 'E' });
      if (y + 1 < h && rng() < density) walls.push({ x, y, dir: 'S' });
    }
  }

  // Traps: random tiles, never the start.
  const used = new Set<string>([startKey]);
  const traps: Pos[] = [];
  const trapCount = opts.traps ?? 0;
  for (let i = 0; i < trapCount; i++) {
    for (let t = 0; t < 50; t++) {
      const p: Pos = { x: randInt(rng, w), y: randInt(rng, h) };
      const k = posKey(p);
      if (used.has(k)) continue;
      used.add(k);
      traps.push(p);
      break;
    }
  }

  // Optional key + gate.
  const keys: Pos[] = [];
  const gates: GateSpec[] = [];
  if (opts.key) {
    for (let t = 0; t < 50; t++) {
      const p: Pos = { x: randInt(rng, w), y: randInt(rng, h) };
      const k = posKey(p);
      if (used.has(k)) continue;
      used.add(k);
      keys.push(p);
      break;
    }
    // Gate on a random interior edge (initially closed).
    for (let t = 0; t < 50; t++) {
      const x = randInt(rng, w);
      const y = randInt(rng, h);
      const dir: Dir = rng() < 0.5 ? 'E' : 'S';
      const d = DELTAS[dir];
      if (!inBounds(w, h, { x: x + d.x, y: y + d.y })) continue;
      gates.push({ x, y, dir, open: false });
      break;
    }
  }

  // Monsters: random tiles, never the start, no two on the same tile.
  const monsters: MonsterSpec[] = [];
  const monUsed = new Set<string>([startKey]);
  for (const kind of opts.monsters) {
    let placed = false;
    for (let t = 0; t < 100 && !placed; t++) {
      const p: Pos = { x: randInt(rng, w), y: randInt(rng, h) };
      const k = posKey(p);
      if (monUsed.has(k)) continue;
      monUsed.add(k);
      monsters.push({ kind, x: p.x, y: p.y });
      placed = true;
    }
    if (!placed) return null;
  }

  return {
    id: opts.id,
    name: opts.name,
    width: w,
    height: h,
    start,
    exit,
    ...(walls.length ? { walls } : {}),
    ...(gates.length ? { gates } : {}),
    ...(keys.length ? { keys } : {}),
    ...(traps.length ? { traps } : {}),
    ...(monsters.length ? { monsters } : {}),
  };
}

/**
 * Generate a level, returning the rich result (spec + validated Level +
 * shortest solution + difficulty). Pure; deterministic for a given rng.
 */
export function generateLevelDetailed(
  opts: GenerateOptions,
  rng: RNG,
): GeneratedLevel | null {
  const attempts = opts.attempts ?? 400;
  const min = opts.minDifficulty ?? -Infinity;
  const max = opts.maxDifficulty ?? Infinity;

  for (let i = 0; i < attempts; i++) {
    const spec = buildSpec(opts, rng);
    if (spec === null) continue;

    let level: Level;
    try {
      level = loadLevel(spec);
    } catch {
      continue; // invalid geometry; try again
    }

    const result = solve(level);
    if (!result.solvable || result.solution === null) continue;

    // Never-required-merging guarantee: reject any level whose ONLY winning
    // lines require destroying a monster (a collision/merge). With >= 2 monsters
    // we re-solve forbidding collisions; the collision mechanic still EXISTS
    // (players may lure monsters together) but is never the required path. With
    // 0 or 1 monster a merge is impossible, so the extra solve is skipped.
    if (level.monstersStart.length >= 2) {
      const noMerge = solve(level, { forbidCollisions: true });
      if (!noMerge.solvable) continue;
    }

    const difficulty = scoreDifficulty(level);
    if (difficulty.score < min || difficulty.score > max) continue;

    const par = result.solution.length;
    const finalSpec: LevelSpec = { ...spec, par };
    // Re-load so the returned Level carries the recorded par too.
    const finalLevel = loadLevel(finalSpec);

    return {
      spec: finalSpec,
      level: finalLevel,
      solution: result.solution,
      difficulty,
    };
  }

  return null;
}

/**
 * Spec-compatible entry point: returns the validated Level (or null).
 * See `generateLevelDetailed` for spec/solution/difficulty alongside it.
 */
export function generateLevel(opts: GenerateOptions, rng: RNG): Level | null {
  const detailed = generateLevelDetailed(opts, rng);
  return detailed ? detailed.level : null;
}
