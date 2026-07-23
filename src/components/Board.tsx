import { type CSSProperties, Fragment, memo, useLayoutEffect, useRef } from 'react';
import {
  type Action,
  type Dir,
  type Level,
  type Pos,
  DIRS,
  canCross,
  inBounds,
  monsterStep,
  neighbor,
  samePos,
} from '../engine';
import { isLit } from '../game/flashlight';
import type { RenderState } from '../game/render';
import { boardTextures } from '../game/textures';
import { BoardAnnotations } from './BoardAnnotations';
import { ExplorerSprite, MonsterSprite } from './sprites/CharacterSprites';
import {
  MummySheet,
  SpawnMummyHeadTurn,
  MUMMY_WALK_FRAMES,
  isMummyKind,
  moveFacing,
  mummyFacing,
  mummyVariant,
  mummyWalkRow,
  type Facing8,
} from './sprites/MummySheet';
import { KeyDecal, TrapDecal } from './sprites/TileDecals';
import './Board.css';

function spriteStyle(pos: Pos, cell: number): CSSProperties {
  return { transform: `translate(${pos.x * cell}px, ${pos.y * cell}px)` };
}

/** Fixed radial angles (deg) for the sparkles flung from a crash impact. */
const CRASH_SPARK_ANGLES = [8, 62, 128, 182, 246, 312];

/** Per-hop compositor animation durations (Web Animations API). Each is kept just
 *  a HAIR under its matching timeline hold (PLAYER_HOP_MS / MONSTER_HOP_MS in
 *  useAnimatedGame) so a hop finishes and rests a few ms before the next round —
 *  the "super short pause" between a mummy's two steps, not a hard stop. Monsters
 *  hop about 2× slower than the player so their pursuit reads as a deliberate
 *  walk (the player's own move stays snappy/responsive). */
const PLAYER_ANIM_MS = 290;
const MONSTER_ANIM_MS = 580;
/** Gentle, near-linear ease: each single step is a slow even glide that only eases
 *  slightly at its ends, so it reads as a deliberate WALK to each tile with a faint
 *  slowdown between a mummy's two steps — not a fast lunge-then-freeze. */
const HOP_EASING = 'cubic-bezier(0.4, 0.2, 0.6, 0.8)';

/**
 * The translate() for a sprite standing in `pos`. Nudged slightly UP-LEFT within
 * its tile for a pre-rendered "standing in the cell" read — the vertical lift
 * reads as depth; the horizontal nudge is small so sprites stay centred L-R.
 */
function charTranslate(pos: Pos, cell: number): string {
  const nudgeX = cell * 0.03;
  const nudgeY = cell * 0.07;
  return `translate(${pos.x * cell - nudgeX}px, ${pos.y * cell - nudgeY}px)`;
}

/**
 * Like `spriteStyle` but with the standing-in-cell nudge. Used for the player,
 * monsters, and the start marker (which must track the feet) — NOT for board
 * furniture like the exit opening/beacon, which stay tile-aligned.
 */
function charStyle(pos: Pos, cell: number): CSSProperties {
  return { transform: charTranslate(pos, cell) };
}

/** Cardinal direction from `from` toward `to`, by the dominant axis. */
function faceToward(from: Pos, to: Pos): Dir {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx === 0 && dy === 0) return 'S';
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'E' : 'W';
  return dy > 0 ? 'S' : 'N';
}

/**
 * Facing is applied as a horizontal mirror only (never a rotation): flipping
 * left/right keeps the sprite upright and its separate ground shadow correct,
 * while still turning the side-on scorpion toward its target.
 */
function mirrorStyle(facing: Dir): CSSProperties {
  return facing === 'W' ? { transform: 'scaleX(-1)' } : {};
}

/**
 * A single extruded wall block on a tile boundary.
 * `orient: 'h'` sits on the horizontal line above tile column `x` at row line
 * `y` (the boundary between rows y-1 and y); `orient: 'v'` sits on the vertical
 * line left of tile row `y` at column line `x`.
 */
interface WallSeg {
  orient: 'h' | 'v';
  x: number;
  y: number;
}

/**
 * Collapse the level's per-cell wall flags plus the board perimeter into a
 * deduped list of boundary segments, skipping the single edge the exit cuts
 * through. Interior boundaries are drawn once (unioning the flags each adjacent
 * cell reports for that shared edge).
 */
