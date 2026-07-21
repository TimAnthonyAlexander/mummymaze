import { describe, expect, it } from 'vitest';
import { canPlayerMove, initGame, solveFrom, step } from '../../engine';
import { LEVELS } from '../../levels';

/**
 * Hint correctness: from ANY mid-game state, `solveFrom(state).solution[0]` (what
 * the Hint button highlights) must be a legal next action whose full sequence
 * replays to a win — the guarantee the in-game hint relies on after moves/undos.
 */
describe('hint solver from mid-game states', () => {
  it('returns a legal next move that replays toward a win', () => {
    const level = LEVELS.find((l) => l.id === '03-first-mummy') ?? LEVELS[0];
    const full = solveFrom(initGame(level));
    expect(full.solvable).toBe(true);

    // Advance two turns along the optimal line into a genuine mid-game state.
    let state = initGame(level);
    for (const a of (full.solution ?? []).slice(0, 2)) state = step(state, a);
    expect(state.phase).toBe('player');

    const hint = solveFrom(state);
    expect(hint.solvable).toBe(true);
    expect(hint.solution && hint.solution.length).toBeGreaterThan(0);

    const nextMove = hint.solution![0];
    expect(canPlayerMove(state, nextMove)).toBe(true);

    // Replaying the whole hinted continuation reaches a win.
    let replay = state;
    for (const a of hint.solution!) replay = step(replay, a);
    expect(replay.phase).toBe('won');
  });
});
