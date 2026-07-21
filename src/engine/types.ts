/**
 * Core engine types. The engine is pure and framework-agnostic: no React,
 * no DOM, no I/O. Every transition returns a NEW state; nothing is mutated
 * in place (see coding-style: immutability).
 */

export type Dir = 'N' | 'E' | 'S' | 'W';

export const DIRS: readonly Dir[] = ['N', 'E', 'S', 'W'] as const;

export interface Pos {
  readonly x: number;
  readonly y: number;
}

/** Player action for a single turn. */
export type Action = Dir | 'wait';

export type MonsterKind =
  | 'mummy_white' // 2 steps/turn, horizontal-first
  | 'mummy_red' // 2 steps/turn, vertical-first
  | 'scorpion_white' // 1 step/turn, horizontal-first
  | 'scorpion_red'; // 1 step/turn, vertical-first

export interface Monster {
  readonly id: string;
  readonly kind: MonsterKind;
  readonly pos: Pos;
  readonly alive: boolean;
}

export interface Walls {
  readonly N: boolean;
  readonly E: boolean;
  readonly S: boolean;
  readonly W: boolean;
}

export interface Cell {
  readonly walls: Walls;
  readonly trap: boolean;
  readonly key: boolean;
}

export interface Gate {
  readonly id: string;
  /** The gate sits on the edge between `a` and the neighbor of `a` in `dir`. */
  readonly a: Pos;
  readonly dir: Dir;
  readonly startOpen: boolean;
}

/** A single border edge the explorer can step through to win. */
export interface Exit {
  readonly pos: Pos;
  readonly dir: Dir;
}

/** Fully-expanded, validated, runtime-ready level. */
export interface Level {
  readonly id: string;
  readonly name: string;
  readonly width: number;
  readonly height: number;
  /** cells[y][x] */
  readonly cells: readonly (readonly Cell[])[];
  readonly gates: readonly Gate[];
  readonly exit: Exit;
  readonly start: Pos;
  readonly monstersStart: readonly Monster[];
  /** Optional known-good move count for scoring. */
  readonly par?: number;
}

export type Phase = 'player' | 'won' | 'lost';

export type LossReason = 'caught' | 'trap' | 'walked-into-monster';

export interface GameState {
  readonly level: Level;
  readonly player: Pos;
  readonly monsters: readonly Monster[];
  /** gateId -> open? */
  readonly gatesOpen: Readonly<Record<string, boolean>>;
  readonly phase: Phase;
  readonly turn: number;
  /** Player actions taken (moves + waits), used for scoring. */
  readonly moveCount: number;
  readonly lossReason?: LossReason;
}
