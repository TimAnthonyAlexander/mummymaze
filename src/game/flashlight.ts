/**
 * Flashlight geometry for dark levels (see docs/SPEC.md §2.7).
 *
 * Pure and DOM-free so it can be unit-tested and reused by both the darkness
 * overlay (which needs a pixel radius) and per-sprite visibility gating (which
 * needs a boolean per tile). Darkness is view-only: nothing here touches the
 * engine or game rules.
 */
import type { Pos } from '../engine';

/**
 * A tile is lit iff its Euclidean distance to the torch centre (the explorer)
 * is within `radius + 0.5`. The half-tile fudge makes the boundary tile at
 * exactly `radius` count as lit, matching the soft circular pool the overlay
 * paints, so "can I see this monster?" agrees with "does it look lit?".
 */
export function isLit(center: Pos, tile: Pos, radius: number): boolean {
  const dx = tile.x - center.x;
  const dy = tile.y - center.y;
  return Math.hypot(dx, dy) <= radius + 0.5;
}

/** Inner/outer stops of the torch falloff, as offsets from `radius`. Board.tsx
 *  feeds these same two numbers to the overlay gradient as --light-r/--light-r2,
 *  so what the pool paints and what this reports are one rule. */
export const LIGHT_INNER = -0.25;
export const LIGHT_OUTER = 0.5;

/**
 * How lit a tile is: 1 = fully in the pool, 0 = fully swallowed by the dark,
 * ramping smoothly between the two gradient stops.
 *
 * A monster's BODY is always rendered and faded by this value, so it is hidden
 * by the darkness rather than replaced by a different sprite — walking into the
 * torch reveals the actual enemy instead of swapping eyes for a body. The
 * glowing eyes fade in as the inverse, so they are the tell in the dark and
 * switch off once you can see the thing itself.
 */
export function lightLevel(center: Pos, tile: Pos, radius: number): number {
  const d = Math.hypot(tile.x - center.x, tile.y - center.y);
  const inner = radius + LIGHT_INNER;
  const outer = radius + LIGHT_OUTER;
  if (d <= inner) return 1;
  if (d >= outer) return 0;
  return 1 - (d - inner) / (outer - inner);
}
