import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { __resetMemoryFallback, loadSave } from '../storage';
import { __resetSound, isSoundEnabled, setSoundEnabled, sfx } from '../sound';

/**
 * The SFX engine must be safe with no Web Audio available (the node/vitest env
 * has no AudioContext): every voice degrades to silence and never throws, and
 * the enable flag round-trips through storage.
 */
describe('sound engine (no AudioContext)', () => {
  beforeEach(() => {
    __resetMemoryFallback();
    __resetSound();
  });
  afterEach(() => {
    __resetSound();
  });

  it('defaults to enabled from a fresh save', () => {
    expect(isSoundEnabled()).toBe(true);
  });

  it('persists the enabled flag to storage', () => {
    setSoundEnabled(false);
    expect(isSoundEnabled()).toBe(false);
    expect(loadSave().settings.sound).toBe(false);
    setSoundEnabled(true);
    expect(isSoundEnabled()).toBe(true);
    expect(loadSave().settings.sound).toBe(true);
  });

  it('never throws when playing any voice without an AudioContext', () => {
    expect(() => {
      sfx.step();
      sfx.blockedWait();
      sfx.monster();
      sfx.key();
      sfx.merge();
      sfx.win();
      sfx.lose();
      sfx.hint();
      sfx.rumble();
      sfx.scare();
    }).not.toThrow();
  });
});
