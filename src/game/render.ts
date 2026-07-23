/**
 * RenderState is what the Board draws. It is decoupled from GameState so the
 * animation layer can show intermediate, single-tile positions during a turn
 * (mummies stepping one square at a time, the player walking out the exit)
 * while the authoritative engine state jumps straight to the turn's result.
 */
import type { Dir, GameState, MonsterKind, Pos } from '../engine';

/** Transient per-monster visual effect played during a turn (never in engine state). */
export type MonsterFx = 'knockout' | 'recoil';

export interface RenderMonster {
  readonly id: string;
  readonly kind: MonsterKind;
  readonly pos: Pos;
  readonly alive: boolean;
  /**
   * Collision animation flag. `knockout` = the destroyed monster squashing and
   * fading before removal; `recoil` = the survivor's brief impact pulse. Cleared
   * (undefined) on any settled snapshot.
   */
  readonly fx?: MonsterFx;
}

/** A short-lived dust cloud kicked up where two monsters crashed together. */
export interface CrashPuff {
  readonly id: string;
  readonly pos: Pos;
}

/**
 * The one-time spawn-in intro sequence:
 *   'dark'   — full black curtain while the explorer walks in.
 *   'reveal' — the curtain lifts; the board lights up with the enemy tiles still
 *              sunk as dark pits (enemies underground).
 *   'rise'   — the enemy tiles + their enemies ride up out of the floor.
 *   'turn'   — the risen enemies whip around to face the player (scare sting).
 * `null` once settled into normal play.
 */
export type SpawnPhase = 'dark' | 'reveal' | 'rise' | 'turn';

/**
 * The trapdoor death on a skull tile — the inverse of the spawn-in elevator:
 * instead of an enemy riding up out of a pit, the floor gives way under the
 * explorer and he drops into it.
 *   'open' — the two leaves swing down; the explorer is still standing on them.
 *   'fall' — the explorer drops through the open hole into the dark.
 *   'gone' — he is gone; the empty shaft is held open under the lose panel.
 * `null` whenever no trapdoor is open (every settled snapshot).
 */
export type TrapdoorPhase = 'open' | 'fall' | 'gone';

export interface TrapdoorFx {
  readonly pos: Pos;
  readonly phase: TrapdoorPhase;
}

export interface RenderState {
  readonly player: Pos;
  /** Direction the explorer sprite faces (its last move); defaults to south. */
  readonly playerFacing: Dir;
  /** 0..1 — used to fade the explorer out as they walk through the exit. */
  readonly playerOpacity: number;
  readonly monsters: readonly RenderMonster[];
  readonly gatesOpen: Readonly<Record<string, boolean>>;
  /** Active crash dust puffs (view-only; empty on a settled snapshot). */
  readonly puffs: readonly CrashPuff[];
  /** Spawn intro overlay phase, or null when not intro-ing (a settled board). */
  readonly spawn: SpawnPhase | null;
  /** Open trapdoor + falling explorer (view-only; null on a settled snapshot). */
  readonly trapdoor: TrapdoorFx | null;
}

/** Snapshot a committed engine state into a render state (all sprites settled). */
export function toRender(s: GameState): RenderState {
  return {
    player: s.player,
    playerFacing: 'S',
    playerOpacity: 1,
    monsters: s.monsters.map((m) => ({
      id: m.id,
      kind: m.kind,
      pos: m.pos,
      alive: m.alive,
    })),
    gatesOpen: { ...s.gatesOpen },
    puffs: [],
    spawn: null,
    trapdoor: null,
  };
}
