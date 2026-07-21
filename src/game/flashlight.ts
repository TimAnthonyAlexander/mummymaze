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
