/**
 * Progression hook over the localStorage `storage` module.
 *
 * Level 1 (LEVELS[0].id) is ALWAYS unlocked, even if it never made it into the
 * persisted set. Winning a level marks it completed, unlocks the next level via
 * `nextLevelId`, and records the fewest moves to win (min).
 */
import { useCallback, useMemo, useState } from 'react';
import { LEVELS, nextLevelId } from '../levels';
import { clearSave, loadSave, saveSave, type SaveData } from './storage';

const FIRST_LEVEL_ID = LEVELS[0]?.id;

export interface Progress {
  unlocked: Set<string>;
  completed: Set<string>;
  bestMoves: Record<string, number>;
  isUnlocked: (id: string) => boolean;
  recordWin: (levelId: string, moves: number) => void;
  setLastPlayed: (id: string) => void;
  resetProgress: () => void;
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

  const recordWin = useCallback(
    (levelId: string, moves: number) => {
      setSave((prev) => {
        const nextId = nextLevelId(levelId);

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
    },
    [],
  );

  const setLastPlayed = useCallback(
    (id: string) => {
      setSave((prev) => {
        if (prev.lastPlayedLevelId === id) return prev;
        const next: SaveData = { ...prev, lastPlayedLevelId: id };
        saveSave(next);
        return next;
      });
    },
    [],
  );

  const resetProgress = useCallback(() => {
    commit(clearSave());
  }, [commit]);

  return useMemo(
    () => ({
      unlocked,
      completed,
      bestMoves: save.bestMoves,
      isUnlocked,
      recordWin,
      setLastPlayed,
      resetProgress,
    }),
    [unlocked, completed, save.bestMoves, isUnlocked, recordWin, setLastPlayed, resetProgress],
  );
}
