/**
 * Sample-based SFX engine for Maze Escape.
 *
 * Plays short recorded CC0 clips (Kenney, public domain — see src/assets/audio)
 * through the Web Audio API: fetched once, decoded to AudioBuffers, then fired
 * via BufferSource + gain. A single AudioContext is created lazily on the first
 * user gesture and `resume()`d each time (autoplay policy); the same gesture
 * warms (decodes) every sample so playback isn't silent on the first hit.
 * Everything is wrapped so a missing/failed AudioContext — or a sample that
 * hasn't decoded yet — degrades to silence and NEVER throws.
 *
 * Enablement is backed by `settings.sound` in the storage module: `isSoundEnabled`
 * lazily reads it, `setSoundEnabled` writes it (and keeps a local cache in sync).
 */
import { loadSave, updateSave } from './storage';
import blockedUrl from '../assets/audio/blocked.mp3';
import hintUrl from '../assets/audio/hint.mp3';
import keyUrl from '../assets/audio/key.mp3';
import loseUrl from '../assets/audio/lose.mp3';
import mergeUrl from '../assets/audio/merge.mp3';
import monster1 from '../assets/audio/monster1.mp3';
import monster2 from '../assets/audio/monster2.mp3';
import monster3 from '../assets/audio/monster3.mp3';
import scareUrl from '../assets/audio/scare.mp3';
import step1 from '../assets/audio/step1.mp3';
import step2 from '../assets/audio/step2.mp3';
import step3 from '../assets/audio/step3.mp3';
import winUrl from '../assets/audio/win.mp3';

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
    // Resume on ANY non-running state, not just 'suspended'. Safari/iOS park the
    // context in 'interrupted' whenever OUR tab is backgrounded/occluded (or after
    // a screen lock / long idle); Chrome uses 'suspended'. resume() is a no-op when
    // running and may reject on an 'interrupted' context — swallow it; the gesture
    // + visibility handlers below are what actually recover it.
    if (ctx.state !== 'running') void ctx.resume().catch(() => {});
    return ctx;
  } catch {
    ctxFailed = true;
    return null;
  }
}

/**
 * Unlock audio from WITHIN a user gesture. Safari/iOS refuse to start an
 * AudioContext outside a direct gesture and will not resume one from a
 * setTimeout — but our sounds fire from the animation timeline (setTimeout), so
 * without this the context stays 'suspended' forever and nothing is audible.
 * Creating + resuming + starting a 1-frame silent buffer here does the unlock.
 */
function unlock(): void {
  const c = audio();
  if (!c) return;
  try {
    if (c.state !== 'running') void c.resume().catch(() => {});
    const src = c.createBufferSource();
    src.buffer = c.createBuffer(1, 1, c.sampleRate);
    src.connect(c.destination);
    src.start(0);
    // Same gesture: warm every sample so the first real hit isn't silent.
    preloadAll(c);
  } catch {
    // Unlock is best-effort.
  }
}

let unlockInstalled = false;
/**
 * Install gesture + visibility listeners that keep audio recoverable for the
 * whole page lifetime.
 *
 * The gesture listeners are kept attached FOREVER — never detached after the
 * first unlock. Safari/iOS suspend or 'interrupt' a tab's AudioContext whenever
 * that tab is backgrounded, minimized, or occluded, or when another tab steals
 * the single output session; the ONLY reliable cure once wedged is `resume()`
 * from a real user gesture (a gestureless resume rejects on an interrupted
 * context). Detaching the listeners after the first unlock — as this used to —
 * is exactly what left sound permanently silent after switching tabs and back,
 * until a full browser restart. So the next click/keypress must always be able
 * to recover audio, which means we must still be listening.
 */
function installUnlock(): void {
  if (unlockInstalled) return;
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  unlockInstalled = true;
  const events: (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'touchend'];
  const prime = () => unlock(); // resumes on every gesture; recovers a wedged ctx
  for (const e of events) window.addEventListener(e, prime);

  // Tab-switch recovery. On HIDE, proactively suspend our own context so it comes
  // back with a clean `resume()` — a context we suspend ourselves recovers, but
  // the 'running-but-silent' wedge Safari imposes when another tab grabs the
  // output session does not. On SHOW, resume it. If Safari still wedged it, the
  // next gesture's prime() is the fallback cure.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      if (ctx && ctx.state === 'running') void ctx.suspend().catch(() => {});
      return;
    }
    if (ctx && ctx.state !== 'running') void ctx.resume().catch(() => {});
  });
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
  // Fully unlock within the same user gesture on enable (Safari needs the
  // silent-buffer kick, not just resume()).
  if (on) unlock();
}

// Arm the gesture-based unlock as soon as this module loads on the client.
installUnlock();

// --- sample playback --------------------------------------------------------

/**
 * Each game event maps to one or more CC0 sample URLs. Where there are several
 * (footsteps, the monster shuffle) a random one is picked per play so repeats
 * don't sound mechanical.
 */
const SAMPLES = {
  step: [step1, step2, step3],
  blockedWait: [blockedUrl],
  monster: [monster1, monster2, monster3],
  key: [keyUrl],
  merge: [mergeUrl],
  win: [winUrl],
  lose: [loseUrl],
  hint: [hintUrl],
  scare: [scareUrl],
} as const;

const ALL_URLS = [...new Set(Object.values(SAMPLES).flat())];

