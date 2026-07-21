import { Key, Skull } from 'lucide-react';
import type { CSSProperties } from 'react';
import { type Dir, type Level, type Pos, monsterStep, samePos } from '../engine';
import { isLit } from '../game/flashlight';
import type { RenderState } from '../game/render';
import { BoardAnnotations } from './BoardAnnotations';
import { ExplorerSprite, MonsterSprite } from './sprites/CharacterSprites';
import './Board.css';

function spriteStyle(pos: Pos, cell: number): CSSProperties {
  return { transform: `translate(${pos.x * cell}px, ${pos.y * cell}px)` };
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

interface BoardProps {
  level: Level;
  render: RenderState;
  /** Dynamic cell edge length in px, computed to fill the available pane. */
  cellSize: number;
}

export function Board({ level, render, cellSize }: BoardProps) {
  const cell = cellSize;
  // Depth amount scales with the tile so the tilt reads the same at any size.
  const wallLift = Math.max(4, Math.round(cell * 0.12));
  const boardStyle = {
    '--cell': `${cell}px`,
    '--cols': level.width,
    '--rows': level.height,
    '--wall-extrude': extrudeShadow(wallLift, 'var(--wall-side)'),
  } as CSSProperties;

  const markerSize = Math.round(cell * 0.46);
  const charSize = Math.round(cell * 0.82);
  const walls = computeWallSegments(level);

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
  // Lookup of every drawn wall segment, so wallStyle can close corner gaps.
  const hSet = new Set<string>();
  const vSet = new Set<string>();
  for (const s of walls) (s.orient === 'h' ? hSet : vSet).add(segKey(s.x, s.y));

  // For the planning arrows: given a tile, if a living MUMMY sits there, return
  // its deterministic step path THIS turn (start -> intermediate -> destination),
  // computed against the current player position with the real pursuit rules
  // (red steps vertical-first). Only mummies double-step; scorpions/others => null.
  const mummyPathFrom = (from: Pos): Pos[] | null => {
    const m = render.monsters.find((mm) => mm.alive && samePos(mm.pos, from));
    if (!m || !m.kind.startsWith('mummy')) return null;
    const s1 = monsterStep(level, render.gatesOpen, m.kind, m.pos, render.player);
    const s2 = monsterStep(level, render.gatesOpen, m.kind, s1, render.player);
    const path: Pos[] = [m.pos];
    if (!samePos(s1, path[path.length - 1])) path.push(s1);
    if (!samePos(s2, path[path.length - 1])) path.push(s2);
    return path;
  };

  return (
    <div className="board" style={boardStyle}>
      <div className="board__grid">
        {level.cells.map((row, y) =>
          row.map((cellData, x) => {
            const checker = (x + y) % 2 === 0 ? 'cell--a' : 'cell--b';
            return (
              <div key={`${x},${y}`} className={`cell ${checker}`}>
                {cellData.trap && (
                  <Skull className="cell__marker" size={markerSize} color="#8a2b2b" />
                )}
                {cellData.key && (
                  <Key className="cell__marker" size={markerSize} color="#c99a1e" />
                )}
              </div>
            );
          }),
        )}
      </div>

      <div className="board__overlay">
        {/* Extruded boundary walls — raised slabs lit from the top-left. Drawn
            in two planes so connected walls merge into one solid: every slab's
            down-right shadow sits on the lower plane, and every slab's flat top
            face sits above it, covering any shadow that lands on an adjoining
            slab. The extrusion then only survives where a wall meets floor. */}
        {walls.map((seg) => (
          <div
            key={`sh-${seg.orient}-${seg.x}-${seg.y}`}
            className="wall-shadow"
            style={wallStyle(seg, cell, hSet, vSet)}
          />
        ))}
        {/* Closed-gate shadows share the wall shadow plane so tops cover them. */}
        {level.gates.map((g) =>
          render.gatesOpen[g.id] ? null : (
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
        {/* Gate top faces sit on the wall top plane so wall/gate merge cleanly,
            but render as a barred portcullis (bars across the run) so a gate is
            structurally distinct from a solid wall. */}
        {level.gates.map((g) => {
          const seg = gateSeg(g);
          const open = render.gatesOpen[g.id];
          return (
            <div
              key={`gtp-${g.id}`}
              className={`wall-top gate-top gate-top--${seg.orient} ${open ? 'gate-top--open' : ''}`}
              style={wallStyle(seg, cell, hSet, vSet)}
            />
          );
        })}

        {/* Real opening in the border wall the explorer walks out through. */}
        <ExitOpening pos={level.exit.pos} dir={level.exit.dir} cell={cell} />

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
          </>
        )}

        {/* Monsters — each turns to face the player it is hunting. In the dark,
            a monster outside the torchlight shows only as faint glowing eyes. */}
        {render.monsters
          .filter((m) => m.alive)
          .map((m) => {
            const lit = !dark || isLit(render.player, m.pos, dark.radius);
            const facing = mirrorStyle(faceToward(m.pos, render.player));
            return (
              <div
                key={m.id}
                className={`sprite sprite--monster${lit ? '' : ' sprite--eyes'}`}
                style={spriteStyle(m.pos, cell)}
              >
                {lit ? (
                  <>
                    <span className="sprite__shadow" />
                    <span className="sprite__body" style={facing}>
                      <MonsterSprite kind={m.kind} size={charSize} />
                    </span>
                  </>
                ) : (
                  <span className="dark-eyes" style={facing}>
                    <span className="dark-eye" />
                    <span className="dark-eye" />
                  </span>
                )}
              </div>
            );
          })}

        {/* Explorer — faces its last move direction. */}
        <div
          className="sprite sprite--player"
          style={{ ...spriteStyle(render.player, cell), opacity: render.playerOpacity }}
        >
          <span className="sprite__shadow" />
          <span className="sprite__body" style={mirrorStyle(render.playerFacing)}>
            <ExplorerSprite size={charSize} />
          </span>
        </div>

        {/* Chess.com-style planning arrows (right-click-drag). UI only. When an
            arrow starts on a MUMMY and ends on where that mummy's deterministic
            2-step turn lands, the arrow bends through the intermediate tile so
            the double-step (esp. red = vertical-first) is visible. */}
        <BoardAnnotations
          cell={cell}
          width={level.width}
          height={level.height}
          levelId={level.id}
          enemyPath={mummyPathFrom}
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
  const deg = dir === 'N' ? 0 : dir === 'E' ? 90 : dir === 'S' ? 180 : 270;
  const depth = cell; // passage extends one tile outward
  const x0 = cell * 0.2;
  const x1 = cell * 0.8;
  const w = x1 - x0;
  const cx = cell / 2;

  const floor = '#f3e7c4';
  const passage = '#f7eecb';
  const wall = '#b08320';
  const step = '#e4d3a4';
  const green = '#3aa06a';

  return (
    <svg
      className="exit-opening"
      width={cell}
      height={cell}
      viewBox={`0 0 ${cell} ${cell}`}
      style={{ ...spriteStyle(pos, cell), overflow: 'visible' }}
    >
      <g transform={`rotate(${deg} ${cx} ${cx})`}>
        {/* passage floor */}
        <rect x={x0} y={-depth} width={w} height={depth} fill={passage} />
        {/* cut the wall border so it reads as open */}
        <rect x={x0} y={-6} width={w} height={12} fill={floor} />
        {/* jambs */}
        <rect x={x0 - 3} y={-depth} width={3} height={depth + 6} fill={wall} />
        <rect x={x1} y={-depth} width={3} height={depth + 6} fill={wall} />
        {/* steps */}
        {[0.28, 0.52, 0.76].map((f) => (
          <line
            key={f}
            x1={x0 + 2}
            x2={x1 - 2}
            y1={-depth * f}
            y2={-depth * f}
            stroke={step}
            strokeWidth={2}
          />
        ))}
        {/* outward chevron */}
        <path
          d={`M ${cx - 6} ${-depth + 10} L ${cx} ${-depth + 2} L ${cx + 6} ${-depth + 10}`}
          fill="none"
          stroke={green}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
