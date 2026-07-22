/**
 * Progression hook over the localStorage `storage` module.
 *
 * SINGLE SOURCE OF TRUTH: the set of COMPLETED levels. Everything else —
 * whether a level is unlocked and which level is the current frontier — is
 * DERIVED here from that set plus the pyramid order (`progressionOrder`). No
 * unlock state is ever stored, so reordering the pyramids can never leave a
 * stale, scattered unlock set behind (which used to produce phantom frontiers).
 *
 * Rules:
 *  - The FRONTIER is the first level in progression order that isn't completed —
 *    the single "current" objective. Exactly one exists (or none, once the whole
 *    pack is cleared).
 *  - A level is UNLOCKED (playable) iff it is completed or it is the frontier.
 *  - Completing a level just adds it to the set; the frontier recomputes itself.
 */
import { useCallback, useMemo, useState } from 'react';
import {
  type Pyramid,
  progressionOrder,
  pyramidLevelIds,
} from '../levels/pyramids';
import { clearSave, loadSave, saveSave, type SaveData } from './storage';

const PROGRESSION = progressionOrder();
const FIRST_LEVEL_ID = PROGRESSION[0];

/** The first not-yet-completed level in progression order, or undefined if all done. */
function frontierOf(completed: Set<string>): string | undefined {
  return PROGRESSION.find((id) => !completed.has(id));
}

export interface PyramidProgress {
  /** True once the pyramid's base (first) level is unlocked. */
  unlocked: boolean;
  /** True once every level in the pyramid is completed. */
  completed: boolean;
  /** Levels completed within the pyramid. */
  completedCount: number;
  /** Total levels in the pyramid. */
  total: number;
}

export interface Progress {
  unlocked: Set<string>;
  completed: Set<string>;
  bestMoves: Record<string, number>;
  /** The single current objective: first uncompleted level (undefined if all done). */
  currentLevelId: string | undefined;
  isUnlocked: (id: string) => boolean;
  recordWin: (levelId: string, moves: number) => void;
  setLastPlayed: (id: string) => void;
  resetProgress: () => void;
  pyramidProgress: (pyramid: Pyramid) => PyramidProgress;
}

export function useProgress(): Progress {
  const [save, setSave] = useState<SaveData>(() => loadSave());

  const commit = useCallback((next: SaveData) => {
    saveSave(next);
    setSave(next);
  }, []);

  const completed = useMemo(() => new Set(save.completedLevelIds), [save.completedLevelIds]);

  // The frontier and the unlocked set are DERIVED — never stored.
  const currentLevelId = useMemo(() => frontierOf(completed), [completed]);
  const unlocked = useMemo(() => {
    const s = new Set(completed);
    // Everything completed is playable; the single frontier is the only other
    // unlocked level. (Before anything is done, that's the very first level.)
    s.add(currentLevelId ?? FIRST_LEVEL_ID);
    return s;
  }, [completed, currentLevelId]);

  const isUnlocked = useCallback((id: string) => unlocked.has(id), [unlocked]);

  const recordWin = useCallback((levelId: string, moves: number) => {
    setSave((prev) => {
      const completedSet = new Set(prev.completedLevelIds);
      completedSet.add(levelId);

      const prevBest = prev.bestMoves[levelId] ?? Infinity;
      const bestMoves = { ...prev.bestMoves, [levelId]: Math.min(prevBest, moves) };

      const next: SaveData = {
        ...prev,
        completedLevelIds: [...completedSet],
        bestMoves,
      };
      saveSave(next);
      return next;
    });
  }, []);

  const setLastPlayed = useCallback((id: string) => {
    setSave((prev) => {
      if (prev.lastPlayedLevelId === id) return prev;
      const next: SaveData = { ...prev, lastPlayedLevelId: id };
      saveSave(next);
      return next;
    });
  }, []);

  const resetProgress = useCallback(() => {
    commit(clearSave());
  }, [commit]);

  const pyramidProgress = useCallback(
    (pyramid: Pyramid): PyramidProgress => {
      const ids = pyramidLevelIds(pyramid);
      const completedCount = ids.filter((id) => completed.has(id)).length;
      return {
        // "Reached": has any unlocked level (a completed one or the frontier).
        // Not keyed on the base alone, so a partly-cleared pyramid stays open.
        unlocked: ids.some((id) => unlocked.has(id)),
        completed: ids.length > 0 && completedCount === ids.length,
        completedCount,
        total: ids.length,
      };
    },
    [unlocked, completed],
  );

  return useMemo(
    () => ({
      unlocked,
      completed,
      bestMoves: save.bestMoves,
      currentLevelId,
      isUnlocked,
      recordWin,
      setLastPlayed,
      resetProgress,
      pyramidProgress,
    }),
    [
      unlocked,
      completed,
      save.bestMoves,
      currentLevelId,
      isUnlocked,
      recordWin,
      setLastPlayed,
      resetProgress,
      pyramidProgress,
    ],
  );
}
