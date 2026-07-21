/**
 * On-demand hint logic over the exact BFS solver.
 *
 * The heavy `solveFrom` call runs only on a button click (never per render).
 * Two affordances:
 *   - a single per-level HINT that reveals just the next optimal action, and
 *   - an always-available SHOW SOLUTION that reveals the full remaining path.
 *
 * Both compute against the CURRENT state, so after undos/moves the answer stays
 * correct; an unsolvable position reports `unsolvable` instead of a direction.
 * The transient reveal (highlighted direction / sequence) clears automatically
 * whenever the game state changes, so a stale arrow never lingers past a move.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { type Action, type GameState, solveFrom } from '../engine';
import { sfx } from './sound';

export interface UseHints {
  /** The next optimal action to highlight on the dpad, or null when hidden. */
  hintDir: Action | null;
  /** Full remaining optimal action list, shown by "Show solution". */
  solution: Action[] | null;
  /** True when the last request found no win from the current state. */
  unsolvable: boolean;
  /** Whether the one-per-level plain hint has been spent for this level. */
  hintUsed: boolean;
  /** Reveal the next optimal move (spends the level's hint budget). */
  requestHint: () => void;
  /** Reveal the whole remaining optimal sequence (always available). */
  showSolution: () => void;
}

export function useHints(state: GameState): UseHints {
  const levelId = state.level.id;
  const [hintDir, setHintDir] = useState<Action | null>(null);
  const [solution, setSolution] = useState<Action[] | null>(null);
  const [unsolvable, setUnsolvable] = useState(false);
  const [usedLevels, setUsedLevels] = useState<ReadonlySet<string>>(new Set());

  // Any change to the authoritative state (move / undo / restart / load) makes
  // the reveal stale — drop it. The per-level "used" budget is intentionally
  // NOT reset here (it persists for the whole visit to the level).
  useEffect(() => {
    setHintDir(null);
    setSolution(null);
    setUnsolvable(false);
  }, [state]);

  const requestHint = useCallback(() => {
    if (state.phase !== 'player') return;
    const result = solveFrom(state);
    if (!result.solvable || !result.solution || result.solution.length === 0) {
      setUnsolvable(true);
      setHintDir(null);
      return;
    }
    setUnsolvable(false);
    setHintDir(result.solution[0]);
    setUsedLevels((prev) => {
      const next = new Set(prev);
      next.add(levelId);
      return next;
    });
    sfx.hint();
  }, [state, levelId]);

  const showSolution = useCallback(() => {
    if (state.phase !== 'player') return;
    const result = solveFrom(state);
    if (!result.solvable || !result.solution || result.solution.length === 0) {
      setUnsolvable(true);
      setSolution(null);
      return;
    }
    setUnsolvable(false);
    setSolution(result.solution);
    setHintDir(result.solution[0]);
    sfx.hint();
  }, [state]);

  return useMemo(
    () => ({
      hintDir,
      solution,
      unsolvable,
      hintUsed: usedLevels.has(levelId),
      requestHint,
      showSolution,
    }),
    [hintDir, solution, unsolvable, usedLevels, levelId, requestHint, showSolution],
  );
}
