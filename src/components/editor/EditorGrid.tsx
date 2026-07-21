/**
 * The clickable authoring grid. Cell bodies place cell-tools; thin edge
 * hit-targets on each side place walls / gates / exits. Everything renders from
 * the immutable `EditorState`, so the board always reflects the current draft.
 */
import type { CSSProperties } from 'react';
import { Key, LogOut, Skull } from 'lucide-react';
import type { Dir, EdgeSpec } from '../../engine';
import { ExplorerSprite, MonsterSprite } from '../sprites/CharacterSprites';
import { EDGE_TOOLS, isBorderEdge, type EditorState, type Tool } from './model';
import './editor.css';

const CELL = 44;
const WALL_THICK = 6;
const HIT_THICK = 12;

interface EditorGridProps {
  state: EditorState;
  tool: Tool;
  onCell: (x: number, y: number) => void;
  onEdge: (x: number, y: number, dir: Dir) => void;
}

/** Absolute position/size for the drawn line of an edge. */
function edgeLine(e: EdgeSpec, thick: number): CSSProperties {
  const { x, y, dir } = e;
  if (dir === 'E') return { left: (x + 1) * CELL - thick / 2, top: y * CELL, width: thick, height: CELL };
  if (dir === 'W') return { left: x * CELL - thick / 2, top: y * CELL, width: thick, height: CELL };
  if (dir === 'S') return { left: x * CELL, top: (y + 1) * CELL - thick / 2, width: CELL, height: thick };
  return { left: x * CELL, top: y * CELL - thick / 2, width: CELL, height: thick }; // N
}

function markerStyle(x: number, y: number): CSSProperties {
  return { transform: `translate(${x * CELL}px, ${y * CELL}px)`, width: CELL, height: CELL };
}

export function EditorGrid({ state, tool, onCell, onEdge }: EditorGridProps) {
  const { width, height } = state;
  const boardW = width * CELL;
  const boardH = height * CELL;
  const edgeActive = EDGE_TOOLS.has(tool) || tool === 'eraser';
  const markerSize = Math.round(CELL * 0.46);
  const charSize = Math.round(CELL * 0.82);

  // Enumerate each grid edge exactly once: every cell's S and E edge, plus the
  // top row's N and the left column's W (the remaining two borders).
  const edges: EdgeSpec[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      edges.push({ x, y, dir: 'S' });
      edges.push({ x, y, dir: 'E' });
      if (y === 0) edges.push({ x, y, dir: 'N' });
      if (x === 0) edges.push({ x, y, dir: 'W' });
    }
  }

  return (
    <div className="ed-board">
      <div
        className="ed-grid"
        style={{ width: boardW, height: boardH }}
      >
        {/* Cell bodies (CSS grid) */}
        <div
          className="ed-cells"
          style={{
            gridTemplateColumns: `repeat(${width}, ${CELL}px)`,
            gridTemplateRows: `repeat(${height}, ${CELL}px)`,
          }}
        >
          {Array.from({ length: height }).map((_, y) =>
            Array.from({ length: width }).map((__, x) => {
              const shade = (x + y) % 2 === 0 ? 'ed-cell--a' : 'ed-cell--b';
              return (
                <div
                  key={`${x},${y}`}
                  className={`ed-cell ${shade}`}
                  onClick={() => onCell(x, y)}
                />
              );
            }),
          )}
        </div>

        {/* Overlay: markers, walls, gates, exit */}
        <div className="ed-overlay" style={{ width: boardW, height: boardH }}>
          {state.walls.map((w) => (
            <div key={`w-${w.x},${w.y},${w.dir}`} className="ed-wall" style={edgeLine(w, WALL_THICK)} />
          ))}

          {state.gates.map((g) => (
            <div
              key={`g-${g.x},${g.y},${g.dir}`}
              className={`ed-gate ${g.open ? 'ed-gate--open' : ''}`}
              style={edgeLine(g, WALL_THICK)}
            />
          ))}

          {state.exit && (
            <>
              <div className="ed-exit" style={edgeLine(state.exit, WALL_THICK + 2)} />
              <div className="ed-marker" style={markerStyle(state.exit.x, state.exit.y)}>
                <LogOut size={markerSize} color="#3aa06a" />
              </div>
            </>
          )}

          {state.traps.map((t) => (
            <div key={`t-${t.x},${t.y}`} className="ed-marker" style={markerStyle(t.x, t.y)}>
              <Skull size={markerSize} color="#8a2b2b" />
            </div>
          ))}

          {state.keys.map((k) => (
            <div key={`k-${k.x},${k.y}`} className="ed-marker" style={markerStyle(k.x, k.y)}>
              <Key size={markerSize} color="#c99a1e" />
            </div>
          ))}

          {state.monsters.map((m, i) => (
            <div key={`m-${m.x},${m.y}-${i}`} className="ed-marker" style={markerStyle(m.x, m.y)}>
              <MonsterSprite kind={m.kind} size={charSize} />
            </div>
          ))}

          <div className="ed-marker" style={markerStyle(state.start.x, state.start.y)}>
            <ExplorerSprite size={charSize} />
          </div>

          {/* Edge hit-targets (only interactive for edge tools / eraser) */}
          {edges.map((e) => {
            const border = isBorderEdge(width, height, e);
            const dim = tool === 'exit' && !border;
            return (
              <div
                key={`e-${e.x},${e.y},${e.dir}`}
                className="ed-edge"
                style={{
                  ...edgeLine(e, HIT_THICK),
                  pointerEvents: edgeActive && !dim ? 'auto' : 'none',
                }}
                onClick={(ev) => {
                  ev.stopPropagation();
                  onEdge(e.x, e.y, e.dir);
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
