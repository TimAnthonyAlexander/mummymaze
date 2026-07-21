/**
 * Debounced live analysis of the editor draft. On every (settled) edit it runs
 * the real engine: `loadLevel` validates, then `solve` + `scoreDifficulty`
 * report solvability, par and difficulty. Any validation failure is surfaced as
 * a user-facing message instead of throwing (error-handling rule).
 */
import { useEffect, useState } from 'react';
import { loadLevel, scoreDifficulty, solve } from '../../engine';
import { toSpec, type EditorState } from './model';

export interface Analysis {
  /** Validation failure message, or null when the level loads. */
  readonly error: string | null;
  readonly solvable: boolean;
  readonly par: number | null;
  readonly statesExplored: number;
  readonly score: number;
}

const EMPTY: Analysis = {
  error: null,
  solvable: false,
  par: null,
  statesExplored: 0,
  score: 0,
};

function analyse(state: EditorState): Analysis {
  if (!state.exit) {
    return { ...EMPTY, error: 'Place an exit on the outer border.' };
  }
  try {
    const level = loadLevel(toSpec(state));
    const solved = solve(level);
    const difficulty = scoreDifficulty(level);
    return {
      error: null,
      solvable: solved.solvable,
      par: solved.solution ? solved.solution.length : null,
      statesExplored: solved.statesExplored,
      score: difficulty.score,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid level';
    return { ...EMPTY, error: message };
  }
}

export function useLevelAnalysis(state: EditorState, delay = 250): Analysis {
  const [result, setResult] = useState<Analysis>(() => analyse(state));

  useEffect(() => {
    const handle = window.setTimeout(() => setResult(analyse(state)), delay);
    return () => window.clearTimeout(handle);
  }, [state, delay]);

  return result;
}
