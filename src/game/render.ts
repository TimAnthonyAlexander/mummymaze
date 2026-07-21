/**
 * RenderState is what the Board draws. It is decoupled from GameState so the
 * animation layer can show intermediate, single-tile positions during a turn
 * (mummies stepping one square at a time, the player walking out the exit)
 * while the authoritative engine state jumps straight to the turn's result.
 */
import type { GameState, MonsterKind, Pos } from '../engine';

export interface RenderMonster {
  readonly id: string;
  readonly kind: MonsterKind;
  readonly pos: Pos;
  readonly alive: boolean;
}

export interface RenderState {
  readonly player: Pos;
  /** 0..1 — used to fade the explorer out as they walk through the exit. */
  readonly playerOpacity: number;
  readonly monsters: readonly RenderMonster[];
  readonly gatesOpen: Readonly<Record<string, boolean>>;
}

/** Snapshot a committed engine state into a render state (all sprites settled). */
export function toRender(s: GameState): RenderState {
  return {
    player: s.player,
    playerOpacity: 1,
    monsters: s.monsters.map((m) => ({
      id: m.id,
      kind: m.kind,
      pos: m.pos,
      alive: m.alive,
    })),
    gatesOpen: { ...s.gatesOpen },
  };
}
