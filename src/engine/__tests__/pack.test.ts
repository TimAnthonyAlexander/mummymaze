import { describe, it, expect } from 'vitest';
import { LEVELS } from '../../levels';
import { initGame, step } from '../step';
import { solve } from '../solver';
import { scoreDifficulty } from '../difficulty';
import { curriculumCheck } from '../generator';
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
});

describe('curriculum quality filters (anti-trivial)', () => {
  for (let i = 0; i < LEVELS.length; i++) {
    const level = LEVELS[i];
    const idx = i;
    it(`"${level.id}" passes the curriculum filters for index ${idx}`, () => {
      const c = curriculumCheck(level);

      // Solvable, with real maneuvering (not a straight shot to the exit).
      expect(c.solvable).toBe(true);
      expect(c.par).not.toBeNull();
      expect(c.par as number).toBeGreaterThan(c.manhattan);

      // Enemies must start close (or on the beeline path): no far-corner idlers.
      expect(c.proximityOk).toBe(true);

      // Anti-trivial: from level #3 on, the naive beeline player must LOSE.
      if (idx >= 2) {
        expect(c.beeline.win).toBe(false);
      } else if (idx === 0) {
        // Level 1: a beeline win is tolerated only under real threat (<=1 tile).
        if (c.beeline.win) expect(c.beeline.minMonsterDist).toBeLessThanOrEqual(1);
      } else {
        // Level 2 must also defeat the beeliner.
        expect(c.beeline.win).toBe(false);
      }

      // Merge policy: levels 1-6 must be winnable WITHOUT any monster merge.
      if (idx <= 5) expect(c.mergeRequired).toBe(false);
    });
  }
});

describe('difficulty ramp', () => {
  it('the generated tail rises and tops the hand-authored teaching levels', () => {
    // The first nine levels are ordered by MECHANIC (teaching), not strictly by
    // difficulty; the generated tail (index >= 9) must be non-decreasing and at
    // least as hard as the hardest hand-authored level.
    const scores = LEVELS.map((l) => scoreDifficulty(l).score);
    const handMax = Math.max(...scores.slice(0, 9));
    for (let i = 9; i < scores.length; i++) {
      expect(scores[i]).toBeGreaterThanOrEqual(handMax);
      if (i > 9) expect(scores[i]).toBeGreaterThanOrEqual(scores[i - 1]);
    }
  });
});