const rawCache = new Map<string, Promise<ArrayBuffer>>();
const bufCache = new Map<string, AudioBuffer>();
const decoding = new Set<string>();

/** Fetch a sample's bytes once (cached); a failed fetch clears so it can retry. */
function fetchRaw(url: string): Promise<ArrayBuffer> {
  let p = rawCache.get(url);
  if (!p) {
    p = fetch(url).then((r) => r.arrayBuffer());
    p.catch(() => rawCache.delete(url));
    rawCache.set(url, p);
  }
  return p;
}

/** Fetch + decode a sample into an AudioBuffer (cached). Best-effort/silent. */
function decodeSample(c: Ctx, url: string): void {
  if (bufCache.has(url) || decoding.has(url)) return;
  decoding.add(url);
  fetchRaw(url)
    // decodeAudioData may detach its input, so decode a copy and keep the cache.
    .then((raw) => c.decodeAudioData(raw.slice(0)))
    .then((buf) => {
      bufCache.set(url, buf);
    })
    .catch(() => {})
    .finally(() => decoding.delete(url));
}

/** Warm every sample once the context is live (called from the gesture unlock). */
function preloadAll(c: Ctx): void {
  for (const url of ALL_URLS) decodeSample(c, url);
}

interface PlayOpts {
  readonly gain?: number;
  /** Slight random pitch shift so repeated footsteps/shuffles vary. */
  readonly vary?: boolean;
}

/** Play one of `urls` (random pick) through a gain node. Silent if not decoded. */
function playSample(urls: readonly string[], opts: PlayOpts = {}): void {
  const c = audio();
  if (!c) return;
  const url = urls.length === 1 ? urls[0] : urls[(Math.random() * urls.length) | 0];
  const buf = bufCache.get(url);
  if (!buf) {
    decodeSample(c, url); // decode now; this hit is silent, the next will land
    return;
  }
  try {
    const src = c.createBufferSource();
    src.buffer = buf;
    if (opts.vary) src.playbackRate.value = 0.93 + Math.random() * 0.14;
    const g = c.createGain();
    g.gain.value = opts.gain ?? 0.5;
    src.connect(g).connect(c.destination);
    src.start();
  } catch {
    // A failed voice must never bubble up into gameplay.
  }
}

/** Run `fn` only when sound is enabled and audio is usable. */
function play(fn: () => void): void {
  if (!isSoundEnabled()) return;
  fn();
}

// --- synthesized voice (spawn intro rise) -----------------------------------
// The elevator rumble is a low bed under the tiles grinding up out of the floor.
// Synthesized on the shared context (nothing to fetch), best-effort: a missing
// or failed context degrades to silence and never throws. The scare that fires
// on the head-turn is a recorded sample (SAMPLES.scare), not synthesized.

/** Fill a mono AudioBuffer with white noise. */
function noiseBuffer(c: Ctx, seconds: number): AudioBuffer {
  const buf = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * seconds)), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

/**
 * A low, filtered stone-grind for the enemy tiles rising out of the floor. Sub
 * rumble (low-passed noise) swelling in and dying away — the "elevator" bed.
 */
function playRumble(): void {
  const c = audio();
  if (!c) return;
  try {
    const now = c.currentTime;
    const dur = 0.6;
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(c, dur);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(90, now);
    lp.frequency.linearRampToValueAtTime(220, now + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.5, now + 0.14);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    src.connect(lp).connect(g).connect(c.destination);
    src.start(now);
    src.stop(now + dur);
  } catch {
    // best-effort
  }
}


// --- public SFX (recorded CC0 clips — Kenney, public domain) ----------------

export const sfx = {
  /** Player hop: a stone footstep. */
  step: () => play(() => playSample(SAMPLES.step, { gain: 0.5, vary: true })),
  /** A blocked move / wait: a soft muffled bump. */
  blockedWait: () => play(() => playSample(SAMPLES.blockedWait, { gain: 0.4 })),
  /** Monster sub-step: a dry cloth/bandage shuffle (throttled by the caller). */
  monster: () => play(() => playSample(SAMPLES.monster, { gain: 0.4, vary: true })),
  /** Key pickup / gate toggle: a metal latch. */
  key: () => play(() => playSample(SAMPLES.key, { gain: 0.6 })),
  /** Monster collision: a heavy soft thud. */
  merge: () => play(() => playSample(SAMPLES.merge, { gain: 0.85 })),
  /** Win: a resonant temple bong. */
  win: () => play(() => playSample(SAMPLES.win, { gain: 0.7 })),
  /** Lose: a low wooden thud. */
  lose: () => play(() => playSample(SAMPLES.lose, { gain: 0.75 })),
  /** Hint revealed: a gentle glass chime. */
  hint: () => play(() => playSample(SAMPLES.hint, { gain: 0.55 })),
  /** Spawn intro: enemy tiles grinding up out of the floor (synthesized). */
  rumble: () => play(() => playRumble()),
  /** Spawn intro: the aggressive beast roar as the risen enemies turn their
   *  heads to face the player (CC-free Mixkit sample). */
  scare: () => play(() => playSample(SAMPLES.scare, { gain: 0.95 })),
};

/** Test-only seam: reset cached state between cases. */
export function __resetSound(): void {
  enabled = undefined;
  ctx = null;
  ctxFailed = false;
}
