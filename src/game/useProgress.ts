/**
 * Progression hook over the localStorage `storage` module.
 *
 * Unlocking follows the PYRAMID progression order (`progressionOrder` /
 * `nextInProgression`) rather than the flat registry order: clearing a level
 * unlocks the next in pyramid order, and a pyramid's apex unlocks the next
 * pyramid's base. The very first level in the progression is ALWAYS unlocked,
 * even if it never made it into the persisted set.
 */
import { useCallback, useMemo, useState } from 'react';
import {
  type Pyramid,
  nextInProgression,
  progressionOrder,
  pyramidLevelIds,
} from '../levels/pyramids';
import { clearSave, loadSave, saveSave, type SaveData } from './storage';

const FIRST_LEVEL_ID = progressionOrder()[0];

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
  isUnlocked: (id: string) => boolean;
  recordWin: (levelId: string, moves: number) => void;
  setLastPlayed: (id: string) => void;
  resetProgress: () => void;
  pyramidProgress: (pyramid: Pyramid) => PyramidProgress;
}

/** Ensure the first level is always part of the unlocked set. */
function withFirstUnlocked(ids: readonly string[]): string[] {
  if (!FIRST_LEVEL_ID || ids.includes(FIRST_LEVEL_ID)) return [...ids];
  return [FIRST_LEVEL_ID, ...ids];
}

export function useProgress(): Progress {
  const [save, setSave] = useState<SaveData>(() => loadSave());

  const commit = useCallback((next: SaveData) => {
    saveSave(next);
    setSave(next);
  }, []);

  const unlocked = useMemo(
    () => new Set(withFirstUnlocked(save.unlockedLevelIds)),
    [save.unlockedLevelIds],
  );
  const completed = useMemo(() => new Set(save.completedLevelIds), [save.completedLevelIds]);

  const isUnlocked = useCallback((id: string) => unlocked.has(id), [unlocked]);

  const recordWin = useCallback((levelId: string, moves: number) => {
    setSave((prev) => {
      const nextId = nextInProgression(levelId);

      const completedSet = new Set(prev.completedLevelIds);
      completedSet.add(levelId);

      const unlockedSet = new Set(withFirstUnlocked(prev.unlockedLevelIds));
      unlockedSet.add(levelId);
      if (nextId) unlockedSet.add(nextId);

      const prevBest = prev.bestMoves[levelId] ?? Infinity;
      const bestMoves = { ...prev.bestMoves, [levelId]: Math.min(prevBest, moves) };

      const next: SaveData = {
        ...prev,
        completedLevelIds: [...completedSet],
        unlockedLevelIds: [...unlockedSet],
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
        unlocked: ids.length > 0 && unlocked.has(ids[0]),
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
      isUnlocked,
      recordWin,
      setLastPlayed,
      resetProgress,
      pyramidProgress,
    ],
  );
}
