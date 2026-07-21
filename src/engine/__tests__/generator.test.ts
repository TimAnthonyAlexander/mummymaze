import { describe, it, expect } from 'vitest';
import { loadLevel } from '../level';
import {
  beelineTest,
  nearestMonsterDistance,
  monsterOnBeeline,
  curriculumCheck,
  curriculumFailures,
} from '../generator';

describe('beelineTest', () => {
  it('a naive walk WINS an open board with no threat', () => {
    const level = loadLevel({
      id: 'open',
      name: 'open',
      width: 5,
      height: 5,
      start: { x: 4, y: 4 },
      exit: { x: 0, y: 0, dir: 'N' },
    });
    const b = beelineTest(level);
    expect(b.win).toBe(true);
    expect(b.reason).toBe('won');
    expect(b.minMonsterDist).toBe(Infinity); // no monsters
  });

  it('a naive walk LOSES when a fast mummy intercepts it', () => {
    // The chase teaching level: beelining straight to the exit gets you caught.
    const level = loadLevel({
      id: 'chase',
      name: 'chase',
      width: 6,
      height: 6,
      start: { x: 0, y: 4 },
      exit: { x: 1, y: 5, dir: 'S' },
      monsters: [{ kind: 'mummy_white', x: 1, y: 2 }],
    });
    const b = beelineTest(level);
    expect(b.win).toBe(false);
    expect(b.minMonsterDist).toBeLessThanOrEqual(1); // it really got close
  });

  it('reports no-path when a closed gate blocks the greedy route', () => {
    const level = loadLevel({
      id: 'locked',
      name: 'locked',
      width: 6,
      height: 6,
      start: { x: 1, y: 1 },
      exit: { x: 0, y: 0, dir: 'N' },
      walls: [{ x: 0, y: 0, dir: 'E' }],
      gates: [{ x: 0, y: 0, dir: 'S', open: false }],
      keys: [{ x: 0, y: 1 }],
    });
    const b = beelineTest(level);
    expect(b.win).toBe(false);
    expect(b.reason).toBe('no-path');
    expect(b.pathLen).toBeNull();
  });
});

describe('threat proximity helpers', () => {
  it('nearestMonsterDistance is the open-edge path length to the closest monster', () => {
    const level = loadLevel({
      id: 'near',
      name: 'near',
      width: 5,
      height: 5,
      start: { x: 0, y: 0 },
      exit: { x: 4, y: 4, dir: 'S' },
      monsters: [
        { kind: 'scorpion_white', x: 0, y: 3 }, // dist 3
        { kind: 'scorpion_white', x: 4, y: 4 }, // dist 8
      ],
    });
    expect(nearestMonsterDistance(level)).toBe(3);
  });

  it('monsterOnBeeline detects a monster sitting on the shortest exit path', () => {
    const level = loadLevel({
      id: 'onpath',
      name: 'onpath',
      width: 5,
      height: 1,
      start: { x: 0, y: 0 },
      exit: { x: 4, y: 0, dir: 'E' },
      monsters: [{ kind: 'scorpion_white', x: 2, y: 0 }],
    });
    expect(monsterOnBeeline(level)).toBe(true);
  });
});

describe('curriculumFailures', () => {
  it('rejects a trivial far-corner level (beeline wins, enemy idle)', () => {
    const level = loadLevel({
      id: 'trivial',
      name: 'trivial',
      width: 8,
      height: 8,
      start: { x: 0, y: 0 },
      exit: { x: 1, y: 0, dir: 'N' },
      monsters: [{ kind: 'scorpion_white', x: 7, y: 7 }],
    });
    const fails = curriculumFailures(level, 2, true);
    expect(fails.length).toBeGreaterThan(0);
    expect(fails.some((f) => f.includes('beeline'))).toBe(true);
    const c = curriculumCheck(level);
    expect(c.beeline.win).toBe(true);
    expect(c.proximityOk).toBe(false);
  });

  it('accepts a genuine close-and-threatening teaching level', () => {
    const level = loadLevel({
      id: 'good',
      name: 'good',
      width: 6,
      height: 6,
      start: { x: 0, y: 4 },
      exit: { x: 1, y: 5, dir: 'S' },
      monsters: [{ kind: 'mummy_white', x: 1, y: 2 }],
    });
    expect(curriculumFailures(level, 2, true)).toEqual([]);
  });
});
