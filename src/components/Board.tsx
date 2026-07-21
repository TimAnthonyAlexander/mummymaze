import { Key, Skull } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { Dir, Level, Pos } from '../engine';
import type { RenderState } from '../game/render';
import { ExplorerSprite, MonsterSprite } from './sprites/CharacterSprites';
import './Board.css';

function spriteStyle(pos: Pos, cell: number): CSSProperties {
  return { transform: `translate(${pos.x * cell}px, ${pos.y * cell}px)` };
}

function wallShadow(walls: { N: boolean; E: boolean; S: boolean; W: boolean }): string {
  const parts: string[] = [];
  if (walls.N) parts.push('inset 0 4px 0 0 var(--wall)');
  if (walls.S) parts.push('inset 0 -4px 0 0 var(--wall)');
  if (walls.E) parts.push('inset -4px 0 0 0 var(--wall)');
  if (walls.W) parts.push('inset 4px 0 0 0 var(--wall)');
  return parts.join(', ');
}

interface BoardProps {
  level: Level;
  render: RenderState;
  /** Dynamic cell edge length in px, computed to fill the available pane. */
  cellSize: number;
}

export function Board({ level, render, cellSize }: BoardProps) {
  const cell = cellSize;
  const boardStyle = {
    '--cell': `${cell}px`,
    '--cols': level.width,
    '--rows': level.height,
  } as CSSProperties;

  const markerSize = Math.round(cell * 0.46);
  const charSize = Math.round(cell * 0.82);

  return (
    <div className="board" style={boardStyle}>
      <div className="board__grid">
        {level.cells.map((row, y) =>
          row.map((cellData, x) => {
            const checker = (x + y) % 2 === 0 ? 'cell--a' : 'cell--b';
            return (
              <div
                key={`${x},${y}`}
                className={`cell ${checker}`}
                style={{ boxShadow: wallShadow(cellData.walls) }}
              >
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
              <MonsterSprite kind={m.kind} size={charSize} />
            </div>
          ))}

        {/* Explorer. */}
        <div
          className="sprite sprite--player"
          style={{ ...spriteStyle(render.player, cell), opacity: render.playerOpacity }}
        >
          <ExplorerSprite size={charSize} />
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
