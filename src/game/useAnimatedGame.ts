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
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import {
  type Action,
  type Dir,
  type GameState,
  type Level,
  type Pos,
  type TraceEvent,
  initGame,
  samePos,
  stepWithTrace,
} from '../engine';
import { type RenderState, toRender } from './render';
import { sfx } from './sound';
import { loadSave } from './storage';

// Per single-tile hop timeline holds. Each turn plays round-by-round: round 0 is
// the player's hop, rounds >=1 are the monsters' step-ticks (a mummy steps twice
// => rounds 1 and 2). Monsters are ~2× slower than the player so their pursuit is
// a deliberate walk while the player's own move stays snappy. Each slightly
// exceeds the board's matching *_ANIM_MS so a hop settles and rests before the
// next round — the short pause between a mummy's two steps.
const PLAYER_HOP_MS = 300; // player hop (round 0) + generic player-only frames
const MONSTER_HOP_MS = 600; // monster step-tick (round >= 1)
const KILL_MS = 110; // pause when a monster is destroyed
const CRASH_HOLD_MS = 360; // hold after a crash so the smoke + sparkles finish before settle
const INITIAL_MS = 24; // let the pre-move frame paint before the first hop

// Spawn-in intro (view-only pre-roll; see playSpawn).
const SPAWN_HOP_MS = 125; // per walk-in hop (>= the sprite CSS transition, so it reads as hops)
const SPAWN_HOLD_MS = 150; // beat of total darkness before the explorer starts walking
const SPAWN_REVEAL_MS = 380; // lights-on fade (must exceed the .board__spawn CSS transition)
const MAX_SPAWN_HOPS = 4; // cap the walk-in so the intro stays snappy on wide boards
// Enemy elevator + head-turn (must each exceed the matching Board.css animation).
const SPAWN_PIT_HOLD_MS = 240; // beat with the empty pits showing before they rise
const SPAWN_RISE_MS = 1040; // tiles + enemies ride up out of the floor (slow, linear)
const SPAWN_TURN_DELAY_MS = 200; // beat after the rise settles before the head turns + roars
const SPAWN_TURN_MS = 780; // the risen enemies' heads twist a full 360° on the neck

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