function computeWallSegments(level: Level): WallSeg[] {
  const { width: w, height: h, cells, exit } = level;
  const segs: WallSeg[] = [];

  const exitH = exit.dir === 'N' || exit.dir === 'S';
  const exitLineY = exit.dir === 'N' ? 0 : exit.dir === 'S' ? h : -1;
  const exitLineX = exit.dir === 'W' ? 0 : exit.dir === 'E' ? w : -1;

  // Horizontal boundaries: lines y = 0..h, one segment per column x.
  for (let y = 0; y <= h; y++) {
    for (let x = 0; x < w; x++) {
      if (exitH && y === exitLineY && x === exit.pos.x) continue;
      const wall =
        y === 0
          ? true
          : y === h
            ? true
            : cells[y][x].walls.N || cells[y - 1][x].walls.S;
      if (wall) segs.push({ orient: 'h', x, y });
    }
  }

  // Vertical boundaries: lines x = 0..w, one segment per row y.
  for (let x = 0; x <= w; x++) {
    for (let y = 0; y < h; y++) {
      if (!exitH && x === exitLineX && y === exit.pos.y) continue;
      const wall =
        x === 0
          ? true
          : x === w
            ? true
            : cells[y][x].walls.W || cells[y][x - 1].walls.E;
      if (wall) segs.push({ orient: 'v', x, y });
    }
  }

  return segs;
}

/**
 * Build a real extruded-prism shadow: a continuous stack of 1px-stepped solid
 * offsets from the top face down to the base, so the side faces connect the top
 * face's corners to the base's corners (a single big offset would read as two
 * detached rectangles). A final blurred layer casts onto the floor below-right.
 * Light source is top-left, so the extrusion runs down-right.
 */
function extrudeShadow(liftPx: number, sideColor: string): string {
  const layers: string[] = [];
  for (let i = 1; i <= liftPx; i++) {
    layers.push(`${i}px ${i}px 0 0 ${sideColor}`);
  }
  layers.push(`${liftPx + 2}px ${liftPx + 4}px 6px 0 rgba(40, 26, 0, 0.42)`);
  return layers.join(', ');
}

const segKey = (x: number, y: number) => `${x},${y}`;

/**
 * A wall is a slim slab straddling its boundary line. Because the block is lit
 * top-left and casts its body down-right, the top face reads as shifted UP-LEFT
 * of its base, so we ALWAYS overhang the leading (left / top) end by half the
 * thickness — that up-left overhang is the 3D read and knits most corners.
 *
 * The trailing (right / bottom) end stays flush by default (so a free end never
 * spills into an empty neighbour where the shadow already lives) — UNLESS a
 * perpendicular wall meets it there, in which case we overhang it too. That
 * extension lands on the adjoining wall (never open floor), closing the square
 * corner gap that otherwise appears where two trailing ends meet (e.g. a
 * bottom-right corner). `hSet`/`vSet` hold every drawn wall segment.
 */
function wallStyle(
  seg: WallSeg,
  cell: number,
  hSet: Set<string>,
  vSet: Set<string>,
): CSSProperties {
  const thick = cell * 0.15;
  const half = thick / 2;
  if (seg.orient === 'h') {
    const { x, y } = seg;
    const left = half; // leading overhang (always)
    // A vertical wall meets the right node (x+1,y) if one sits just above/below.
    const right = vSet.has(segKey(x + 1, y)) || vSet.has(segKey(x + 1, y - 1)) ? half : 0;
    return {
      transform: `translate(${x * cell - left}px, ${y * cell - half}px)`,
      width: cell + left + right,
      height: thick,
    };
  }
  const { x, y } = seg;
  const top = half; // leading overhang (always)
  const bottom = hSet.has(segKey(x, y + 1)) || hSet.has(segKey(x - 1, y + 1)) ? half : 0;
  return {
    transform: `translate(${x * cell - half}px, ${y * cell - top}px)`,
    width: thick,
    height: cell + top + bottom,
  };
}

/** The boundary segment a gate occupies, so it renders as a wall-like slab. */
function gateSeg(g: { a: Pos; dir: Dir }): WallSeg {
  switch (g.dir) {
    case 'N':
      return { orient: 'h', x: g.a.x, y: g.a.y };
    case 'S':
      return { orient: 'h', x: g.a.x, y: g.a.y + 1 };
    case 'W':
      return { orient: 'v', x: g.a.x, y: g.a.y };
    default: // 'E'
      return { orient: 'v', x: g.a.x + 1, y: g.a.y };
  }
}

/**
 * Static floor grid: the textured checker cells plus any trap/key decals. Depends
 * only on the level + cell size, so it is memoized and does NOT re-render while a
 * turn animates (only the sprites move) — the single biggest render-cost saving.
 */
const BoardFloor = memo(function BoardFloor({
  level,
  markerSize,
}: {
  level: Level;
  cell: number;
  markerSize: number;
}) {
  return (
    <div className="board__grid">
      {level.cells.map((row, y) =>
        row.map((cellData, x) => {
          const checker = (x + y) % 2 === 0 ? 'cell--a' : 'cell--b';
          return (
            <div key={`${x},${y}`} className={`cell ${checker}`}>
              {cellData.trap && <TrapDecal className="cell__marker" size={markerSize} />}
              {cellData.key && <KeyDecal className="cell__marker" size={markerSize} />}
            </div>
          );
        }),
      )}
    </div>
  );
});

