/**
 * Difficulty metrics for a level, derived from an EXACT full search of the
 * deterministic game tree (same transitions the player sees). All pure.
 *
 * Three orthogonal signals are combined:
 *
 *  - `par`              — length of the shortest winning line (from the solver).
 *                         Longer optimal solutions are harder to find and execute.
 *  - `reachableStates`  — number of distinct non-losing states reachable from the
 *                         start. A proxy for how large / branchy the puzzle is:
 *                         more live states = more ways to go wrong.
 *  - `forcedMoveFraction` — the "tension": fraction of reachable decision states
 *                         in which exactly ONE available action avoids an
 *                         immediate loss next turn. High tension = the player is
 *                         frequently walking a knife-edge.
 *
 * Combined (documented, monotonic-ish) formula:
 *
 *   score = 1.0 * par
 *         + 1.0 * log2(1 + reachableStates)
 *         + 15  * forcedMoveFraction
 *         + 2.5 * monsters
 *         + 0.04 * (width * height)
 *
 * Every term is non-negative and increases with intuitive difficulty, so the
 * score is monotonic in each input. The weights are tuned so the two signals a
 * player actually FEELS — par (how long the line is) and forcedMoveFraction
 * (how often they walk a knife-edge) — dominate, while the purely structural
 * terms (reachableStates, board area) only gently lift the score. This keeps
 * the early curve reading gently: a near-trivial single-scorpion 5x5 no longer
 * inherits a big score purely from board size / branchiness. Rounded to 2
 * decimals.
 *
 * (Previous weights were 2.0*log2(reachable), 20*forced, 3.0*monsters,
 * 0.10*size; they let the structural terms swamp par, so trivial early boards
 * scored deceptively high. Lowered here — see the difficulty-ramp change.)
 */
import { initGame, step } from './step';
import { solve, stateKey } from './solver';
import type { Action, GameState, Level } from './types';

const ACTIONS: readonly Action[] = ['N', 'E', 'S', 'W', 'wait'] as const;

export interface DifficultyBreakdown {
  /** Shortest winning move count, or null if unsolvable. */
  readonly par: number | null;
  readonly reachableStates: number;
  readonly forcedMoveFraction: number;
  readonly monsters: number;
  /** width * height. */
  readonly size: number;
  readonly solvable: boolean;
}

export interface DifficultyResult {
  readonly score: number;
  readonly breakdown: DifficultyBreakdown;
}

/** Distinct non-no-op successor states of `s` (keeps 'wait'). */
function successors(s: GameState): GameState[] {
  const out: GameState[] = [];
  for (const a of ACTIONS) {
    const next = step(s, a);
    if (next === s) continue; // illegal no-op
    out.push(next);
  }
  return out;
}

interface FloodStats {
  readonly reachableStates: number;
  readonly forcedStates: number;
  readonly decisionStates: number;
}

/**
 * Flood the reachable non-losing state space from the start and, for each such
 * decision state, count how many available actions avoid an immediate loss.
 * A state is "forced" when exactly one action is safe.
 */
function flood(level: Level, cap: number): FloodStats {
  const start = initGame(level);
  const visited = new Set<string>([stateKey(start)]);
  const stack: GameState[] = [start];

  let reachableStates = 0;
  let forcedStates = 0;
  let decisionStates = 0;

  while (stack.length > 0) {
    const s = stack.pop() as GameState;
    reachableStates++;
    if (reachableStates > cap) break;

    let safeActions = 0;
    for (const a of ACTIONS) {
      const next = step(s, a);
      if (next === s) continue; // illegal no-op: not an available action
      if (next.phase === 'lost') continue; // available but loses immediately
      safeActions++;
    }

    // Only states where the player still has at least one legal action count as
    // decision states (a fully-blocked/dead node contributes nothing useful).
    if (safeActions >= 1) {
      decisionStates++;
      if (safeActions === 1) forcedStates++;
    }

    for (const next of successors(s)) {
      if (next.phase === 'lost' || next.phase === 'won') continue;
      const key = stateKey(next);
      if (visited.has(key)) continue;
      visited.add(key);
      stack.push(next);
    }
  }

  return { reachableStates, forcedStates, decisionStates };
}

export function scoreDifficulty(
  level: Level,
  cap: number = 200_000,
): DifficultyResult {
  const solution = solve(level, { cap });
  const { reachableStates, forcedStates, decisionStates } = flood(level, cap);

  const forcedMoveFraction =
    decisionStates > 0 ? forcedStates / decisionStates : 0;
  const monsters = level.monstersStart.length;
  const size = level.width * level.height;
  const par = solution.solution ? solution.solution.length : null;

  const breakdown: DifficultyBreakdown = {
    par,
    reachableStates,
    forcedMoveFraction,
    monsters,
    size,
    solvable: solution.solvable,
  };

  // Unsolvable levels get a sentinel score of 0 (they should never ship).
  if (!solution.solvable || par === null) {
    return { score: 0, breakdown };
  }

  const raw =
    1.0 * par +
    1.0 * Math.log2(1 + reachableStates) +
    15 * forcedMoveFraction +
    2.5 * monsters +
    0.04 * size;

  return { score: Math.round(raw * 100) / 100, breakdown };
}
