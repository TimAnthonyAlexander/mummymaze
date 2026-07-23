import { describe, expect, it } from 'vitest';
import type { Pos } from '../../engine';
import { EYES_FADE_IN, eyeLevel, isLit, lightLevel } from '../flashlight';

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

describe('lightLevel (torch falloff)', () => {
  it('is fully lit at the centre and inside the inner stop', () => {
    expect(lightLevel(c, { x: 2, y: 2 }, 2)).toBe(1);
    expect(lightLevel(c, { x: 3, y: 2 }, 2)).toBe(1); // dist 1 < 1.75
  });

  it('is fully dark at or beyond the outer stop', () => {
    expect(lightLevel(c, { x: 2, y: 5 }, 2)).toBe(0); // dist 3 > 2.5
    expect(lightLevel(c, { x: 0, y: 0 }, 2)).toBe(0); // dist ~2.83 > 2.5
  });

  it('ramps between the two stops', () => {
    const v = lightLevel(c, { x: 4, y: 2 }, 2); // dist 2, between 1.75 and 2.5
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(1);
  });

  it('agrees with isLit at the outer boundary', () => {
    // isLit's cutoff (radius + 0.5) is exactly where the ramp reaches zero, so
    // no tile is ever reported lit while contributing nothing, or vice versa.
    for (const t of [
      { x: 4, y: 2 },
      { x: 3, y: 4 },
      { x: 0, y: 0 },
      { x: 2, y: 5 },
    ]) {
      expect(lightLevel(c, t, 2) > 0).toBe(isLit(c, t, 2) && lightLevel(c, t, 2) > 0);
    }
  });

  it('is symmetric', () => {
    const a: Pos = { x: 1, y: 5 };
    const b: Pos = { x: 3, y: 6 };
    expect(lightLevel(a, b, 2)).toBe(lightLevel(b, a, 2));
  });
});

describe('eyeLevel (glowing-eyes fallback)', () => {
  it('is off while the body is still visible', () => {
    // The reported bug: a monster two down and one right (dist ~2.24, ~35% lit)
    // showed a clearly visible body AND eyes at the same time.
    const light = lightLevel(c, { x: 3, y: 4 }, 2);
    expect(light).toBeGreaterThan(EYES_FADE_IN);
    expect(eyeLevel(light)).toBe(0);
  });

  it('is fully on where the body is gone', () => {
    expect(eyeLevel(0)).toBe(1);
  });

  it('never overlaps a fully lit body', () => {
    expect(eyeLevel(1)).toBe(0);
  });

  it('ramps in below the threshold', () => {
    const v = eyeLevel(EYES_FADE_IN / 2);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(1);
  });
});