/** Static overlay: baked AO vignette, grain film, and the exit opening. */
const BoardStaticOverlay = memo(function BoardStaticOverlay({
  level,
  cell,
}: {
  level: Level;
  cell: number;
}) {
  const w = cell * level.width;
  const h = cell * level.height;
  return (
    <>
      <div className="board__ao" style={{ width: w, height: h }} aria-hidden="true" />
      <div className="board__grain" style={{ width: w, height: h }} aria-hidden="true" />
      {/* On dark levels the exit is drawn ABOVE the dark overlay instead (see the
          dark block in Board), so it stays visible; omit it here to avoid a hidden
          duplicate under the black. */}
      {!level.dark && <ExitOpening pos={level.exit.pos} dir={level.exit.dir} cell={cell} />}
    </>
  );
});

/**
 * Extruded walls + gates, drawn in two planes (shadow under, top over). Depends
 * on the level, cell, and which gates are open — so it re-renders only on a gate
 * toggle, never on every sprite hop.
 */
const BoardWalls = memo(function BoardWalls({
  level,
  cell,
  gatesOpen,
}: {
  level: Level;
  cell: number;
  gatesOpen: RenderState['gatesOpen'];
}) {
  const walls = computeWallSegments(level);
  const hSet = new Set<string>();
  const vSet = new Set<string>();
  for (const s of walls) (s.orient === 'h' ? hSet : vSet).add(segKey(s.x, s.y));

  return (
    <div className="board__walls">
      {walls.map((seg) => (
        <div
          key={`sh-${seg.orient}-${seg.x}-${seg.y}`}
          className="wall-shadow"
          style={wallStyle(seg, cell, hSet, vSet)}
        />
      ))}
      {level.gates.map((g) =>
        gatesOpen[g.id] ? null : (
          <div
            key={`gsh-${g.id}`}
            className="wall-shadow"
            style={wallStyle(gateSeg(g), cell, hSet, vSet)}
          />
        ),
      )}
      {walls.map((seg) => (
        <div
          key={`tp-${seg.orient}-${seg.x}-${seg.y}`}
          className="wall-top"
          style={wallStyle(seg, cell, hSet, vSet)}
        />
      ))}
      {level.gates.map((g) => {
        const seg = gateSeg(g);
        const open = gatesOpen[g.id];
        return (
          <div
            key={`gtp-${g.id}`}
            className={`wall-top gate-top gate-top--${seg.orient} ${open ? 'gate-top--open' : ''}`}
            style={wallStyle(seg, cell, hSet, vSet)}
          />
        );
      })}
    </div>
  );
});

// Move-arrow, authored pointing up (N) as smooth high-res vector. A COMPACT, WIDE,
// roughly-equilateral arrowhead with a CONCAVE notched back (a stout dart) — not a
// tall spike, no separate shaft. Saturated arcade green fills ~80% of it. Light is
// from the upper-left, so a NARROW yellow highlight sits on the lit edge and the
// notch and FADES into the body (soft, blurred — not a hard stripe); a subtle
// darker green shades the shadow edge. The outline is a thin dark edge, not a
// dominant frame. The whole thing rotates per direction (light fixed to the arrow).
const DART_BODY = 'M12 3 L20 17 L12 11.5 L4 17 Z';
const DART_LIT = 'M12 3 L4 17 L12 11.5'; // left outer edge + left notch (toward light)
const DART_SHADE = 'M12 3 L20 17 L12 11.5'; // right outer edge + right notch (shadow)
const ARROW_DEG: Record<Dir, number> = { N: 0, E: 90, S: 180, W: 270 };

