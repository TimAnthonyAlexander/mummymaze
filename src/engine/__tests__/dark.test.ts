import { describe, expect, it } from 'vitest';
import {
  type Action,
  type GameState,
  type Level,
  type LevelSpec,
  initGame,
  loadLevel,
  solve,
  step,
  stepWithTrace,
} from '../index';
import { LEVELS } from '../../levels';

/**
 * A small solvable fixture with one fast mummy. The exact layout does not matter
 * — the point is that adding `dark` changes NOTHING the engine computes.
 */
const BASE: LevelSpec = {
  id: 'dark-fixture',
  name: 'Dark Fixture',
  width: 6,
  height: 6,
  start: { x: 0, y: 5 },
  exit: { x: 0, y: 0, dir: 'W' },
  monsters: [{ kind: 'mummy_white', x: 5, y: 0 }],
};

/** Compare the parts of two states the engine is responsible for. */
function sameState(a: GameState, b: GameState) {
  expect(a.player).toEqual(b.player);
  expect(a.monsters).toEqual(b.monsters);
  expect(a.gatesOpen).toEqual(b.gatesOpen);
  expect(a.phase).toBe(b.phase);
  expect(a.turn).toBe(b.turn);
  expect(a.moveCount).toBe(b.moveCount);
  expect(a.lossReason).toBe(b.lossReason);
}

describe('dark loader validation', () => {
  it('accepts a valid dark config and exposes it on the level', () => {
    const lvl = loadLevel({ ...BASE, dark: { radius: 2 } });
    expect(lvl.dark).toEqual({ radius: 2 });
  });

  it('leaves dark undefined when not specified', () => {
    expect(loadLevel(BASE).dark).toBeUndefined();
  });

  it('rejects a non-positive or non-finite radius', () => {
    expect(() => loadLevel({ ...BASE, dark: { radius: 0 } })).toThrow(/dark\.radius/);
    expect(() => loadLevel({ ...BASE, dark: { radius: -3 } })).toThrow(/dark\.radius/);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => loadLevel({ ...BASE, dark: { radius: Infinity } as any })).toThrow(/dark\.radius/);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => loadLevel({ ...BASE, dark: { radius: 'x' } as any })).toThrow(/dark\.radius/);
  });
});

describe('darkness is view-only — the simulation is identical (SPEC §2.7, §7.6)', () => {
  // A real, guaranteed-solvable dark level from the pack, and its lit twin
  // (same layout, darkness stripped). The engine must treat them identically.
  const dark = LEVELS.find((l) => l.dark) as Level;
  const lit: Level = { ...dark, dark: undefined };

  it('has a dark level in the pack to test against', () => {
    expect(dark).toBeDefined();
    expect(dark.dark?.radius).toBeGreaterThan(0);
    expect(lit.dark).toBeUndefined();
  });

  it('produces the same (solvable) solver result for the dark twin as the lit twin', () => {
    const a = solve(lit);
    const b = solve(dark);
    expect(a.solvable).toBe(true);
    expect(b.solvable).toBe(true);
    expect(b.solution).toEqual(a.solution);
  });

  it('every step() transition matches between lit and dark twins', () => {
    // Drive both with the lit level's own winning solution.
    const actions = solve(lit).solution as Action[];
    let sa = initGame(lit);
    let sb = initGame(dark);
    sameState(sa, sb);
    for (const action of actions) {
      sa = step(sa, action);
      sb = step(sb, action);
      sameState(sa, sb);
    }
    expect(sa.phase).toBe('won');
    expect(sb.phase).toBe('won');
  });

  it('produces identical single-tile traces (what the animation plays)', () => {
    const actions = solve(lit).solution as Action[];
    let sa = initGame(lit);
    let sb = initGame(dark);
    for (const action of actions) {
      const ra = stepWithTrace(sa, action);
      const rb = stepWithTrace(sb, action);
      expect(rb.trace).toEqual(ra.trace);
      sa = ra.state;
      sb = rb.state;
    }
  });
});
