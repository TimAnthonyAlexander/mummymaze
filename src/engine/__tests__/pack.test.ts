import { describe, it, expect } from 'vitest';
import { LEVELS } from '../../levels';
import { PYRAMIDS } from '../../levels/pyramids';
import { initGame, step } from '../step';
import { solve } from '../solver';
import { scoreDifficulty } from '../difficulty';
import {
  beelineTest,
  nearestMonsterDistance,
  monsterOnBeeline,
} from '../generator';
import type { Action } from '../types';

/**
 * With a large pack (170 levels / 17 pyramids), fully solving EVERY level on
 * every test run is far too slow. Instead we verify the pack invariants on a
 * representative SAMPLE — the base and apex of every pyramid plus a fixed
 * pseudo-random subset — which is fast yet still exercises the full difficulty
 * range. (The generator script fully verifies every level at build time; this
 * suite guards against regressions.)
 */
const PYRAMID_SIZE = 10;
const EXPECTED_LEVELS = 170;
const EXPECTED_PYRAMIDS = 17;

/** Deterministic seeded PRNG (mulberry32) for the reproducible subset. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Global registry index of a level id. */
function indexOfId(id: string): number {
  return LEVELS.findIndex((l) => l.id === id);
}

/** Sample indices: base + apex of every pyramid, plus a fixed random subset. */
const SAMPLE_INDICES: number[] = (() => {
  const s = new Set<number>();
  for (const p of PYRAMIDS) {
    const flat = p.rows.flat();
    if (flat.length === 0) continue;
    s.add(indexOfId(flat[0])); // base (lowest par)
    s.add(indexOfId(flat[flat.length - 1])); // apex (highest par)
  }
  const rand = mulberry32(0x51a7ed);
  for (let i = 0; i < 12; i++) s.add(Math.floor(rand() * LEVELS.length));
  return [...s].filter((i) => i >= 0).sort((a, b) => a - b);
})();

describe('bundled level pack', () => {
  it(`has the full ${EXPECTED_LEVELS}-level, ${EXPECTED_PYRAMIDS}-pyramid pack`, () => {
    expect(LEVELS.length).toBe(EXPECTED_LEVELS);
    expect(PYRAMIDS.length).toBe(EXPECTED_PYRAMIDS);
    for (const p of PYRAMIDS) {
      expect(p.rows.flat().length).toBe(PYRAMID_SIZE);
    }
  });

  for (const idx of SAMPLE_INDICES) {
    const level = LEVELS[idx];
    it(`sample "${level.id}" (index ${idx}) is solvable and replays to a win`, () => {
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
  for (const idx of SAMPLE_INDICES) {
    const level = LEVELS[idx];
    it(`sample "${level.id}" (index ${idx}) passes the curriculum filters`, () => {
      // Real maneuvering, not a straight shot to the exit.
      expect(level.par).toBeGreaterThan(
        Math.abs(level.start.x - level.exit.pos.x) + Math.abs(level.start.y - level.exit.pos.y),
      );

      // Enemies start close (or on the beeline path): no far-corner idlers.
      const nearest = nearestMonsterDistance(level);
      const maxDim = Math.max(level.width, level.height);
      const proximityOk = nearest <= Math.ceil(maxDim / 2) || monsterOnBeeline(level);
      expect(proximityOk).toBe(true);

      // Anti-trivial: from level #3 on, the naive beeline player must LOSE.
      const beeline = beelineTest(level);
      if (idx >= 2) {
        expect(beeline.win).toBe(false);
      } else if (idx === 0) {
        if (beeline.win) expect(beeline.minMonsterDist).toBeLessThanOrEqual(1);
      } else {
        expect(beeline.win).toBe(false);
      }

      // Merge policy: levels 1-6 (idx <= 5) must be winnable WITHOUT any merge.
      if (idx <= 5 && level.monstersStart.length >= 2) {
        const noMerge = solve(level, { forbidCollisions: true });
        expect(noMerge.solvable).toBe(true);
      }
    });
  }
});

describe('difficulty ramp', () => {
  it('every advanced level tops the hand-authored teaching levels', () => {
    // A small flood cap keeps this fast; it clamps the reachable-states term but
    // advanced levels still clear the teaching ceiling by a wide margin.
    const CAP = 30_000;
    const handMax = Math.max(...LEVELS.slice(0, 9).map((l) => scoreDifficulty(l, CAP).score));
    for (const idx of SAMPLE_INDICES) {
      if (idx < 9) continue;
      const score = scoreDifficulty(LEVELS[idx], CAP).score;
      expect(score).toBeGreaterThanOrEqual(handMax);
    }
  });
});
