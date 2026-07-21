import { describe, it, expect } from 'vitest';
import { loadLevel } from '../level';
import { initGame, step } from '../step';
import { solve, solveFrom } from '../solver';
import type { Action, GameState, Level } from '../types';

function replay(level: Level, sol: Action[]) {
  let s = initGame(level);
  for (const a of sol) s = step(s, a);
  return s;
}

function replayFrom(state: GameState, sol: Action[]) {
  let s = state;
  for (const a of sol) s = step(s, a);
  return s;
}

describe('solve', () => {
  it('finds a shortest solution for a solvable level, and it replays to a win', () => {
    // Open 4x4 maze, no monsters: reaching the exit is a pure pathing puzzle.
    const level = loadLevel({
      id: 't-open',
      name: 'open',
      width: 4,
      height: 4,
      start: { x: 3, y: 3 },
      exit: { x: 0, y: 0, dir: 'N' },
    });

    const r = solve(level);
    expect(r.solvable).toBe(true);
    expect(r.solution).not.toBeNull();

    const end = replay(level, r.solution as Action[]);
    expect(end.phase).toBe('won');
    // BFS returns the shortest line: (3,3)->(0,0) is 6 steps + exit = 7.
    expect((r.solution as Action[]).length).toBe(7);
  });

  it('solves a level that needs a slow scorpion to be out-maneuvered', () => {
    const level = loadLevel({
      id: 't-scorp',
      name: 'scorp',
      width: 5,
      height: 5,
      start: { x: 4, y: 0 },
      exit: { x: 4, y: 0, dir: 'N' },
      monsters: [{ kind: 'scorpion_white', x: 0, y: 4 }],
    });
    const r = solve(level);
    expect(r.solvable).toBe(true);
    expect(replay(level, r.solution as Action[]).phase).toBe('won');
  });

  it('reports an impossible level (open board, fast mummy closer to the exit) as unsolvable', () => {
    // Like the original broken level: a 2-step white mummy on an open board,
    // positioned between the player and the exit, always catches the player.
    const level = loadLevel({
      id: 't-impossible',
      name: 'impossible',
      width: 5,
      height: 5,
      start: { x: 0, y: 4 },
      exit: { x: 4, y: 0, dir: 'N' },
      monsters: [{ kind: 'mummy_white', x: 4, y: 4 }],
    });
    const r = solve(level);
    expect(r.solvable).toBe(false);
    expect(r.solution).toBeNull();
  });
});

describe('solve: forbidCollisions', () => {
  it('is solvable normally but UNSOLVABLE when merges are forbidden (merge-required level)', () => {
    // Two white scorpions box the player in: every winning line requires luring
    // them onto the same tile (destroying one) before escaping. With collisions
    // forbidden there is no win — proving the flag prunes merge-only wins.
    const level = loadLevel({
      id: 't-merge',
      name: 'merge',
      width: 5,
      height: 5,
      start: { x: 0, y: 1 },
      exit: { x: 4, y: 3, dir: 'E' },
      monsters: [
        { kind: 'scorpion_white', x: 3, y: 2 },
        { kind: 'scorpion_white', x: 0, y: 0 },
      ],
    });

    const normal = solve(level);
    expect(normal.solvable).toBe(true);

    // The unconstrained winning line really does destroy a monster.
    const end = replay(level, normal.solution as Action[]);
    expect(end.phase).toBe('won');
    const aliveAtWin = end.monsters.filter((m) => m.alive).length;
    expect(aliveAtWin).toBeLessThan(level.monstersStart.length);

    const noMerge = solve(level, { forbidCollisions: true });
    expect(noMerge.solvable).toBe(false);
    expect(noMerge.solution).toBeNull();
  });

  it('forbidCollisions does not change a level that never needs a merge', () => {
    const level = loadLevel({
      id: 't-scorp2',
      name: 'scorp2',
      width: 5,
      height: 5,
      start: { x: 4, y: 0 },
      exit: { x: 4, y: 0, dir: 'N' },
      monsters: [{ kind: 'scorpion_white', x: 0, y: 4 }],
    });
    expect(solve(level).solvable).toBe(true);
    expect(solve(level, { forbidCollisions: true }).solvable).toBe(true);
  });
});

describe('solveFrom', () => {
  it('returns a valid shortest continuation from a mid-game state that replays to a win', () => {
    const level = loadLevel({
      id: 't-open2',
      name: 'open2',
      width: 4,
      height: 4,
      start: { x: 3, y: 3 },
      exit: { x: 0, y: 0, dir: 'N' },
    });

    const full = solve(level);
    expect(full.solvable).toBe(true);
    const sol = full.solution as Action[];

    // Advance a few moves into the game, then solve the remainder.
    const mid = replay(level, sol.slice(0, 3));
    expect(mid.phase).toBe('player');

    const cont = solveFrom(mid);
    expect(cont.solvable).toBe(true);
    expect(cont.solution).not.toBeNull();

    // The continuation replays from the mid state to a win...
    const end = replayFrom(mid, cont.solution as Action[]);
    expect(end.phase).toBe('won');
    // ...and it is the shortest remainder (prefix length + remainder == par).
    expect(3 + (cont.solution as Action[]).length).toBe(sol.length);
  });
});