/** A clickable vector dart on each tile the explorer can step to (opt-in aid). */
const MoveArrows = memo(function MoveArrows({
  level,
  player,
  monsters,
  gatesOpen,
  cell,
  onMove,
}: {
  level: Level;
  player: Pos;
  monsters: RenderState['monsters'];
  gatesOpen: RenderState['gatesOpen'];
  cell: number;
  onMove: (dir: Dir) => void;
}) {
  const size = Math.round(cell * 0.74);
  return (
    <>
      {DIRS.filter((dir) => {
        const to = neighbor(player, dir);
        if (!inBounds(level, to) || !canCross(level, gatesOpen, player, dir)) return false;
        // Skip tiles holding a living monster — stepping there is instant death,
        // never a move you'd offer as a one-click option.
        return !monsters.some((m) => m.alive && samePos(m.pos, to));
      }).map((dir) => {
        const clip = `dart-clip-${dir}`;
        const blur = `dart-blur-${dir}`;
        const to = neighbor(player, dir);
        return (
          <button
            key={dir}
            type="button"
            className="move-arrow"
            aria-label={`Move ${dir}`}
            style={spriteStyle(to, cell)}
            onClick={() => onMove(dir)}
          >
            <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
              <defs>
                <clipPath id={clip}>
                  <path d={DART_BODY} />
                </clipPath>
                <filter id={blur} x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="0.7" />
                </filter>
              </defs>
              <g transform={`rotate(${ARROW_DEG[dir]} 12 12)`}>
                {/* saturated green body — the dominant colour */}
                <path d={DART_BODY} fill="#33d13b" />
                {/* soft bevel shading, clipped inside the silhouette and blurred so
                    it FADES into the body: a subtle shadow, then a NARROW yellow
                    highlight accent on the lit edge + notch. */}
                <g clipPath={`url(#${clip})`} filter={`url(#${blur})`}>
                  <path d={DART_SHADE} fill="none" stroke="#0f8027" strokeWidth="2.8" opacity="0.9" />
                  <path d={DART_LIT} fill="none" stroke="#ffe863" strokeWidth="2.2" opacity="1" />
                </g>
                {/* thin dark edge — subtle, not a frame */}
                <path
                  d={DART_BODY}
                  fill="none"
                  stroke="#123f18"
                  strokeWidth="0.9"
                  strokeLinejoin="miter"
                />
              </g>
            </svg>
          </button>
        );
      })}
    </>
  );
});

/**
 * The spawn-intro enemy elevator. Each living enemy's start tile is a stone slab
 * riding up out of a dark pit, carrying the enemy, then the enemy's head turns.
 * Rendered only during the spawn intro (the normal monster layer is suppressed
 * meanwhile). Phase → class:
 *   'reveal' → slabs held sunk in their pits (only the dark holes show).
 *   'rise'   → slabs + enemies grind up to flush (slow linear stone rise).
 *   'turn'   → the risen enemies' heads turn (SpawnHead3D).
 *
 * CRUCIAL layering: each enemy is drawn in TWO planes so the maze stays intact —
 * a floor plane (pit + slab) BELOW the walls, so a wall touching this tile is
 * never covered by the pit, and an enemy plane ABOVE the walls. Both use the SAME
 * `.spawn-riser__lift` animation, so they rise in perfect lockstep.
 */
function SpawnRisers({
  monsters,
  player,
  level,
  phase,
  cell,
  charSize,
}: {
  monsters: RenderState['monsters'];
  player: Pos;
  level: Level;
  phase: 'reveal' | 'rise' | 'turn';
  cell: number;
  charSize: number;
}) {
  const depth = Math.round(cell * 1.15);
  const nudgeX = cell * 0.03;
  const nudgeY = cell * 0.07;
  const mummySize = Math.round(cell * 1.1);
  const mummyNudgeY = 0;
  const liftClass =
    phase === 'reveal'
      ? ' spawn-riser__lift--down'
      : phase === 'rise'
        ? ' spawn-riser__lift--rising'
        : '';
  const turnActive = phase === 'turn' ? ' spawn-riser__turn--active' : '';
  return (
    <>
      {monsters
        .filter((m) => m.alive)
        .map((m) => {
          const isMummy = m.kind.startsWith('mummy');
          const variant = m.kind.endsWith('red') ? 'red' : 'white';
          // The rising slab must match the CHECKER parity of the tile it lands on
          // (BoardFloor: (x+y) even = floor A, odd = floor B), or it flashes the
          // wrong floor colour until the intro settles into the real cell.
          const blockKind = (m.pos.x + m.pos.y) % 2 === 0 ? 'a' : 'b';
          // Face the player exactly as the settled monster will (mirrorStyle +
          // faceToward), so the body doesn't flip L/R when the intro hands off to
          // the normal monster layer. Applied to the whole turn wrapper (body +
          // 3D head), so both match the mirrored settled sprite.
          const facing = mirrorStyle(faceToward(m.pos, player));
          const tileStyle = {
            transform: `translate(${m.pos.x * cell}px, ${m.pos.y * cell}px)`,
            '--rise-depth': `${depth}px`,
          } as CSSProperties;
          // Only raise the enemy plane's bottom clip when a horizontal wall is
          // actually on this tile's south edge (so the rising enemy never covers
          // its wall-top). With no such wall, keep the clip at the true floor line
          // so the enemy's legs reach the floor instead of being cut short.
          const sy = m.pos.y;
          const sx = m.pos.x;
          const southWall =
            sy + 1 >= level.height ||
            level.cells[sy][sx].walls.S ||
            level.cells[sy + 1][sx].walls.N;
          const enemyStyle = {
            ...tileStyle,
            '--enemy-clip-bottom': southWall ? 'calc(var(--cell) * 0.08)' : '0px',
          } as CSSProperties;
          return (
            <Fragment key={`riser-${m.id}`}>
              {/* Floor plane — BELOW the walls. The pit + the rising slab. */}
              <div className="spawn-riser-floor" style={tileStyle} aria-hidden="true">
                <span className="spawn-riser__pit" />
                <span className={`spawn-riser__lift${liftClass}`}>
                  <span className={`spawn-riser__block spawn-riser__block--${blockKind}`} />
                </span>
              </div>
              {/* Enemy plane — ABOVE the walls. The sprite, rising in lockstep. */}
              <div className="spawn-riser-enemy" style={enemyStyle} aria-hidden="true">
                <span className={`spawn-riser__lift${liftClass}`}>
                  <span
                    className="spawn-riser__sprite"
                    style={{ transform: `translate(${-nudgeX}px, ${-nudgeY}px)` }}
                  >
                    <span className="sprite__shadow" />
                    <span
                      className={`spawn-riser__turn${isMummy ? '' : turnActive}`}
                      style={isMummy ? undefined : facing}
                    >
                      {isMummy ? (
                        // The new mummy is the baked sheet. During 'turn' it plays
                        // the baked HEAD-TURN clip (body still, head spins 360°) —
                        // same model as the settled sprite, so the hand-off to the
                        // normal layer has no pop.
                        <span className="sprite__body" style={{ transform: `translateY(${mummyNudgeY}px)` }}>
                          {phase === 'turn' ? (
                            <SpawnMummyHeadTurn
                              variant={variant}
                              facing={mummyFacing(m.pos, player)}
                              size={mummySize}
                              durationMs={720}
                            />
                          ) : (
                            <MummySheet
                              variant={variant}
                              facing={mummyFacing(m.pos, player)}
                              size={mummySize}
                            />
                          )}
                        </span>
                      ) : (
                        <span className="sprite__body">
                          <MonsterSprite kind={m.kind} size={charSize} />
                        </span>
                      )}
                    </span>
                  </span>
                </span>
              </div>
            </Fragment>
          );
        })}
    </>
  );
}

