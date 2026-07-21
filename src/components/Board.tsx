import { Key, Skull } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { Dir, Level, Pos } from '../engine';
import type { RenderState } from '../game/render';
import { ExplorerSprite, MonsterSprite } from './sprites/CharacterSprites';
import './Board.css';

function spriteStyle(pos: Pos, cell: number): CSSProperties {
  return { transform: `translate(${pos.x * cell}px, ${pos.y * cell}px)` };
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

/**
 * A wall is a chunky slab (~a third of a tile thick) straddling its boundary
 * line. Because the block is lit top-left and casts its body down-right, the top
 * face reads as shifted UP-LEFT of its base. So along its run we extend the slab
 * by half its thickness only on the leading (left / top) end — that up-left
 * overhang is the 3D read and it also knits corners — while the trailing
 * (right / bottom) end stays flush with its tile so the slab never spills into
 * the neighbouring cell where the shadow already lives.
 */
function wallStyle(seg: WallSeg, cell: number): CSSProperties {
  const thick = cell * 0.3;
  const half = thick / 2;
  const lead = half; // up-left overhang
  if (seg.orient === 'h') {
    return {
      transform: `translate(${seg.x * cell - lead}px, ${seg.y * cell - half}px)`,
      width: cell + lead,
      height: thick,
    };
  }
  return {
    transform: `translate(${seg.x * cell - half}px, ${seg.y * cell - lead}px)`,
    width: thick,
    height: cell + lead,
  };
}

interface BoardProps {
  level: Level;
  render: RenderState;
  /** Dynamic cell edge length in px, computed to fill the available pane. */
  cellSize: number;
}

export function Board({ level, render, cellSize }: BoardProps) {
  const cell = cellSize;
  // Depth amounts scale with the tile so the tilt reads the same at any size.
  const wallLift = Math.max(4, Math.round(cell * 0.12));
  const gateLift = Math.max(2, Math.round(wallLift * 0.5));
  const boardStyle = {
    '--cell': `${cell}px`,
    '--cols': level.width,
    '--rows': level.height,
    '--sprite-lift': `${Math.round(cell * 0.09)}px`,
    '--wall-extrude': extrudeShadow(wallLift, 'var(--wall-side)'),
    '--gate-extrude': extrudeShadow(gateLift, 'var(--wall-side)'),
  } as CSSProperties;

  const markerSize = Math.round(cell * 0.46);
  const charSize = Math.round(cell * 0.82);
  const walls = computeWallSegments(level);

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
            style={wallStyle(seg, cell)}
          />
        ))}
        {walls.map((seg) => (
          <div
            key={`tp-${seg.orient}-${seg.x}-${seg.y}`}
            className={`wall-top wall--${seg.orient}`}
            style={wallStyle(seg, cell)}
          />
        ))}

        {/* Real opening in the border wall the explorer walks out through. */}
        <ExitOpening pos={level.exit.pos} dir={level.exit.dir} cell={cell} />

        {/* Gates. */}
        {level.gates.map((g) => {
          const open = render.gatesOpen[g.id];
          const horizontal = g.dir === 'N' || g.dir === 'S';
          const x = g.a.x * cell;
          const y = g.a.y * cell;
          const style: CSSProperties = horizontal
            ? {
                transform: `translate(${x}px, ${y + (g.dir === 'S' ? cell - 3 : -3)}px)`,
                width: cell,
              }
            : {
                transform: `translate(${x + (g.dir === 'E' ? cell - 3 : -3)}px, ${y}px)`,
                height: cell,
              };
          return (
            <div
              key={g.id}
              className={`gate ${horizontal ? 'gate--h' : 'gate--v'} ${
                open ? 'gate--open' : ''
              }`}
              style={style}
            />
          );
        })}

        {/* Monsters. */}
        {render.monsters
          .filter((m) => m.alive)
          .map((m) => (
            <div key={m.id} className="sprite sprite--monster" style={spriteStyle(m.pos, cell)}>
              <span className="sprite__shadow" />
              <span className="sprite__body">
                <MonsterSprite kind={m.kind} size={charSize} />
              </span>
            </div>
          ))}

        {/* Explorer. */}
        <div
          className="sprite sprite--player"
          style={{ ...spriteStyle(render.player, cell), opacity: render.playerOpacity }}
        >
          <span className="sprite__shadow" />
          <span className="sprite__body">
            <ExplorerSprite size={charSize} />
          </span>
        </div>
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
