import { describe, it, expect } from 'vitest';
import { loadLevel } from '../level';
import { initGame, step } from '../step';

describe('step: win / lose resolution', () => {
  it('wins when stepping through the exit', () => {
    const level = loadLevel({
      id: 'w',
      name: 'w',
      width: 3,
      height: 3,
      start: { x: 0, y: 0 },
      exit: { x: 0, y: 0, dir: 'N' },
    });
    const s = step(initGame(level), 'N');
    expect(s.phase).toBe('won');
  });

  it('loses when stepping onto a trap', () => {
    const level = loadLevel({
      id: 'trap',
      name: 'trap',
      width: 3,
      height: 3,
      start: { x: 0, y: 0 },
      exit: { x: 2, y: 0, dir: 'N' },
      traps: [{ x: 0, y: 1 }],
    });
    const s = step(initGame(level), 'S');
    expect(s.phase).toBe('lost');
    expect(s.lossReason).toBe('trap');
  });

  it('loses when walking into a monster during the player phase', () => {
    const level = loadLevel({
      id: 'walk',
      name: 'walk',
      width: 3,
      height: 3,
      start: { x: 0, y: 0 },
      exit: { x: 2, y: 0, dir: 'N' },
      monsters: [{ kind: 'scorpion_white', x: 1, y: 0 }],
    });
    const s = step(initGame(level), 'E');
    expect(s.phase).toBe('lost');
    expect(s.lossReason).toBe('walked-into-monster');
  });

  it('loses when caught during the monster phase', () => {
    // Player at (2,0), white mummy at (0,0): waiting lets it step E,E onto (2,0).
    const level = loadLevel({
      id: 'caught',
      name: 'caught',
      width: 5,
      height: 5,
      start: { x: 2, y: 0 },
      exit: { x: 4, y: 4, dir: 'S' },
      monsters: [{ kind: 'mummy_white', x: 0, y: 0 }],
    });
    const s = step(initGame(level), 'wait');
    expect(s.phase).toBe('lost');
    expect(s.lossReason).toBe('caught');
  });

  it('two mummies colliding leaves exactly one alive', () => {
    // A at (0,0) and B at (4,0) both chase the player at (2,4); they converge on
    // (2,0). B (the moving monster at the moment of collision) survives.
    const level = loadLevel({
      id: 'collide',
      name: 'collide',
      width: 5,
      height: 5,
      start: { x: 2, y: 4 },
      exit: { x: 2, y: 4, dir: 'S' },
      monsters: [
        { kind: 'mummy_white', x: 0, y: 0 },
        { kind: 'mummy_white', x: 4, y: 0 },
      ],
    });
    const s = step(initGame(level), 'wait');
    const alive = s.monsters.filter((m) => m.alive);
    expect(alive.length).toBe(1);
    expect(alive[0].pos).toEqual({ x: 2, y: 0 });
  });

  it('stepping on a key toggles all gates', () => {
    const level = loadLevel({
      id: 'key',
      name: 'key',
      width: 3,
      height: 3,
      start: { x: 0, y: 0 },
      exit: { x: 2, y: 0, dir: 'N' },
      keys: [{ x: 1, y: 0 }],
      gates: [{ x: 2, y: 1, dir: 'S', open: false }],
    });
    const g0 = initGame(level);
    const gateId = Object.keys(g0.gatesOpen)[0];
    expect(g0.gatesOpen[gateId]).toBe(false);

    const s = step(g0, 'E'); // step onto the key tile
    expect(s.gatesOpen[gateId]).toBe(true);
  });

  it('moving into a wall wastes the turn like a wait: player stays, monsters move', () => {
    // Player at (1,1); W into the border is blocked. A white mummy at (4,1)
    // should advance whether the player waits or bumps the wall.
    const level = loadLevel({
      id: 'bump',
      name: 'bump',
      width: 5,
      height: 5,
      start: { x: 0, y: 1 },
      exit: { x: 4, y: 4, dir: 'S' },
      monsters: [{ kind: 'mummy_white', x: 4, y: 1 }],
    });
    const s0 = initGame(level);

    const bumped = step(s0, 'W'); // W is the border — blocked
    const waited = step(s0, 'wait');

    // Not a no-op any more: the turn advanced and the monster moved.
    expect(bumped).not.toBe(s0);
    expect(bumped.player).toEqual(s0.player); // player did not move
    expect(bumped.moveCount).toBe(1);
    expect(bumped.monsters[0].pos).toEqual(waited.monsters[0].pos);
  });

  it('a wall-bump and a wait are equivalent transitions', () => {
    const level = loadLevel({
      id: 'equiv',
      name: 'equiv',
      width: 5,
      height: 5,
      start: { x: 0, y: 2 },
      exit: { x: 4, y: 4, dir: 'S' },
      monsters: [{ kind: 'mummy_red', x: 3, y: 4 }],
    });
    const s0 = initGame(level);
    const bumped = step(s0, 'W');
    const waited = step(s0, 'wait');
    expect(bumped.player).toEqual(waited.player);
    expect(bumped.monsters.map((m) => m.pos)).toEqual(waited.monsters.map((m) => m.pos));
    expect(bumped.phase).toBe(waited.phase);
  });
});