interface BoardProps {
  level: Level;
  render: RenderState;
  /** Dynamic cell edge length in px, computed to fill the available pane. */
  cellSize: number;
  /** Show clickable move arrows on reachable tiles (persisted setting). */
  moveArrows?: boolean;
  /** True only when it's the player's turn and no animation is playing. */
  interactive?: boolean;
  /** Dispatch an action when an arrow (or the wait-on-your-tile oval) is used. */
  onMove?: (action: Action) => void;
}

export function Board({
  level,
  render,
  cellSize,
  moveArrows = false,
  interactive = false,
  onMove,
}: BoardProps) {
  const cell = cellSize;
  // Depth amount scales with the tile so the tilt reads the same at any size.
  const wallLift = Math.max(4, Math.round(cell * 0.12));
  const boardStyle = {
    '--cell': `${cell}px`,
    '--cols': level.width,
    '--rows': level.height,
    '--wall-extrude': extrudeShadow(wallLift, 'var(--wall-side)'),
    '--tex-floor-a': boardTextures.floorA,
    '--tex-floor-b': boardTextures.floorB,
    '--tex-wall-top': boardTextures.wallTop,
    '--tex-grain': boardTextures.grain,
  } as CSSProperties;

  const markerSize = Math.round(cell * 0.66);
  const charSize = Math.round(cell * 0.82);
  // The mummy is a baked sheet; the figure is centred in the frame (x 25..103 of
  // 128) with feet at ~77%. Size ≈ the tile so the sprite barely overhangs the
  // square; centred → feet land on the shadow (~80% of the tile).
  const mummySize = Math.round(cell * 1.1);
  const mummyNudgeY = 0;

  // Dark levels (SPEC §2.7): a torchlight overlay that follows the explorer.
  // View-only — the engine never sees this. Light is centred on the explorer's
  // current (animating) render position so the pool glides with the sprite.
  const dark = level.dark;
  const lightStyle: CSSProperties | undefined = dark
    ? ({
        '--light-x': `${(render.player.x + 0.5) * cell}px`,
        '--light-y': `${(render.player.y + 0.5) * cell}px`,
        '--light-r': `${dark.radius * cell}px`,
        '--light-r2': `${(dark.radius + 1.1) * cell}px`,
        width: cell * level.width,
        height: cell * level.height,
      } as CSSProperties)
    : undefined;
  // For the planning arrows: if `from` holds a living MUMMY and `to` is exactly a
  // double-step (Manhattan distance 2) away that the mummy can actually reach in
  // its 2 steps, return the routed path (start -> intermediate -> to) using the
  // real pursuit rules toward that target — so red routes vertical-first, white
  // horizontal-first, and walls redirect it. Otherwise null (=> straight arrow).
  // Only mummies double-step; scorpions/others => null.
  const mummyPath = (from: Pos, to: Pos): Pos[] | null => {
    const m = render.monsters.find((mm) => mm.alive && samePos(mm.pos, from));
    if (!m || !m.kind.startsWith('mummy')) return null;
    if (Math.abs(to.x - from.x) + Math.abs(to.y - from.y) !== 2) return null;
    const s1 = monsterStep(level, render.gatesOpen, m.kind, from, to);
    const s2 = monsterStep(level, render.gatesOpen, m.kind, s1, to);
    if (!samePos(s2, to) || samePos(s1, from)) return null; // can't reach in 2 steps
    return [from, s1, to];
  };

  // Robust sprite movement: drive each single-tile hop with the Web Animations
  // API so it runs on the COMPOSITOR and stays smooth on slow (mobile) main
  // threads. Relying on a CSS `transition` per setRender drops frames under load
  // and the hop reads as a teleport — the exact "enemies look static on mobile"
  // symptom. Compositor-driven WAAPI keeps each hop visible even when the main
  // thread is janky. Multi-tile jumps (undo / restart / animations-off snap) are
  // NOT animated; a 0-distance render change is a no-op.
  const spriteEls = useRef(new Map<string, HTMLElement>());
  const prevPos = useRef(new Map<string, Pos>());
  const setSpriteEl = (id: string) => (el: HTMLElement | null) => {
    if (el) spriteEls.current.set(id, el);
    else spriteEls.current.delete(id);
  };
  // The mummy's sheet background element (per monster), animated through its walk
  // cycle during a hop. Separate from the outer .sprite (which owns the position).
  const mummyEls = useRef(new Map<string, HTMLElement>());
  const setMummyEl = (id: string) => (el: HTMLElement | null) => {
    if (el) mummyEls.current.set(id, el);
    else mummyEls.current.delete(id);
  };
  // Facing rule: while taking a step the mummy looks the way it WALKS (the step
  // direction); once it has stopped it turns to face the PLAYER. So mid-hop =
  // step direction (prev → cur), settled = toward the player.
  const currentMummyFacing = (m: RenderState['monsters'][number]): Facing8 => {
    const prev = prevPos.current.get(m.id);
    const stepped = prev ? moveFacing(prev, m.pos) : null;
    return stepped ?? mummyFacing(m.pos, render.player);
  };
  useLayoutEffect(() => {
    const hop = (id: string, pos: Pos, dur: number) => {
      const el = spriteEls.current.get(id);
      const prev = prevPos.current.get(id);
      prevPos.current.set(id, pos);
      if (!el || !prev || typeof el.animate !== 'function') return;
      if (Math.abs(pos.x - prev.x) + Math.abs(pos.y - prev.y) !== 1) return; // snap, don't animate
      el.animate(
        [{ transform: charTranslate(prev, cell) }, { transform: charTranslate(pos, cell) }],
        { duration: dur, easing: HOP_EASING },
      );
    };
    hop('player', render.player, PLAYER_ANIM_MS);
    hop('player-oval', render.player, PLAYER_ANIM_MS);
    for (const m of render.monsters) {
      if (!m.alive) continue;
      const prev = prevPos.current.get(m.id); // capture BEFORE hop() overwrites it
      hop(m.id, m.pos, MONSTER_ANIM_MS);
      // A mummy that actually stepped plays its walk cycle: cycle the sheet's
      // walk-frame columns (steps) over the hop, in the row for its facing.
      if (isMummyKind(m.kind) && prev && Math.abs(m.pos.x - prev.x) + Math.abs(m.pos.y - prev.y) === 1) {
        const el = mummyEls.current.get(m.id);
        const dir = moveFacing(prev, m.pos); // the mummy walks facing its step
        if (el && dir && typeof el.animate === 'function') {
          const y = -mummyWalkRow(dir) * mummySize;
          const anim = el.animate(
            [
              { backgroundPosition: `0px ${y}px` },
              { backgroundPosition: `${-MUMMY_WALK_FRAMES * mummySize}px ${y}px` },
            ],
            { duration: MONSTER_ANIM_MS, easing: `steps(${MUMMY_WALK_FRAMES})` },
          );
          // when the step finishes, turn to face the player (frame 0).
          const faceRow = -mummyWalkRow(mummyFacing(m.pos, render.player)) * mummySize;
          anim.onfinish = () => {
            el.style.backgroundPosition = `0px ${faceRow}px`;
          };
        }
      }
    }
  }, [render, cell, mummySize]);

  return (
    <div className="board" style={boardStyle}>
      {/* Static floor grid — memoized, so it never re-renders while a turn plays. */}
      <BoardFloor level={level} cell={cell} markerSize={markerSize} />

      <div className="board__overlay">
        {/* Static overlay (AO vignette, grain film, exit) + walls/gates. Both are
            memoized: the only per-hop work left in the overlay is the sprites,
            the dark torchlight, and the annotations. */}
        <BoardStaticOverlay level={level} cell={cell} />
        <BoardWalls level={level} cell={cell} gatesOpen={render.gatesOpen} />

        {/* Dark levels: black torchlight overlay above walls/exit, below sprites,
            with a soft circular hole tracking the explorer. Plus a faint exit
            beacon so the goal direction is always sensed through the dark. */}
        {dark && (
          <>
            <div className="board__dark" style={lightStyle} />
            <div
              className="exit-beacon"
              style={spriteStyle(level.exit.pos, cell)}
              aria-hidden="true"
            />
            {/* The exit stays visible THROUGH the dark so the goal is always
                locatable — drawn above the black overlay (see BoardStaticOverlay,
                which omits it on dark levels to avoid a hidden duplicate). */}
            <div className="exit-in-dark">
              <ExitOpening pos={level.exit.pos} dir={level.exit.dir} cell={cell} />
            </div>
          </>
        )}

        {/* Dust puffs kicked up where two monsters crashed together. A separate,
            self-animating layer (below the sprites) so it neither forces a board
            re-render nor drags on the memoized floor/wall layers. */}
        {render.puffs.map((p) => (
          <div
            key={p.id}
            className="crash-fx"
            style={{ left: p.pos.x * cell, top: p.pos.y * cell }}
            aria-hidden="true"
          >
            <span className="crash-puff" />
            {CRASH_SPARK_ANGLES.map((a) => (
              <span key={a} className="crash-spark" style={{ '--a': `${a}deg` } as CSSProperties} />
            ))}
          </div>
        ))}

        {/* Monsters — each turns to face the player it is hunting. In the dark,
            a monster outside the torchlight shows only as faint glowing eyes.
            The `.sprite__fx` wrapper carries the crash animation (squash+fade for
            a knockout, a quick pulse for the survivor) so it never fights the
            outer position transform or the body's facing mirror. Suppressed during
            the spawn intro — the enemies are drawn in the riser layer instead as
            they ride up out of the floor (see SpawnRisers below). */}
        {!render.spawn &&
          render.monsters
          .filter((m) => m.alive)
          .map((m) => {
            const lit = !dark || isLit(render.player, m.pos, dark.radius);
            const facing = mirrorStyle(faceToward(m.pos, render.player));
            const fxClass = m.fx ? ` fx-${m.fx}` : '';
            return (
              <div
                key={m.id}
                ref={setSpriteEl(m.id)}
                className={`sprite sprite--monster${lit ? '' : ' sprite--eyes'}`}
                style={charStyle(m.pos, cell)}
              >
                {lit ? (
                  <span className={`sprite__fx${fxClass}`}>
                    <span className="sprite__shadow" />
                    {isMummyKind(m.kind) ? (
                      <span
                        className="sprite__body"
                        style={{ transform: `translateY(${mummyNudgeY}px)` }}
                      >
                        <MummySheet
                          ref={setMummyEl(m.id)}
                          variant={mummyVariant(m.kind)}
                          facing={currentMummyFacing(m)}
                          size={mummySize}
                        />
                      </span>
                    ) : (
                      <span className="sprite__body" style={facing}>
                        <MonsterSprite kind={m.kind} size={charSize} />
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="dark-eyes" style={facing}>
                    <span className="dark-eye" />
                    <span className="dark-eye" />
                  </span>
                )}
              </div>
            );
          })}

        {/* Wait-on-your-tile affordance — only when the move-arrows setting is on
            (same opt-in as the click-to-move darts) and it's an interactive turn.
            TWO planes: the gold locator oval sits BELOW the sprite (rings the feet,
            never covers the explorer); the transparent hit target sits ABOVE the
            annotations SVG so it actually receives hover/click. The oval is
            revealed only while the hit target is hovered/focused (CSS :has), and
            clicking waits one turn (same as Space). Both track the feet via
            charStyle. */}
        {moveArrows && interactive && onMove && (
          <>
            <div
              className="player-oval-ring"
              style={charStyle(render.player, cell)}
              aria-hidden="true"
            />
            <button
              type="button"
              ref={setSpriteEl('player-oval')}
              className="player-oval"
              style={charStyle(render.player, cell)}
              aria-label="Wait one turn"
              onClick={() => onMove('wait')}
            />
          </>
        )}

        {/* Explorer — faces its last move direction. */}
        <div
          ref={setSpriteEl('player')}
          className="sprite sprite--player"
          style={{ ...charStyle(render.player, cell), opacity: render.playerOpacity }}
        >
          <span className="sprite__shadow" />
          <span className="sprite__body" style={mirrorStyle(render.playerFacing)}>
            <ExplorerSprite size={charSize} />
          </span>
        </div>

        {/* Enemy elevator: on every spawn phase after the curtain lifts, the
            enemies ride up out of the floor on their own tiles and then whip
            around to face the player. Drawn above the walls/exit and the dark
            overlay so the reveal is always visible, even on dark levels. */}
        {(render.spawn === 'reveal' || render.spawn === 'rise' || render.spawn === 'turn') && (
          <SpawnRisers
            monsters={render.monsters}
            player={render.player}
            level={level}
            phase={render.spawn}
            cell={cell}
            charSize={charSize}
          />
        )}

        {/* Spawn-in intro: a full-black curtain over the whole field (above walls,
            gates, exit, and monsters at z6, but below the explorer at z7 so it can
            be seen walking in). `--dark` is opaque; `--reveal` fades it out to lift
            the lights (revealing the board, or the torch view on dark levels).
            Only for the dark/reveal phases — by the time the enemies rise it is
            gone. */}
        {(render.spawn === 'dark' || render.spawn === 'reveal') && (
          <div
            className={`board__spawn board__spawn--${render.spawn}`}
            style={{ width: cell * level.width, height: cell * level.height }}
            aria-hidden="true"
          />
        )}

        {/* Opt-in click-to-move arrows on every reachable tile. Only while it's
            the player's settled turn, so mid-animation clicks can't queue moves. */}
        {moveArrows && interactive && onMove && (
          <MoveArrows
            level={level}
            player={render.player}
            monsters={render.monsters}
            gatesOpen={render.gatesOpen}
            cell={cell}
            onMove={onMove}
          />
        )}

        {/* Chess.com-style planning arrows (right-click-drag). UI only. When an
            arrow starts on a MUMMY and ends on where that mummy's deterministic
            2-step turn lands, the arrow bends through the intermediate tile so
            the double-step (esp. red = vertical-first) is visible. */}
        <BoardAnnotations
          cell={cell}
          width={level.width}
          height={level.height}
          levelId={level.id}
          enemyPath={mummyPath}
        />
      </div>
    </div>
  );
}

/**
 * Draws a doorway gap in the border wall with a short outward passage and a
 * couple of steps. Authored in "north" orientation, then rotated to whichever
 * border the exit sits on.
 */
function ExitOpening({ pos, dir, cell }: { pos: Pos; dir: Dir; cell: number }) {
  // Authored in "north" orientation (stairs descend toward the top border edge),
  // then rotated onto whichever border the exit sits on. Stays WITHIN the tile so
  // it never pokes into the ornate frame.
  const deg = dir === 'N' ? 0 : dir === 'E' ? 90 : dir === 'S' ? 180 : 270;
  const cx = cell / 2;
  const gid = `exitglow-${pos.x}-${pos.y}`;

  // A descending staircase in false perspective: near steps low and wide, far
  // steps high and narrow, each a lit top face over a shadowed front riser, with
  // a dark opening beyond and a warm daylight glow bleeding in.
  const N = 4;
  const steps = Array.from({ length: N }, (_, i) => {
    const t0 = i / N;
    const t1 = (i + 1) / N;
    const y = cell * (0.7 - 0.52 * t0); // top face y (higher = further out)
    const yNext = cell * (0.7 - 0.52 * t1);
    const halfW = cell * (0.36 - 0.12 * t0);
    const riser = y - yNext; // front face height
    const shade = 0.62 - 0.12 * i;
    return { y, halfW, riser, top: `rgb(${216 - i * 10},${192 - i * 12},${138 - i * 12})`, front: `rgba(70,50,24,${shade})` };
  });

  return (
    <svg
      className="exit-opening"
      width={cell}
      height={cell}
      viewBox={`0 0 ${cell} ${cell}`}
      style={spriteStyle(pos, cell)}
    >
      <defs>
        <radialGradient id={gid} cx="50%" cy="18%" r="70%">
          <stop offset="0%" stopColor="rgba(255,244,206,0.9)" />
          <stop offset="45%" stopColor="rgba(246,222,150,0.5)" />
          <stop offset="100%" stopColor="rgba(246,222,150,0)" />
        </radialGradient>
      </defs>
      <g transform={`rotate(${deg} ${cx} ${cx})`}>
        {/* warm daylight glow from beyond the opening */}
        <rect x={0} y={0} width={cell} height={cell * 0.7} fill={`url(#${gid})`} />
        {/* dark opening beyond the top step */}
        <rect x={cx - cell * 0.24} y={0} width={cell * 0.48} height={cell * 0.2} fill="#1c1309" />
        {/* receding steps, far (top) first so nearer steps overlap correctly */}
        {steps
          .slice()
          .reverse()
          .map((s, idx) => (
            <g key={idx}>
              <rect x={cx - s.halfW} y={s.y} width={s.halfW * 2} height={s.riser + 1} fill={s.front} />
              <rect x={cx - s.halfW} y={s.y - cell * 0.045} width={s.halfW * 2} height={cell * 0.05} fill={s.top} />
            </g>
          ))}
      </g>
    </svg>
  );
}
