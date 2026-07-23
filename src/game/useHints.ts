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
  /**
   * Live unsolvability flag, recomputed automatically after every move/undo/load
   * (not just on a button press). Drives the blood-red ankh. Unlike
   * `unsolvable` (the button-triggered one behind "Show solution") it never
   * surfaces the solution or a text hint, so it can't spoil the puzzle.
   */
  liveUnsolvable: boolean;
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
  const [liveUnsolvable, setLiveUnsolvable] = useState(false);
  const [usedLevels, setUsedLevels] = useState<ReadonlySet<string>>(new Set());

  // Any change to the authoritative state (move / undo / restart / load) makes
  // the reveal stale — drop it. The per-level "used" budget is intentionally
  // NOT reset here (it persists for the whole visit to the level).
  useEffect(() => {
    setHintDir(null);
    setSolution(null);
    setUnsolvable(false);
  }, [state]);

  // Live unsolvability detection: run the exact solver from the current position
  // after every state change so the ankh turns red the instant the maze becomes
  // unwinnable — no button press required. Only meaningful while it's the
  // player's turn; a won/lost state is never flagged. Deferred to a timeout so
  // the BFS never blocks the just-committed move's hop animation, and cancelled
  // if the state changes again before it finishes.
  useEffect(() => {
    if (state.phase !== 'player') {
      setLiveUnsolvable(false);
      return;
    }
    let cancelled = false;
    const id = setTimeout(() => {
      const result = solveFrom(state);
      if (!cancelled) setLiveUnsolvable(!result.solvable);
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
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
      liveUnsolvable,
      hintUsed: usedLevels.has(levelId),
      requestHint,
      showSolution,
    }),
    [hintDir, solution, unsolvable, liveUnsolvable, usedLevels, levelId, requestHint, showSolution],
  );
}
