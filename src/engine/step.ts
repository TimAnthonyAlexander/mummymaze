/**
 * Turn orchestration and win/lose resolution. Pure: `step` returns a NEW
 * GameState and never mutates its input.
 *
 * Turn order:
 *   1. player action (move or wait)
 *   2. post-player checks: exit -> win, trap -> lose, walked-into-monster -> lose
 *   3. monster phase: each monster takes its full move, in fixed order, with
 *      checks after every single step (caught / collision / key)
 *   4. post-monster checks
 *
 * `stepWithTrace` runs the identical resolution but also records an ordered
 * list of single-tile events (player hop, each monster sub-step, kills, gate
 * toggles, the exit walk-out) so the UI can animate the turn one hop at a time
 * instead of teleporting sprites to their final tiles. `step` records nothing,
 * keeping the solver's hot path allocation-free.
 */
import { canCross, inBounds, neighbor, samePos } from './board';
import { monsterStep, stepsPerTurn } from './monsters';
import type { Action, Dir, GameState, Level, Monster, Pos } from './types';

/** One monster or the player hopping a single tile. */
export interface TraceMove {
  readonly kind: 'move';
  readonly actor: 'player' | string; // 'player' or a monster id
  readonly from: Pos;
  readonly to: Pos;
  /**
   * Simultaneity tick for animation. The player's hop is round 0; a monster's
   * s-th sub-step (0-indexed) is round s+1. The UI batches all hops sharing a
   * round so every monster steps at the same time (mummies twice, scorpions
   * once), while the engine still RESOLVES them sequentially for collisions.
   */
  readonly round: number;
}
/** Gates toggled (by a key) — new open map after the toggle. */
export interface TraceGate {
  readonly kind: 'gate';
  readonly gatesOpen: Readonly<Record<string, boolean>>;
}
/** A monster was destroyed in a collision. */
export interface TraceKill {
  readonly kind: 'kill';
  readonly actor: string; // monster id removed
}
/** The player walks out through the exit opening (a few tiles beyond the wall). */
export interface TraceExit {
  readonly kind: 'exit';
  readonly from: Pos;
  readonly path: readonly Pos[];
}
export type TraceEvent = TraceMove | TraceGate | TraceKill | TraceExit;

export interface StepResult {
  readonly state: GameState;
  readonly trace: TraceEvent[];
}

export function initGame(level: Level): GameState {
  const gatesOpen: Record<string, boolean> = {};
  for (const g of level.gates) gatesOpen[g.id] = g.startOpen;
  return {
    level,
    player: level.start,
    monsters: level.monstersStart.map((m) => ({ ...m })),
    gatesOpen,
    phase: 'player',
    turn: 0,
    moveCount: 0,
  };
}

function cellAt(level: Level, pos: Pos) {
  return level.cells[pos.y][pos.x];
}

function isExitMove(state: GameState, dir: Action): boolean {
  return (
    dir !== 'wait' &&
    samePos(state.player, state.level.exit.pos) &&
    state.level.exit.dir === dir
  );
}

/** Can the player legally move in `dir` this turn (ignoring win/lose)? */
export function canPlayerMove(state: GameState, dir: Action): boolean {
  if (dir === 'wait') return true;
  if (isExitMove(state, dir)) return true;
  return canCross(state.level, state.gatesOpen, state.player, dir);
}

function toggleAllGates(
  open: Readonly<Record<string, boolean>>,
): Record<string, boolean> {
  const next: Record<string, boolean> = {};
  for (const id of Object.keys(open)) next[id] = !open[id];
  return next;
}

function aliveMonsterIndexAt(
  monsters: readonly Monster[],
  pos: Pos,
  exclude: number,
): number {
  for (let i = 0; i < monsters.length; i++) {
    if (i === exclude) continue;
    if (monsters[i].alive && samePos(monsters[i].pos, pos)) return i;
  }
  return -1;
}

/**
 * Core resolver. When `trace` is non-null it records the turn's single-tile
 * events; otherwise it runs allocation-light for the solver. Behavior (the
 * returned state) is identical either way.
 */
