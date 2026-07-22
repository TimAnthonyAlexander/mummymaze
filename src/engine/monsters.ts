/**
 * The pursuit AI. Every monster shares one deterministic greedy chase rule and
 * differs only in axis priority (white = horizontal-first, red = vertical-first)
 * and speed (mummy = 2 steps/turn, scorpion = 1).
 */
import { canCross, neighbor } from './board';
import type { Dir, Level, MonsterKind, Pos } from './types';

export function stepsPerTurn(kind: MonsterKind): number {
  return kind === 'mummy_white' || kind === 'mummy_red' ? 2 : 1;
}

export function isMummy(kind: MonsterKind): boolean {
  return kind === 'mummy_white' || kind === 'mummy_red';
}

function horizontalFirst(kind: MonsterKind): boolean {
  return kind === 'mummy_white' || kind === 'scorpion_white';
}

/**
 * Decide a single step toward the player. Returns the new position, or the same
 * position if fully blocked toward the player on both axes.
 *
 * The monster only ever steps in a direction that reduces its distance to the
 * player; if the priority axis is blocked, it falls back to the other axis.
 */
export function monsterStep(
  level: Level,
  gatesOpen: Readonly<Record<string, boolean>>,
  kind: MonsterKind,
  from: Pos,
  player: Pos,
): Pos {
  const dx = player.x - from.x;
  const dy = player.y - from.y;

  const horiz: Dir | null = dx > 0 ? 'E' : dx < 0 ? 'W' : null;
  const vert: Dir | null = dy > 0 ? 'S' : dy < 0 ? 'N' : null;

  const order: (Dir | null)[] = horizontalFirst(kind)
    ? [horiz, vert]
    : [vert, horiz];

  for (const dir of order) {
    if (dir !== null && canCross(level, gatesOpen, from, dir)) {
      return neighbor(from, dir);
    }
  }
  return from;
}
