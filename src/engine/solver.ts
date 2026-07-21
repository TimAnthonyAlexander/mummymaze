/**
 * Exact solver for the (fully deterministic) pursuit maze.
 *
 * Because monsters follow a fixed pursuit rule and never act as an adversary,
 * solvability is a plain reachability question over the PLAYER's action
 * sequence: a level is winnable iff some sequence of actions reaches phase
 * 'won' without ever passing through phase 'lost'. We answer it with BFS, so
 * the first winning path found is also the SHORTEST (which we use as `par`).
 *
 * `solveFrom` runs the search from ANY GameState (not just a fresh `initGame`),
 * so it doubles as the engine behind an in-game hint feature. `solve(level)` is
 * simply `solveFrom(initGame(level))`.
 *
 * The `forbidCollisions` option prunes any player action whose resulting turn
 * DESTROYS a monster (the alive count drops). With it on, the search only finds
 * wins that never rely on luring monsters together — used to GUARANTEE that the
 * collision/merge trick is never a REQUIRED path, only an optional one.
 *
 * Pure module: no mutation of inputs, no I/O beyond a single console.warn when
 * the exploration cap is hit.
 */
import { initGame, step } from './step';
import type { Action, GameState, Level } from './types';

/** Actions attempted at every node, in a stable order (BFS optimality is
 * independent of order; a fixed order keeps results reproducible). */
const ACTIONS: readonly Action[] = ['N', 'E', 'S', 'W', 'wait'] as const;

/** Hard cap so a pathological level cannot run unbounded. */
export const DEFAULT_STATE_CAP = 500_000;

export interface SolveOptions {
  /** Max states to expand before giving up (returns solvable:false). */
  readonly cap?: number;
  /**
   * When true, prune any player action whose turn destroys a monster (the
   * alive count decreases). The returned win therefore never causes a merge.
   */
  readonly forbidCollisions?: boolean;
}

export interface SolveResult {
  readonly solvable: boolean;
  /** Shortest winning action sequence, or null if none found / cap hit. */
  readonly solution: Action[] | null;
  readonly statesExplored: number;
}

/**
 * Canonical key for a game state, used to dedupe BFS visited nodes.
 *
 * Included: player position; every monster SLOT's alive-flag + position (in
 * fixed array order); gate open/closed flags (sorted by id).
 *
 * Deliberately EXCLUDED: `turn` and `moveCount`. Neither is read by `step`,
 * `monsterStep`, or `canCross`; they are scoring counters only. Two states that
 * agree on player/monsters/gates therefore have identical futures regardless of
 * how many turns it took to reach them, so folding them together is exact and
 * strictly prunes the search.
 *
 * Monsters are keyed by SLOT (array index) rather than as an unordered set:
 * monsters keep their array slot for the whole game (a dead monster keeps its
 * slot with alive=false), and both the monster move order and the collision
 * survivor rule ("moving monster survives") depend on that slot order. Keying
 * by slot is thus the conservative, always-correct choice.
 */
export function stateKey(s: GameState): string {
  const p = `${s.player.x},${s.player.y}`;
  const mons = s.monsters
    .map((m) => (m.alive ? `${m.pos.x},${m.pos.y}` : 'X'))
    .join('|');
  const gates = Object.keys(s.gatesOpen)
    .sort()
    .map((id) => `${id}:${s.gatesOpen[id] ? 1 : 0}`)
    .join(',');
  return `${p};${mons};${gates}`;
}

/** Number of monsters currently alive in a state. */
function aliveCount(s: GameState): number {
  let n = 0;
  for (const m of s.monsters) if (m.alive) n++;
  return n;
}

interface Node {
  readonly state: GameState;
  readonly path: readonly Action[];
}

/**
 * BFS for the shortest winning continuation from ANY game state.
 *
 * @param start the state to search from (need not be a fresh `initGame`)
 * @param opts  `cap` (state budget) and `forbidCollisions` (never merge)
 */
export function solveFrom(start: GameState, opts: SolveOptions = {}): SolveResult {
  const cap = opts.cap ?? DEFAULT_STATE_CAP;
  const forbid = opts.forbidCollisions ?? false;

  // Degenerate terminal states.
  if (start.phase === 'won') {
    return { solvable: true, solution: [], statesExplored: 0 };
  }
  if (start.phase === 'lost') {
    return { solvable: false, solution: null, statesExplored: 0 };
  }

  const visited = new Set<string>([stateKey(start)]);
  const queue: Node[] = [{ state: start, path: [] }];
  let statesExplored = 0;

  while (queue.length > 0) {
    const { state, path } = queue.shift() as Node;
    statesExplored++;

    if (statesExplored > cap) {
      // eslint-disable-next-line no-console
      console.warn(
        `solveFrom("${start.level.id}"): exceeded ${cap} states; giving up (treating as unsolvable).`,
      );
      return { solvable: false, solution: null, statesExplored };
    }

    const before = aliveCount(state);

    for (const action of ACTIONS) {
      const next = step(state, action);

      // Illegal directional move is a no-op (same ref). 'wait' is always legal
      // and meaningful (gate/lure timing), so it is never skipped here.
      if (next === state) continue;

      // Never-merge pruning: reject any action that destroys a monster.
      if (forbid && aliveCount(next) < before) continue;

      if (next.phase === 'won') {
        return {
          solvable: true,
          solution: [...path, action],
          statesExplored,
        };
      }
      if (next.phase === 'lost') continue; // prune losing branches

      const key = stateKey(next);
      if (visited.has(key)) continue;
      visited.add(key);
      queue.push({ state: next, path: [...path, action] });
    }
  }

  return { solvable: false, solution: null, statesExplored };
}

/**
 * BFS for the shortest winning action sequence from the level's start.
 * Thin wrapper over `solveFrom(initGame(level))`.
 */
export function solve(level: Level, opts: SolveOptions = {}): SolveResult {
  return solveFrom(initGame(level), opts);
}
