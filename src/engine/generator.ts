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
import { canCross, neighbor as neighborOf, samePos } from './board';
import { initGame, step } from './step';
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

// ===========================================================================
// CURRICULUM QUALITY FILTERS
//
// A "good" early level puts the enemy CLOSE and threatening and forces the
// player to USE the mechanic being taught — the opposite of the failure mode
// where the enemy idles in a far corner and the player strolls to the exit.
// These pure helpers turn that judgement into machine-checkable predicates so
// the generator (and the test suite) can REJECT trivial levels.
//
//  1. Beeline (anti-trivial) test — a "greedy" player that always walks a fixed
//     shortest path from start to the exit IGNORING enemies. If that naive walk
//     WINS, the level is trivial. Every level from index 2 on must make the
//     beeliner LOSE (caught / trapped / path blocked). Level 1 may let the
//     beeliner win only if a monster came within one tile during the walk.
//  2. Threat proximity — the nearest enemy must start close to the player
//     (short open-edge path) OR sit directly on the beeline path. This rejects
//     "enemy parked in a far corner".
// ===========================================================================

/** Initial gate-open map for a freshly loaded level. */
function initialGatesOpen(level: Level): Record<string, boolean> {
  const g: Record<string, boolean> = {};
  for (const gate of level.gates) g[gate.id] = gate.startOpen;
  return g;
}

function manhattanDist(a: Pos, b: Pos): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/** A BFS shortest path over OPEN edges (walls/closed gates block). */
interface EdgePath {
  readonly dirs: readonly Dir[];
  readonly cells: readonly Pos[]; // start .. target inclusive
}

/**
 * Shortest path of directions from `from` to `to` through currently-open edges,
 * with a deterministic tie-break (edges explored in the fixed order N,E,S,W and
 * the first predecessor discovered wins). Returns null if `to` is unreachable.
 * Enemies are ignored — this is pure board reachability.
 */
function edgeShortestPath(
  level: Level,
  from: Pos,
  to: Pos,
  gatesOpen: Readonly<Record<string, boolean>>,
): EdgePath | null {
  const ORDER: readonly Dir[] = ['N', 'E', 'S', 'W'];
  const key = (p: Pos) => `${p.x},${p.y}`;
  const prev = new Map<string, { pos: Pos; dir: Dir }>();
  const seen = new Set<string>([key(from)]);
  const queue: Pos[] = [from];

  while (queue.length > 0) {
    const cur = queue.shift() as Pos;
    if (samePos(cur, to)) {
      const dirs: Dir[] = [];
      const cells: Pos[] = [cur];
      let c = cur;
      while (!samePos(c, from)) {
        const p = prev.get(key(c)) as { pos: Pos; dir: Dir };
        dirs.unshift(p.dir);
        cells.unshift(p.pos);
        c = p.pos;
      }
      return { dirs, cells };
    }
    for (const dir of ORDER) {
      if (!canCross(level, gatesOpen, cur, dir)) continue;
      const nb = neighborOf(cur, dir);
      const k = key(nb);
      if (seen.has(k)) continue;
      seen.add(k);
      prev.set(k, { pos: cur, dir });
      queue.push(nb);
    }
  }
  return null;
}

export interface BeelineResult {
  /** Did the naive greedy walk reach the exit and WIN? */
  readonly win: boolean;
  /** Closest a live monster came to the player (Manhattan) during the walk. */
  readonly minMonsterDist: number;
  /** BFS path length (edges) to the exit tile, or null if unreachable. */
  readonly pathLen: number | null;
  /** 'won' | 'caught' | 'trap' | 'walked-into-monster' | 'no-path'. */
  readonly reason: string;
}

/**
 * Simulate a greedy player who walks a fixed shortest path (start -> exit tile,
 * then steps out through the exit), IGNORING enemies. Runs the real `step`
 * engine so monsters chase exactly as in play. Reports whether that naive walk
 * wins and how close the nearest monster ever got.
 */
export function beelineTest(level: Level): BeelineResult {
  const gatesOpen = initialGatesOpen(level);
  const path = edgeShortestPath(level, level.start, level.exit.pos, gatesOpen);

  const minDistOf = (state: {
    player: Pos;
    monsters: readonly { pos: Pos; alive: boolean }[];
  }): number => {
    let d = Infinity;
    for (const m of state.monsters) {
      if (m.alive) d = Math.min(d, manhattanDist(state.player, m.pos));
    }
    return d;
  };

  let s = initGame(level);
  let minMonsterDist = minDistOf(s);

  if (path === null) {
    // The greedy player cannot even reach the exit tile: it never wins.
    return { win: false, minMonsterDist, pathLen: null, reason: 'no-path' };
  }

  const actions: Action[] = [...path.dirs, level.exit.dir];
  for (const a of actions) {
    s = step(s, a);
    minMonsterDist = Math.min(minMonsterDist, minDistOf(s));
    if (s.phase === 'won') {
      return { win: true, minMonsterDist, pathLen: path.dirs.length, reason: 'won' };
    }
    if (s.phase === 'lost') {
      return {
        win: false,
        minMonsterDist,
        pathLen: path.dirs.length,
        reason: s.lossReason ?? 'lost',
      };
    }
  }
  // Walk consumed without winning (e.g. a monster tripped a key and closed a
  // gate mid-walk, blocking the final step): treat as a non-winning beeline.
  return { win: false, minMonsterDist, pathLen: path.dirs.length, reason: 'blocked' };
}

