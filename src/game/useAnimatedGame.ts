/**
 * Animated binding over the pure engine. Keeps the committed engine state
 * authoritative (it jumps to each turn's result immediately) while playing the
 * turn's trace out on a timeline so sprites move ONE tile at a time: a mummy's
 * two steps show as two discrete hops (never a diagonal slide), and a win walks
 * the explorer out through the exit before the overlay appears.
 *
 * Undo / restart / load are instant: they cancel any running animation and snap
 * the render to the target state.
 */
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  type Action,
  type Dir,
  type GameState,
  type Level,
  type TraceEvent,
  initGame,
  stepWithTrace,
} from '../engine';
import { type RenderState, toRender } from './render';
import { sfx } from './sound';
import { loadSave } from './storage';

const HOP_MS = 135; // per single-tile hop
const KILL_MS = 110; // pause when a monster is destroyed
const INITIAL_MS = 24; // let the pre-move frame paint before the first hop

interface Frame {
  dur: number;
  apply: (r: RenderState) => RenderState;
  /** Fired as the frame paints (gated by sound settings inside sfx). */
  sound?: () => void;
}

/** Whether the hop-by-hop timeline should play (persisted setting). */
function animationsEnabled(): boolean {
  try {
    return loadSave().settings.animations;
  } catch {
    return true;
  }
}

/** The settle SFX for a turn's final phase (win / lose), or none. */
function settleSound(phase: GameState['phase']): (() => void) | null {
  if (phase === 'won') return sfx.win;
  if (phase === 'lost') return sfx.lose;
  return null;
}

function setActorPos(r: RenderState, actor: string, to: RenderState['player']): RenderState {
  if (actor === 'player') return { ...r, player: to };
  return {
    ...r,
    monsters: r.monsters.map((m) => (m.id === actor ? { ...m, pos: to } : m)),
  };
}

function setDead(r: RenderState, id: string): RenderState {
  return {
    ...r,
    monsters: r.monsters.map((m) => (m.id === id ? { ...m, alive: false } : m)),
  };
}

/** Mutations + sounds gathered for one simultaneity tick. */
interface Round {
  applies: ((r: RenderState) => RenderState)[];
  sounds: (() => void)[];
  hasKill: boolean;
}

function buildFrames(trace: readonly TraceEvent[]): Frame[] {
  // Batch the turn into rounds keyed by TraceMove.round so every monster steps
  // at the same tick (mummies twice, scorpions once) instead of one-after-
  // another. Gate/kill events attach to the round of the move that caused them.
  // Applying a whole round in a single setRender lets the CSS transition slide
  // all sprites together. The exit walk-out stays a sequential player-only path.
  const rounds = new Map<number, Round>();
  const exits: { path: readonly RenderState['player'][] }[] = [];
  let lastRound = 0;
  let monsterSounded = false; // one monster thump per turn

  const bucket = (round: number): Round => {
    let b = rounds.get(round);
    if (!b) {
      b = { applies: [], sounds: [], hasKill: false };
      rounds.set(round, b);
    }
    return b;
  };

  for (const ev of trace) {
    switch (ev.kind) {
      case 'move': {
        const b = bucket(ev.round);
        lastRound = ev.round;
        const { actor, to } = ev;
        b.applies.push((r) => setActorPos(r, actor, to));
        if (actor === 'player') {
          b.sounds.push(sfx.step);
        } else if (!monsterSounded) {
          monsterSounded = true;
          b.sounds.push(sfx.monster);
        }
        break;
      }
      case 'gate': {
        const b = bucket(lastRound);
        const { gatesOpen } = ev;
        b.applies.push((r) => ({ ...r, gatesOpen }));
        b.sounds.push(sfx.key);
        break;
      }
      case 'kill': {
        const b = bucket(lastRound);
        const { actor } = ev;
        b.applies.push((r) => setDead(r, actor));
        b.sounds.push(sfx.merge);
        b.hasKill = true;
        break;
      }
      case 'exit':
        exits.push({ path: ev.path });
        break;
    }
  }

  const frames: Frame[] = [];
  for (const round of [...rounds.keys()].sort((a, b) => a - b)) {
    const { applies, sounds, hasKill } = rounds.get(round)!;
    frames.push({
      dur: hasKill ? HOP_MS + KILL_MS : HOP_MS,
      apply: (r) => applies.reduce((acc, fn) => fn(acc), r),
      sound: sounds.length ? () => sounds.forEach((s) => s()) : undefined,
    });
  }
  for (const ex of exits) {
    for (const p of ex.path) frames.push({ dur: HOP_MS, apply: (r) => ({ ...r, player: p }) });
    frames.push({ dur: HOP_MS, apply: (r) => ({ ...r, playerOpacity: 0 }) });
  }
  return frames;
}

/**
 * Fire the turn's sounds immediately (animations-off path): one of each relevant
 * kind so a whole turn collapses to a subtle blip, not a barrage.
 */
