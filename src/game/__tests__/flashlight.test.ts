import { describe, expect, it } from 'vitest';
import type { Pos } from '../../engine';
import { isLit } from '../flashlight';

const c: Pos = { x: 2, y: 2 };

describe('isLit (flashlight geometry, SPEC §2.7)', () => {
  it('lights the centre tile', () => {
    expect(isLit(c, { x: 2, y: 2 }, 2)).toBe(true);
  });

  it('lights orthogonal tiles exactly at the radius (radius + 0.5 fudge)', () => {
    expect(isLit(c, { x: 4, y: 2 }, 2)).toBe(true); // dist 2
    expect(isLit(c, { x: 2, y: 0 }, 2)).toBe(true); // dist 2
    expect(isLit(c, { x: 0, y: 2 }, 2)).toBe(true); // dist 2
  });

  it('lights a diagonal within radius+0.5 but not a far corner', () => {
    expect(isLit(c, { x: 3, y: 4 }, 2)).toBe(true); // dist ~2.24 <= 2.5
    expect(isLit(c, { x: 0, y: 0 }, 2)).toBe(false); // dist ~2.83 > 2.5
    expect(isLit(c, { x: 4, y: 4 }, 2)).toBe(false); // dist ~2.83 > 2.5
  });

  it('hides tiles beyond the radius', () => {
    expect(isLit(c, { x: 2, y: 5 }, 2)).toBe(false); // dist 3
    expect(isLit(c, { x: 5, y: 2 }, 2)).toBe(false); // dist 3
  });

  it('scales with a smaller radius', () => {
    expect(isLit(c, { x: 3, y: 2 }, 1)).toBe(true); // dist 1 <= 1.5
    expect(isLit(c, { x: 3, y: 3 }, 1)).toBe(true); // dist ~1.41 <= 1.5
    expect(isLit(c, { x: 4, y: 2 }, 1)).toBe(false); // dist 2 > 1.5
    expect(isLit(c, { x: 2, y: 4 }, 1)).toBe(false); // dist 2 > 1.5
  });

  it('is symmetric in the two positions', () => {
    const a: Pos = { x: 1, y: 5 };
    const b: Pos = { x: 3, y: 6 };
    expect(isLit(a, b, 2)).toBe(isLit(b, a, 2));
  });
});
