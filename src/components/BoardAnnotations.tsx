/**
 * Chess.com-style planning annotations layered over the board — a pure UI aid
 * ("Calculate"), with NO engine coupling. Right-click-drag from one tile to
 * another draws a blue arrow; right-click a single tile highlights it; drawing
 * the same arrow/highlight again toggles it off; a left-click clears everything.
 * Annotations reset when the level changes.
 *
 * The layer is a single SVG sized to the cell grid and positioned at the grid
 * origin (inside `.board__overlay`), painted above the sprites so plans stay
 * visible — including over the dark torchlight overlay.
 */
import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react';
import type { Pos } from '../engine';

interface Arrow {
  readonly from: Pos;
  readonly to: Pos;
}

const samePos = (a: Pos, b: Pos) => a.x === b.x && a.y === b.y;
const sameArrow = (a: Arrow, b: Arrow) => samePos(a.from, b.from) && samePos(a.to, b.to);

interface Props {
  cell: number;
  width: number;
  height: number;
  /** Resets annotations when it changes. */
  levelId: string;
  /**
   * If `from` holds a mummy and `to` is exactly its double-step away, the routed
   * path `[from, intermediate, to]` (red vertical-first, white horizontal-first,
   * walls respected); null otherwise. Used to bend the arrow along the mummy's
   * two hops instead of drawing straight.
   */
  enemyPath?: (from: Pos, to: Pos) => Pos[] | null;
}

export function BoardAnnotations({ cell, width, height, levelId, enemyPath }: Props) {
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [highlights, setHighlights] = useState<Pos[]>([]);
  const [drag, setDrag] = useState<Arrow | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    setArrows([]);
    setHighlights([]);
    setDrag(null);
  }, [levelId]);

  const w = cell * width;
  const h = cell * height;

  /**
   * Resolve an arrow to the tile points it should be drawn through. If it starts
   * on a mummy and targets a tile exactly a double-step away that the mummy can
   * reach, follow the mummy's routed two hops (bent). Otherwise a plain straight
   * start->target arrow.
   */
  const resolveArrow = (a: Arrow): { points: Pos[]; enemy: boolean } => {
    const path = enemyPath?.(a.from, a.to) ?? null;
    if (path && path.length >= 2) return { points: path, enemy: true };
    return { points: [a.from, a.to], enemy: false };
  };
  const dragArrow = drag && !samePos(drag.from, drag.to) ? resolveArrow(drag) : null;

  const tileAt = (e: ReactPointerEvent): Pos | null => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const x = Math.floor((e.clientX - rect.left) / cell);
    const y = Math.floor((e.clientY - rect.top) / cell);
    if (x < 0 || y < 0 || x >= width || y >= height) return null;
    return { x, y };
  };

  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.button === 2) {
      const t = tileAt(e);
      if (!t) return;
      e.preventDefault();
      svgRef.current?.setPointerCapture(e.pointerId);
      setDrag({ from: t, to: t });
    } else if (e.button === 0) {
      // Left-click clears all annotations (chess.com behaviour).
      if (arrows.length || highlights.length) {
        setArrows([]);
        setHighlights([]);
      }
    }
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!drag) return;
    const t = tileAt(e);
    if (t && !samePos(t, drag.to)) setDrag({ from: drag.from, to: t });
  };

  const onPointerUp = (e: ReactPointerEvent) => {
    if (e.button !== 2 || !drag) return;
    svgRef.current?.releasePointerCapture?.(e.pointerId);
    const finished = drag;
    setDrag(null);
    if (samePos(finished.from, finished.to)) {
      const p = finished.to;
      setHighlights((hs) =>
        hs.some((q) => samePos(q, p)) ? hs.filter((q) => !samePos(q, p)) : [...hs, p],
      );
    } else {
      setArrows((as) =>
        as.some((a) => sameArrow(a, finished))
          ? as.filter((a) => !sameArrow(a, finished))
          : [...as, finished],
      );
    }
  };

  return (
    <svg
      ref={svgRef}
      className="board-annotations"
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={() => drag && setDrag(null)}
    >
      {highlights.map((p) => (
        <HighlightShape key={`hl-${p.x}-${p.y}`} pos={p} cell={cell} />
      ))}
      {arrows.map((a) => {
        const r = resolveArrow(a);
        return (
          <ArrowShape
            key={`ar-${a.from.x}-${a.from.y}-${a.to.x}-${a.to.y}`}
            points={r.points}
            enemy={r.enemy}
            cell={cell}
          />
        );
      })}
      {drag &&
        (samePos(drag.from, drag.to) ? (
          <HighlightShape pos={drag.to} cell={cell} preview />
        ) : (
          dragArrow && (
            <ArrowShape points={dragArrow.points} enemy={dragArrow.enemy} cell={cell} preview />
          )
        ))}
    </svg>
  );
}

function HighlightShape({ pos, cell, preview }: { pos: Pos; cell: number; preview?: boolean }) {
  const m = cell * 0.06;
  return (
    <rect
      className="annot-highlight"
      x={pos.x * cell + m}
      y={pos.y * cell + m}
      width={cell - 2 * m}
      height={cell - 2 * m}
      rx={cell * 0.12}
      strokeWidth={cell * 0.05}
      opacity={preview ? 0.6 : 1}
    />
  );
}

/**
 * Draw an arrow through a polyline of tile points (2 = straight, 3 = one elbow
 * for a mummy double-step). Head only on the final segment; when `enemy`, the
 * intermediate step tiles get a small node so the two hops are unmistakable.
 */
function ArrowShape({
  points,
  cell,
  enemy,
  preview,
}: {
  points: Pos[];
  cell: number;
  enemy?: boolean;
  preview?: boolean;
}) {
  const c = points.map((p) => ({ x: (p.x + 0.5) * cell, y: (p.y + 0.5) * cell }));
  const n = c.length;
  const last = c[n - 1];
  const prev = c[n - 2];
  const dx = last.x - prev.x;
  const dy = last.y - prev.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;

  const head = cell * 0.36;
  const headW = cell * 0.25;
  const shaft = cell * 0.15;
  const bx = last.x - ux * head;
  const by = last.y - uy * head;

  // Shaft polyline: start a little out of the first tile centre, run through any
  // intermediate step tiles, and stop where the arrowhead begins.
  const first = c[0];
  const second = c[1];
  const fdx = second.x - first.x;
  const fdy = second.y - first.y;
  const flen = Math.hypot(fdx, fdy) || 1;
  const start = { x: first.x + (fdx / flen) * cell * 0.14, y: first.y + (fdy / flen) * cell * 0.14 };
  const shaftPts = [start, ...c.slice(1, n - 1), { x: bx, y: by }];
  const polyline = shaftPts.map((p) => `${p.x},${p.y}`).join(' ');

  const px = -uy;
  const py = ux;
  const headPts = `${last.x},${last.y} ${bx + px * headW},${by + py * headW} ${bx - px * headW},${by - py * headW}`;

  return (
    <g className="annot-arrow" opacity={preview ? 0.6 : 0.92}>
      <polyline
        points={polyline}
        fill="none"
        strokeWidth={shaft}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polygon points={headPts} />
      {enemy &&
        c.slice(1, n - 1).map((p, i) => (
          <circle key={i} className="annot-step" cx={p.x} cy={p.y} r={cell * 0.09} />
        ))}
    </g>
  );
}
