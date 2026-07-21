/**
 * Procedural SFX engine for Maze Escape — Web Audio only, no audio files.
 *
 * Every sound is synthesized on the fly from oscillators / filtered noise with
 * short gain envelopes, so the whole thing is self-contained and CSP-safe (no
 * network, no blobs). A single AudioContext is created lazily on the first user
 * gesture and `resume()`d each time (autoplay policy). Everything is wrapped so
 * a missing or failed AudioContext degrades to silence and NEVER throws.
 *
 * Enablement is backed by `settings.sound` in the storage module: `isSoundEnabled`
 * lazily reads it, `setSoundEnabled` writes it (and keeps a local cache in sync).
 */
import { loadSave, updateSave } from './storage';

type Ctx = AudioContext;

let ctx: Ctx | null = null;
let ctxFailed = false;
/** Cached enabled flag; `undefined` until first read from storage. */
let enabled: boolean | undefined;

/** The AudioContext constructor, tolerating older webkit-prefixed browsers. */
function getCtor(): typeof AudioContext | null {
  const g = globalThis as unknown as {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  return g.AudioContext ?? g.webkitAudioContext ?? null;
}

/** Lazily create/resume the shared AudioContext, or null if unavailable. */
function audio(): Ctx | null {
  if (ctxFailed) return null;
  try {
    if (!ctx) {
      const Ctor = getCtor();
      if (!Ctor) {
        ctxFailed = true;
        return null;
      }
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    ctxFailed = true;
    return null;
  }
}

/** True when sound is on. Reads storage once, then serves the cache. */
export function isSoundEnabled(): boolean {
  if (enabled === undefined) {
    try {
      enabled = loadSave().settings.sound;
    } catch {
      enabled = true;
    }
  }
  return enabled;
}

/** Persist and cache the enabled flag. Safe to call from a toggle handler. */
export function setSoundEnabled(on: boolean): void {
  enabled = on;
  try {
    const prev = loadSave().settings;
    updateSave({ settings: { ...prev, sound: on } });
  } catch {
    // Storage is best-effort; the cached flag still governs playback.
  }
  // Touching the context on enable warms it up within the same user gesture.
  if (on) audio();
}

// --- low-level voices -------------------------------------------------------

interface ToneOpts {
  readonly type?: OscillatorType;
  readonly gain?: number;
  /** Optional end frequency for a linear glide. */
  readonly to?: number;
  /** Delay before the tone starts (s), for arpeggios. */
  readonly at?: number;
}

/** A single enveloped oscillator blip. */
function tone(freq: number, dur: number, opts: ToneOpts = {}): void {
  const c = audio();
  if (!c) return;
  try {
    const t0 = c.currentTime + (opts.at ?? 0);
    const osc = c.createOscillator();
    const g = c.createGain();
    const peak = opts.gain ?? 0.12;
    osc.type = opts.type ?? 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.to !== undefined) osc.frequency.linearRampToValueAtTime(opts.to, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  } catch {
    // Never let a failed voice bubble up into gameplay.
  }
}

/** A short filtered white-noise burst (thuds / merges). */
function noise(dur: number, gain: number, cutoff: number): void {
  const c = audio();
  if (!c) return;
  try {
    const frames = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, frames, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = cutoff;
    const g = c.createGain();
    const t0 = c.currentTime;
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(lp).connect(g).connect(c.destination);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  } catch {
    // Silence on failure.
  }
}

/** Run `fn` only when sound is enabled and audio is usable. */
function play(fn: () => void): void {
  if (!isSoundEnabled()) return;
  fn();
}

// --- public SFX (subtle + distinct) ----------------------------------------

export const sfx = {
  /** Player hop: a soft high tick. */
  step: () => play(() => tone(640, 0.06, { type: 'triangle', gain: 0.06 })),
  /** A blocked move / wait: a duller low tick. */
  blockedWait: () => play(() => tone(200, 0.08, { type: 'square', gain: 0.05 })),
  /** Monster sub-step: a subtle low thump (throttled by the caller). */
  monster: () => play(() => tone(150, 0.07, { type: 'triangle', gain: 0.05 })),
  /** Key pickup / gate toggle: a bright ping. */
  key: () => play(() => tone(1180, 0.14, { type: 'sine', gain: 0.09, to: 1560 })),
  /** Monster collision: a noisy thud. */
  merge: () => play(() => {
    noise(0.16, 0.18, 900);
    tone(110, 0.16, { type: 'square', gain: 0.06 });
  }),
  /** Win: a short rising arpeggio. */
  win: () => play(() => {
    tone(523, 0.16, { type: 'triangle', gain: 0.1, at: 0 });
    tone(659, 0.16, { type: 'triangle', gain: 0.1, at: 0.11 });
    tone(784, 0.28, { type: 'triangle', gain: 0.11, at: 0.22 });
  }),
  /** Lose: a descending tone. */
  lose: () => play(() => tone(420, 0.42, { type: 'sawtooth', gain: 0.09, to: 130 })),
  /** Hint revealed: a gentle two-note chime. */
  hint: () => play(() => {
    tone(880, 0.12, { type: 'sine', gain: 0.07, at: 0 });
    tone(1320, 0.18, { type: 'sine', gain: 0.07, at: 0.09 });
  }),
};

/** Test-only seam: reset cached state between cases. */
export function __resetSound(): void {
  enabled = undefined;
  ctx = null;
  ctxFailed = false;
}