function run(state: GameState, action: Action, trace: TraceEvent[] | null): GameState {
  if (state.phase !== 'player') return state;

  // --- Player phase ---
  if (isExitMove(state, action)) {
    if (trace) {
      const dir = action as Dir;
      const p1 = neighbor(state.player, dir);
      const p2 = neighbor(p1, dir);
      trace.push({ kind: 'exit', from: state.player, path: [p1, p2] });
    }
    return { ...state, phase: 'won', moveCount: state.moveCount + 1, turn: state.turn + 1 };
  }
  // Moving into a wall, the border, or a closed gate wastes the turn exactly
  // like a wait: the player stays put, but the monsters still take their move.
  // This is tactically useful (bait a monster without giving ground) and means
  // wall-bumps are no longer a free probe.
  const blocked = action !== 'wait' && !canPlayerMove(state, action);
  const effective: Action = blocked ? 'wait' : action;

  const player: Pos =
    effective === 'wait' ? state.player : neighbor(state.player, effective);
  if (trace && effective !== 'wait') {
    trace.push({ kind: 'move', actor: 'player', from: state.player, to: player, round: 0 });
  }

  let gatesOpen = state.gatesOpen;
  // Entering a key tile toggles all gates (waiting does not re-trigger).
  if (effective !== 'wait' && cellAt(state.level, player).key) {
    gatesOpen = toggleAllGates(gatesOpen);
    if (trace) trace.push({ kind: 'gate', gatesOpen });
  }

  // Post-player checks.
  if (cellAt(state.level, player).trap) {
    return { ...state, player, gatesOpen, phase: 'lost', lossReason: 'trap' };
  }
  if (aliveMonsterIndexAt(state.monsters, player, -1) !== -1) {
    return {
      ...state,
      player,
      gatesOpen,
      phase: 'lost',
      lossReason: 'walked-into-monster',
    };
  }

  // --- Monster phase ---
  const monsters: Monster[] = state.monsters.map((m) => ({ ...m }));
  let caught = false;

  for (let i = 0; i < monsters.length && !caught; i++) {
    const steps = stepsPerTurn(monsters[i].kind);
    for (let s = 0; s < steps; s++) {
      if (!monsters[i].alive) break;
      const from = monsters[i].pos;
      const nextPos = monsterStep(state.level, gatesOpen, monsters[i].kind, from, player);
      if (samePos(nextPos, from)) continue; // blocked; step wasted

      monsters[i] = { ...monsters[i], pos: nextPos };
      if (trace) trace.push({ kind: 'move', actor: monsters[i].id, from, to: nextPos, round: s + 1 });

      // Key toggle.
      if (cellAt(state.level, nextPos).key) {
        gatesOpen = toggleAllGates(gatesOpen);
        if (trace) trace.push({ kind: 'gate', gatesOpen });
      }
      // Collision: moving monster survives, other is destroyed.
      const other = aliveMonsterIndexAt(monsters, nextPos, i);
      if (other !== -1) {
        monsters[other] = { ...monsters[other], alive: false };
        if (trace) trace.push({ kind: 'kill', actor: monsters[other].id });
      }
      // Caught the player?
      if (samePos(nextPos, player)) {
        caught = true;
        break;
      }
    }
  }

  if (caught) {
    return {
      ...state,
      player,
      monsters,
      gatesOpen,
      phase: 'lost',
      lossReason: 'caught',
      moveCount: state.moveCount + 1,
      turn: state.turn + 1,
    };
  }

  return {
    ...state,
    player,
    monsters,
    gatesOpen,
    phase: 'player',
    moveCount: state.moveCount + 1,
    turn: state.turn + 1,
  };
}

/**
 * The single transition function. Illegal moves are a no-op (state returned
 * unchanged, no turn consumed) so the UI can rely on it defensively.
 */
export function step(state: GameState, action: Action): GameState {
  return run(state, action, null);
}

/** Same resolution as `step`, plus an ordered trace of single-tile events. */
export function stepWithTrace(state: GameState, action: Action): StepResult {
  const trace: TraceEvent[] = [];
  const next = run(state, action, trace);
  return { state: next, trace };
}

/** Convenience for tests/tools. */
export { inBounds };
