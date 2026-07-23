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
import rumbleUrl from '../assets/audio/rumble.mp3';
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
  rumble: [rumbleUrl],
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
  /** Base playback rate (1 = unpitched). <1 = lower/heavier (e.g. a big mummy's
   *  footfall vs the player's). `vary` jitters around this base. */
  readonly rate?: number;
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
    const base = opts.rate ?? 1;
    if (opts.vary) src.playbackRate.value = base * (0.95 + Math.random() * 0.1);
    else if (opts.rate) src.playbackRate.value = base;
    const g = c.createGain();
    g.gain.value = opts.gain ?? 0.5;
    src.connect(g).connect(c.destination);
    src.start();
  } catch {
    // A failed voice must never bubble up into gameplay.
  }
}

/** Play a footstep clip at a fixed pitch through a lowpass (darkness control),
 *  scheduled `delay` seconds ahead on the audio clock (tight, jitter-free). */
function playStepPitched(rate: number, gain: number, delay: number, lowpass: number): void {
  const c = audio();
  if (!c) return;
  const urls = SAMPLES.step;
  const url = urls[(Math.random() * urls.length) | 0];
  const buf = bufCache.get(url);
  if (!buf) {
    decodeSample(c, url); // decode now; this hit is silent, the next will land
    return;
  }
  try {
    const src = c.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate * (0.985 + Math.random() * 0.03); // tiny vary
    // Lowpass sets the darkness: low cutoff = a dark, hollow thud (a mummy);
    // high cutoff = bright and light (the human). A little resonance = hollow.
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = lowpass;
    lp.Q.value = 0.9;
    const g = c.createGain();
    g.gain.value = gain;
    src.connect(lp).connect(g).connect(c.destination);
    src.start(c.currentTime + Math.max(0, delay));
  } catch {
    // A failed voice must never bubble up into gameplay.
  }
}

// A three-hit tread, per step: one accented note then two notes tighter together
// — "DAM DUMDUM" (GAP2 < GAP1). Shared rhythm; the mummy and the human differ
// only in pitch/darkness/volume.
const STEP_GAP1 = 0.22; // DAM → first DUM (a clear beat, not a blur)
const STEP_GAP2 = 0.12; // first DUM → second DUM (tighter, so they pair as "DUMDUM")

/** DAM (accented) + DUM + DUM at (damRate/dumRate) pitch, `lowpass` darkness. */
function tripleStep(
  damRate: number,
  dumRate: number,
  lowpass: number,
  gainDam: number,
  gainDum: number,
): void {
  playStepPitched(damRate, gainDam, 0, lowpass); // DAM
  playStepPitched(dumRate, gainDum, STEP_GAP1, lowpass); // DUM
  playStepPitched(dumRate, gainDum, STEP_GAP1 + STEP_GAP2, lowpass); // DUM (tight)
}

// Mummy: low pitch + low cutoff + loud = a dark, heavy, scary tread.
const MUMMY_DAM_RATE = 0.82;
const MUMMY_DUM_RATE = 0.58;
const MUMMY_LOWPASS = 900;
// Human: high pitch + open cutoff + soft = a light, quick patter.
const HUMAN_DAM_RATE = 1.5;
const HUMAN_DUM_RATE = 1.12;
const HUMAN_LOWPASS = 7000;

/** Run `fn` only when sound is enabled and audio is usable. */
function play(fn: () => void): void {
  if (!isSoundEnabled()) return;
  fn();
}


// --- public SFX (recorded CC0 clips — Kenney, public domain) ----------------

export const sfx = {
  /** Player hop: a stone footstep. */
  step: () => play(() => playSample(SAMPLES.step, { gain: 0.5, vary: true })),
  /** A blocked move / wait: a soft muffled bump. */
  blockedWait: () => play(() => playSample(SAMPLES.blockedWait, { gain: 0.4 })),
  /** Monster sub-step: a heavy footstep. Reuses the stone-footstep clips pitched
   *  DOWN (rate 0.78) so a mummy's footfall reads as a real, weighty step —
   *  distinct from the player's lighter step. One per step-tick (see buildFrames),
   *  so a mummy's two steps are two footfalls. */
  monster: () => play(() => playSample(SAMPLES.step, { gain: 0.5, vary: true, rate: 0.78 })),
  /** A mummy's single step: a dark, heavy triple footfall ("DAM DUMDUM"). Called
   *  once per mummy step-tick, so its double move reads as two triples. */
  mummyStep: () => play(() => tripleStep(MUMMY_DAM_RATE, MUMMY_DUM_RATE, MUMMY_LOWPASS, 0.54, 0.4)),
  /** The human's step: the SAME triple, but much lighter — high, bright, soft. */
  playerStep: () => play(() => tripleStep(HUMAN_DAM_RATE, HUMAN_DUM_RATE, HUMAN_LOWPASS, 0.34, 0.24)),
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
  /** Spawn intro: a slow stone-drag under the tiles rising out of the floor. */
  rumble: () => play(() => playSample(SAMPLES.rumble, { gain: 0.85 })),
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
