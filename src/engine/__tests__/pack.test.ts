import { describe, it, expect } from 'vitest';
import { LEVELS } from '../../levels';
import { initGame, step } from '../step';
import { solve } from '../solver';
import { scoreDifficulty } from '../difficulty';
import type { Action } from '../types';

describe('bundled level pack', () => {
  it('has levels', () => {
    expect(LEVELS.length).toBeGreaterThan(0);
  });

  for (const level of LEVELS) {
    it(`"${level.id}" is solvable and its solution replays to a win`, () => {
      const r = solve(level);
      expect(r.solvable).toBe(true);
      expect(r.solution).not.toBeNull();

      let s = initGame(level);
      for (const a of r.solution as Action[]) s = step(s, a);
      expect(s.phase).toBe('won');

      // Declared par matches the shortest solution the solver found.
      expect(level.par).toBe((r.solution as Action[]).length);
    });
  }

  it('difficulty is (weakly) non-decreasing across the pack', () => {
    const scores = LEVELS.map((l) => scoreDifficulty(l).score);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeGreaterThanOrEqual(scores[i - 1]);
    }
  });
});