/** True when the OS asks for reduced motion (spawn intro is skipped if so). */
function prefersReducedMotion(): boolean {
  try {
    return (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  } catch {
    return false;
  }
}

/** Play the spawn walk-in only when animations are on and motion isn't reduced. */
function spawnMotionOK(): boolean {
  return animationsEnabled() && !prefersReducedMotion();
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

/**
 * A collision "crash": flag the destroyed monster for a squash-and-fade knockout
 * (kept alive so its sprite is still drawn through the animation — the settled
 * final render removes it, staying in sync with the engine), give the survivor a
 * brief recoil pulse, and kick up a dust puff at the impact tile. The survivor is
 * whichever living monster shares the collision tile and isn't the loser.
 */
function applyCrash(r: RenderState, loserId: string, tile: Pos | null): RenderState {
  const winner = tile
    ? r.monsters.find((m) => m.alive && m.id !== loserId && samePos(m.pos, tile))
    : undefined;
  const monsters = r.monsters.map((m) => {
    if (m.id === loserId) return { ...m, fx: 'knockout' as const };
    if (winner && m.id === winner.id) return { ...m, fx: 'recoil' as const };
    return m;
  });
  const puffs = tile
    ? [...r.puffs, { id: `puff-${loserId}-${tile.x}-${tile.y}`, pos: tile }]
    : r.puffs;
  return { ...r, monsters, puffs };
}

/** Mutations + sounds gathered for one simultaneity tick. */
interface Round {
  applies: ((r: RenderState) => RenderState)[];
  sounds: (() => void)[];
  hasKill: boolean;
  monsterSounded: boolean; // one footstep thump per step-tick (see buildFrames)
}

/** Add a crash burst (smoke + sparkles) at a tile to the render's puff list. */
function addPuff(r: RenderState, id: string, pos: Pos): RenderState {
  return { ...r, puffs: [...r.puffs, { id, pos }] };
}

function buildFrames(
  trace: readonly TraceEvent[],
  opts: { playerCrashTile?: Pos | null } = {},
): Frame[] {
  // Batch the turn into rounds keyed by TraceMove.round so every monster steps
  // at the same tick (mummies twice, scorpions once) instead of one-after-
  // another. Gate/kill events attach to the round of the move that caused them.
  // Applying a whole round in a single setRender lets the CSS transition slide
  // all sprites together. The exit walk-out stays a sequential player-only path.
  const rounds = new Map<number, Round>();
  const exits: { path: readonly RenderState['player'][] }[] = [];
  let lastRound = 0;
  let lastMoveTo: Pos | null = null; // most recent hop's destination (the crash tile)

  const bucket = (round: number): Round => {
    let b = rounds.get(round);
    if (!b) {
      b = { applies: [], sounds: [], hasKill: false, monsterSounded: false };
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
        lastMoveTo = to;
        b.applies.push((r) => setActorPos(r, actor, to));
        if (actor === 'player') {
          b.sounds.push(sfx.step);
        } else if (!b.monsterSounded) {
          // One footstep thump per step-TICK (round), not one per turn: all
          // monsters stepping together this tick share the footfall, so a mummy's
          // two steps land as two distinct footsteps (round 1, then round 2).
          b.monsterSounded = true;
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
        const loserId = ev.actor;
        const tile = lastMoveTo;
        b.applies.push((r) => applyCrash(r, loserId, tile));
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
    // Round 0 is the player's hop; rounds >= 1 are the slower monster step-ticks.
    const base = round === 0 ? PLAYER_HOP_MS : MONSTER_HOP_MS;
    frames.push({
      dur: hasKill ? base + KILL_MS : base,
      apply: (r) => applies.reduce((acc, fn) => fn(acc), r),
      sound: sounds.length ? () => sounds.forEach((s) => s()) : undefined,
    });
  }
  for (const ex of exits) {
    for (const p of ex.path) frames.push({ dur: PLAYER_HOP_MS, apply: (r) => ({ ...r, player: p }) });
    frames.push({ dur: PLAYER_HOP_MS, apply: (r) => ({ ...r, playerOpacity: 0 }) });
  }

  const hadKill = [...rounds.values()].some((b) => b.hasKill);
  // Player got caught (or walked onto a monster): a crash burst at the collision.
  if (opts.playerCrashTile) {
    const tile = opts.playerCrashTile;
    frames.push({
      dur: PLAYER_HOP_MS,
      apply: (r) => addPuff(r, `puff-player-${tile.x}-${tile.y}`, tile),
      sound: sfx.merge,
    });
  }
  // Hold so the smoke + sparkles finish before the settle clears the puffs and
  // drops the knocked-out sprite.
  if (hadKill || opts.playerCrashTile) {
    frames.push({ dur: CRASH_HOLD_MS, apply: (r) => r });
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
  const spawningRef = useRef(false); // true only while the spawn-in intro plays
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
      spawningRef.current = false;
      setAnimating(false);
      setRender(toRender(target));
    },
    [cancel],
  );

  /**
   * The one-time spawn-in intro: the board starts in total darkness while the
   * explorer walks in from just off the right edge, hopping west along its start
   * row into its real cell, then the lights lift (a full reveal on lit levels; the
   * normal torch view on dark ones). With the board lit, the enemy tiles rise up
   * out of the floor like elevators (tile + enemy together) and the risen enemies
   * turn to face the player with a scare sting. It is a pure visual pre-roll — the
   * committed engine state is already the true start — so any input cancels it
   * (see `move`). With animations off or reduced motion, we just snap to the
   * settled board.
   */
  const playSpawn = useCallback(
    (startState: GameState) => {
      if (!spawnMotionOK()) {
        snap(startState);
        return;
      }
      const lvl = startState.level;
      const start = startState.player;
      const offX = Math.min(lvl.width, start.x + MAX_SPAWN_HOPS);
      const base = toRender(startState);
      if (offX <= start.x) {
        // No room to walk in (start already at/over the right edge): just reveal.
        snap(startState);
        return;
      }
      const startRender: RenderState = {
        ...base,
        spawn: 'dark',
        playerFacing: 'W',
        player: { x: offX, y: start.y },
      };
      const frames: Frame[] = [{ dur: SPAWN_HOLD_MS, apply: (r) => r }];
      for (let x = offX - 1; x >= start.x; x--) {
        const px = x;
        frames.push({
          dur: SPAWN_HOP_MS,
          apply: (r) => ({ ...r, player: { x: px, y: start.y }, playerFacing: 'W' }),
          sound: sfx.step,
        });
      }
      // Lights on: lift the black overlay. The explorer is already home. The
      // enemy tiles stay sunk as dark pits (Board draws the enemies in the riser
      // layer, not the normal one, for every spawn phase after 'dark').
      frames.push({ dur: SPAWN_REVEAL_MS, apply: (r) => ({ ...r, spawn: 'reveal' }) });
      // Then the enemy elevator: a beat with the pits showing, the tiles + enemies
      // grinding up out of the floor, and finally the enemies whipping around to
      // face the player with a scare sting. Skipped when the level has no enemies.
      if (base.monsters.some((m) => m.alive)) {
        frames.push({ dur: SPAWN_PIT_HOLD_MS, apply: (r) => r });
        frames.push({ dur: SPAWN_RISE_MS, apply: (r) => ({ ...r, spawn: 'rise' }), sound: sfx.rumble });
        // A short beat with the enemies risen and still, so the head-turn + roar
        // don't tread on the tail of the stone-drag rise sound.
        frames.push({ dur: SPAWN_TURN_DELAY_MS, apply: (r) => r });
        frames.push({ dur: SPAWN_TURN_MS, apply: (r) => ({ ...r, spawn: 'turn' }), sound: sfx.scare });
      }
      spawningRef.current = true;
      play(frames, startRender, base, () => {
        spawningRef.current = false;
      });
    },
    [play, snap],
  );

  /** Cut the intro short and settle on the committed start (called on any input). */
  const finishSpawn = useCallback(() => {
    cancel();
    spawningRef.current = false;
    animatingRef.current = false;
    setAnimating(false);
    setRender(toRender(historyRef.current.present));
  }, [cancel]);

  const move = useCallback(
    (action: Action) => {
      if (spawningRef.current) finishSpawn(); // any input skips the spawn intro
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
      // A monster catching the player (or the player walking onto one) is a crash
      // too — burst smoke + sparkles at the collision tile before the overlay.
      const caughtLoss =
        next.phase === 'lost' &&
        (next.lossReason === 'caught' || next.lossReason === 'walked-into-monster');
      const playerCrashTile = caughtLoss ? next.player : null;
      play(buildFrames(trace, { playerCrashTile }), startRender, finalRender, settle);
    },
    [play, snap, finishSpawn],
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
      // A freshly loaded level is a fresh start: play the spawn-in intro.
      playSpawn(initGame(l));
    },
    [playSpawn],
  );

  // Play the spawn intro once when the game first mounts. useLayoutEffect so the
  // first (dark) frame paints before the browser shows the revealed board — no
  // flash of the lit board before darkness. Undo/restart/replay never re-trigger.
  const playSpawnRef = useRef(playSpawn);
  playSpawnRef.current = playSpawn;
  useLayoutEffect(() => {
    playSpawnRef.current(historyRef.current.present);
    return cancel;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
