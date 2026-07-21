import { describe, it, expect } from 'vitest';
import { loadLevel } from '../level';
import { monsterStep } from '../monsters';
import type { EdgeSpec } from '../level';
import type { MonsterKind, Pos } from '../types';

/** Build a 5x5 level with the given interior walls; monsterStep ignores start. */
function board(walls: EdgeSpec[] = []) {
  return loadLevel({
    id: 't',
    name: 't',
    width: 5,
    height: 5,
    start: { x: 0, y: 0 },
    exit: { x: 0, y: 0, dir: 'N' },
    walls,
  });
}

interface Case {
  name: string;
  kind: MonsterKind;
  from: Pos;
  player: Pos;
  walls?: EdgeSpec[];
  expected: Pos;
}

const cases: Case[] = [
  {
    name: 'white chases horizontally first (same row, east)',
    kind: 'mummy_white',
    from: { x: 2, y: 2 },
    player: { x: 4, y: 2 },
    expected: { x: 3, y: 2 },
  },
  {
    name: 'white prefers horizontal even when diagonal (NE)',
    kind: 'mummy_white',
    from: { x: 2, y: 2 },
    player: { x: 4, y: 0 },
    expected: { x: 3, y: 2 }, // E
  },
  {
    name: 'red prefers vertical when diagonal (NE)',
    kind: 'mummy_red',
    from: { x: 2, y: 2 },
    player: { x: 4, y: 0 },
    expected: { x: 2, y: 1 }, // N
  },
  {
    name: 'white falls back to vertical when horizontal is wall-blocked',
    kind: 'mummy_white',
    from: { x: 2, y: 2 },
    player: { x: 4, y: 0 },
    walls: [{ x: 2, y: 2, dir: 'E' }],
    expected: { x: 2, y: 1 }, // N (fallback)
  },
  {
    name: 'red falls back to horizontal when vertical is wall-blocked',
    kind: 'mummy_red',
    from: { x: 2, y: 2 },
    player: { x: 4, y: 0 },
    walls: [{ x: 2, y: 2, dir: 'N' }],
    expected: { x: 3, y: 2 }, // E (fallback)
  },
  {
    name: 'fully blocked toward player => stays put',
    kind: 'mummy_white',
    from: { x: 2, y: 2 },
    player: { x: 4, y: 0 },
    walls: [
      { x: 2, y: 2, dir: 'E' },
      { x: 2, y: 2, dir: 'N' },
    ],
    expected: { x: 2, y: 2 }, // both axes blocked
  },
  {
    name: 'scorpion_white uses the same rule as white mummy (one step)',
    kind: 'scorpion_white',
    from: { x: 1, y: 3 },
    player: { x: 3, y: 1 },
    expected: { x: 2, y: 3 }, // E
  },
];

describe('monsterStep pursuit', () => {
  for (const c of cases) {
    it(c.name, () => {
      const level = board(c.walls);
      const next = monsterStep(level, {}, c.kind, c.from, c.player);
      expect(next).toEqual(c.expected);
    });
  }
});