/**
 * Shortest open-edge path distance from the player's start to the NEAREST
 * monster's start tile. Infinity if no monster is reachable (or none exist).
 */
export function nearestMonsterDistance(level: Level): number {
  const gatesOpen = initialGatesOpen(level);
  let best = Infinity;
  for (const m of level.monstersStart) {
    const p = edgeShortestPath(level, level.start, m.pos, gatesOpen);
    if (p) best = Math.min(best, p.dirs.length);
  }
  return best;
}

/** True if any monster starts on a tile of the greedy beeline path. */
export function monsterOnBeeline(level: Level): boolean {
  const gatesOpen = initialGatesOpen(level);
  const path = edgeShortestPath(level, level.start, level.exit.pos, gatesOpen);
  if (!path) return false;
  const onPath = new Set(path.cells.map((c) => `${c.x},${c.y}`));
  return level.monstersStart.some((m) => onPath.has(`${m.pos.x},${m.pos.y}`));
}

export interface CurriculumCheck {
  readonly solvable: boolean;
  /** Solvable WITHOUT ever merging two monsters. */
  readonly forbidSolvable: boolean;
  readonly mergeRequired: boolean;
  readonly beeline: BeelineResult;
  readonly nearestMonsterDist: number;
  readonly monsterOnBeeline: boolean;
  /** proximity filter: nearest enemy close OR sitting on the beeline path. */
  readonly proximityOk: boolean;
  readonly par: number | null;
  readonly manhattan: number;
}

/**
 * Run every curriculum filter for a level. `index` is the 0-based level index;
 * the beeline requirement is relaxed for level 1 (index 0) exactly as the
 * curriculum spec allows (a win is tolerated there only if a monster still came
 * within one tile during the walk).
 */
export function curriculumCheck(level: Level): CurriculumCheck {
  const r = solve(level);
  const solvable = r.solvable;
  const par = r.solution ? r.solution.length : null;

  let forbidSolvable = true;
  if (level.monstersStart.length >= 2) {
    forbidSolvable = solve(level, { forbidCollisions: true }).solvable;
  }

  const beeline = beelineTest(level);
  const nearest = nearestMonsterDistance(level);
  const onBeeline = monsterOnBeeline(level);
  const maxDim = Math.max(level.width, level.height);
  const proximityOk = nearest <= Math.ceil(maxDim / 2) || onBeeline;

  return {
    solvable,
    forbidSolvable,
    mergeRequired: solvable && !forbidSolvable,
    beeline,
    nearestMonsterDist: nearest,
    monsterOnBeeline: onBeeline,
    proximityOk,
    par,
    manhattan: manhattanDist(level.start, level.exit.pos),
  };
}

/**
 * Pass/fail the full curriculum gate for a level at a given 0-based `index`.
 * Returns the list of failed-requirement messages (empty === passes).
 *
 * @param requireForbid enforce forbidCollisions-solvable (never-required merge).
 *        True for levels 1-6, false for 7+ (where a merge may be the solution).
 */
export function curriculumFailures(
  level: Level,
  index: number,
  requireForbid: boolean,
): string[] {
  const c = curriculumCheck(level);
  const fails: string[] = [];

  if (!c.solvable) fails.push('not solvable');
  if (requireForbid && !c.forbidSolvable) {
    fails.push('requires a monster merge (forbidCollisions unsolvable)');
  }
  if (c.par !== null && !(c.par > c.manhattan)) {
    fails.push(`par ${c.par} <= manhattan ${c.manhattan} (straight shot, no maneuvering)`);
  }
  if (!c.proximityOk) {
    fails.push(
      `nearest enemy too far (dist ${c.nearestMonsterDist}, not on beeline) — idle-corner enemy`,
    );
  }

  if (index >= 2) {
    // Every level from #3 on must defeat the naive beeliner.
    if (c.beeline.win) fails.push('beeline WINS (level is trivial)');
  } else if (index === 0) {
    // Level 1: a beeline win is tolerated only if a monster got within 1 tile.
    if (c.beeline.win && c.beeline.minMonsterDist > 1) {
      fails.push('L1 beeline wins with no real threat (min monster dist > 1)');
    }
  } else {
    // Level 2 (index 1): treat like the rest — beeline must fail.
    if (c.beeline.win) fails.push('beeline WINS (level is trivial)');
  }

  return fails;
}