function fireInstantSounds(trace: readonly TraceEvent[]): void {
  let playerMoved = false;
  let monsterMoved = false;
  let gate = false;
  let kill = false;
  for (const ev of trace) {
    if (ev.kind === 'move') {
      if (ev.actor === 'player') playerMoved = true;
      else monsterMoved = true;
    } else if (ev.kind === 'gate') gate = true;
    else if (ev.kind === 'kill') kill = true;
  }
  if (playerMoved) sfx.step();
  if (gate) sfx.key();
  if (kill) sfx.merge();
  if (monsterMoved) sfx.monster();
}

// --- committed history (same shape as the plain reducer) ---

interface History {
  readonly past: readonly GameState[];
  readonly present: GameState;
}

type Event =
  | { type: 'commit'; next: GameState }
  | { type: 'undo' }
  | { type: 'restart' }
  | { type: 'load'; level: Level };

function reducer(state: History, event: Event): History {
  switch (event.type) {
    case 'commit':
      return { past: [...state.past, state.present], present: event.next };
    case 'undo':
      return state.past.length === 0
        ? state
        : { past: state.past.slice(0, -1), present: state.past[state.past.length - 1] };
    case 'restart':
      return { past: [], present: initGame(state.present.level) };
    case 'load':
      return { past: [], present: initGame(event.level) };
    default:
      return state;
  }
}

export interface UseAnimatedGame {
  state: GameState;
  render: RenderState;
  animating: boolean;
  canUndo: boolean;
  move: (action: Action) => void;
  undo: () => void;
  restart: () => void;
  load: (level: Level) => void;
}

export function useAnimatedGame(level: Level): UseAnimatedGame {
  const [history, dispatch] = useReducer(
    reducer,
    level,
    (l): History => ({ past: [], present: initGame(l) }),
  );
  const [render, setRender] = useState<RenderState>(() => toRender(initGame(level)));
  const [animating, setAnimating] = useState(false);

  const historyRef = useRef(history);
  historyRef.current = history;
  const animatingRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const playerFacingRef = useRef<Dir>('S');

  const cancel = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const play = useCallback(
    (
      frames: Frame[],
      startRender: RenderState,
      finalRender: RenderState,
      settle: (() => void) | null,
    ) => {
      cancel();
      animatingRef.current = true;
      setAnimating(true);
      let r = startRender;
      setRender(r);
      let i = 0;
      const runNext = () => {
        if (i >= frames.length) {
          setRender(finalRender);
          animatingRef.current = false;
          setAnimating(false);
          timerRef.current = null;
          settle?.();
          return;
        }
        const f = frames[i++];
        r = f.apply(r);
        setRender(r);
        f.sound?.();
        timerRef.current = window.setTimeout(runNext, f.dur);
      };
      timerRef.current = window.setTimeout(runNext, INITIAL_MS);
    },
    [cancel],
  );

  const snap = useCallback(
    (target: GameState) => {
      cancel();
      animatingRef.current = false;
      setAnimating(false);
      setRender(toRender(target));
    },
    [cancel],
  );

  const move = useCallback(
    (action: Action) => {
      if (animatingRef.current) return; // input locked during a turn's animation
      const present = historyRef.current.present;
      if (present.phase !== 'player') return;
      const { state: next, trace } = stepWithTrace(present, action);
      if (next === present) return; // nothing happened (should not occur in player phase)
      dispatch({ type: 'commit', next });
      // The explorer turns to face any directional input, even a blocked bump.
      if (action !== 'wait') playerFacingRef.current = action as Dir;
      const facing = playerFacingRef.current;
      const exited = trace.some((e) => e.kind === 'exit');
      const startRender: RenderState = { ...toRender(present), playerFacing: facing };
      const finalRender: RenderState = {
        ...toRender(next),
        playerFacing: facing,
        playerOpacity: exited ? 0 : 1,
      };
      const settle = settleSound(next.phase);

      if (!animationsEnabled()) {
        // Snap straight to the settled state; sprites still glide via CSS.
        snap(next);
        setRender(finalRender);
        fireInstantSounds(trace);
        settle?.();
        return;
      }
      play(buildFrames(trace), startRender, finalRender, settle);
    },
    [play, snap],
  );

  const undo = useCallback(() => {
    const h = historyRef.current;
    if (h.past.length === 0) return;
    dispatch({ type: 'undo' });
    snap(h.past[h.past.length - 1]);
  }, [snap]);

  const restart = useCallback(() => {
    dispatch({ type: 'restart' });
    snap(initGame(historyRef.current.present.level));
  }, [snap]);

  const load = useCallback(
    (l: Level) => {
      dispatch({ type: 'load', level: l });
      snap(initGame(l));
    },
    [snap],
  );

  useEffect(() => cancel, [cancel]);

  return useMemo(
    () => ({
      state: history.present,
      render,
      animating,
      canUndo: history.past.length > 0,
      move,
      undo,
      restart,
      load,
    }),
    [history, render, animating, move, undo, restart, load],
  );
}
