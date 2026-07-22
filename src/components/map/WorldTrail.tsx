import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { Check, Lock } from 'lucide-react';
import type { Pyramid } from '../../levels/pyramids';
import { displayName, pyramidLevelIds } from '../../levels/pyramids';
import type { PyramidProgress } from '../../game/useProgress';
import { computeTrailLayout, smoothPath, type TrailNode } from './trailLayout';
import { PyramidSprite, type BlockState } from './PyramidSprite';

interface WorldTrailProps {
  pyramids: readonly Pyramid[];
  /** Index of the pyramid the player is currently in (0-based). */
  activeIndex: number;
  /** The current level tile, highlighted inside its pyramid. */
  currentId?: string;
  unlocked: ReadonlySet<string>;
  completed: ReadonlySet<string>;
  pyramidProgress: (pyramid: Pyramid) => PyramidProgress;
  onSelect: (id: string) => void;
}

/** Measure an element's content width, tracking resizes. */
function useMeasuredWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Derive tile/spacing sizes from the available width and pyramids-per-row. */
function deriveSizing(width: number) {
  const perRow = width < 560 ? 2 : width < 920 ? 3 : 4;
  const cellW = width / perRow;
  const tileSize = clamp(Math.round(cellW * 0.14), 17, 34);
  const gap = Math.max(2, Math.round(tileSize * 0.12));
  // A pyramid is 4 blocks wide at the base and 4 courses tall → square bounds,
  // plus a capstone and a torch above, and a plaque below.
  const shape = tileSize * 4 + gap * 3;
  const labelH = 44;
  return {
    perRow,
    cellW,
    tileSize,
    gap,
    shape,
    labelH,
    rowH: shape + tileSize * 0.7 + labelH + 60,
    marginTop: shape + tileSize * 1.7 + 26,
    marginBottom: labelH + tileSize + 30,
    tilt: Math.min(9, cellW * 0.028),
  };
}

/** The desert expedition map: a pannable scene of pyramids on a rising trail. */
export function WorldTrail({
  pyramids,
  activeIndex,
  currentId,
  unlocked,
  completed,
  pyramidProgress,
  onSelect,
}: WorldTrailProps) {
  const [ref, width] = useMeasuredWidth<HTMLDivElement>();
  const scrolledRef = useRef(false);
  const [grabbing, setGrabbing] = useState(false);

  const sizing = useMemo(() => (width > 0 ? deriveSizing(width) : null), [width]);

  const layout = useMemo(() => {
    if (!sizing) return null;
    return computeTrailLayout({
      count: pyramids.length,
      perRow: sizing.perRow,
      cellW: sizing.cellW,
      rowH: sizing.rowH,
      marginX: 0,
      marginTop: sizing.marginTop,
      marginBottom: sizing.marginBottom,
      tilt: sizing.tilt,
    });
  }, [sizing, pyramids.length]);

  const { walkedPath, aheadPath } = useMemo(() => {
    if (!layout) return { walkedPath: '', aheadPath: '' };
    const reached = clamp(activeIndex, 0, layout.nodes.length - 1);
    return {
      walkedPath: smoothPath(layout.nodes.slice(0, reached + 1)),
      aheadPath: smoothPath(layout.nodes.slice(reached)),
    };
  }, [layout, activeIndex]);

  // Camera: on open, center the viewport on the player's current tomb, so the
  // journey reads outward from where they are rather than dumping them at the
  // locked far end.
  useLayoutEffect(() => {
    if (!layout || !sizing || scrolledRef.current) return;
    const el = ref.current;
    if (!el) return;
    const n = layout.nodes[clamp(activeIndex, 0, layout.nodes.length - 1)];
    el.scrollTo({
      top: Math.max(0, n.y - sizing.shape * 0.4 - el.clientHeight / 2),
      left: Math.max(0, n.x - el.clientWidth / 2),
      behavior: 'auto',
    });
    scrolledRef.current = true;
  }, [layout, sizing, activeIndex, ref]);

  // Drag-to-pan (mouse). Touch/wheel use native scrolling; a small move
  // threshold distinguishes a pan from a click so tombs stay tappable.
  const drag = useRef({ down: false, moved: false, sx: 0, sy: 0, sl: 0, st: 0 });
  useEffect(() => () => setGrabbing(false), []);

  const stateOf = (levelId: string): BlockState => {
    // Completed wins outright, so a completed level is never mislabelled current.
    if (completed.has(levelId)) return 'completed';
    if (levelId === currentId) return 'current';
    if (!unlocked.has(levelId)) return 'locked';
    return 'available';
  };

  /** The level a pyramid's plaque jumps to: current tomb, else its next playable. */
  const entryLevelOf = (pyramid: Pyramid): string | undefined => {
    const ids = pyramidLevelIds(pyramid);
    if (currentId && ids.includes(currentId)) return currentId;
    const play = ids.find((id) => {
      const s = stateOf(id);
      return s === 'available' || s === 'current';
    });
    if (play) return play;
    for (let i = ids.length - 1; i >= 0; i--) if (completed.has(ids[i])) return ids[i];
    return unlocked.has(ids[0]) ? ids[0] : undefined;
  };

  return (
    <Box
      ref={ref}
      onPointerDown={(e) => {
        if (e.pointerType !== 'mouse' || e.button !== 0) return;
        const el = ref.current;
        if (!el) return;
        drag.current = { down: true, moved: false, sx: e.clientX, sy: e.clientY, sl: el.scrollLeft, st: el.scrollTop };
        el.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d.down) return;
        const el = ref.current;
        if (!el) return;
        const dx = e.clientX - d.sx;
        const dy = e.clientY - d.sy;
        if (!d.moved && Math.hypot(dx, dy) > 4) {
          d.moved = true;
          setGrabbing(true);
        }
        if (d.moved) {
          el.scrollLeft = d.sl - dx;
          el.scrollTop = d.st - dy;
        }
      }}
      onPointerUp={(e) => {
        if (!drag.current.down) return;
        drag.current.down = false;
        setGrabbing(false);
        try {
          ref.current?.releasePointerCapture(e.pointerId);
        } catch {
          /* pointer already released */
        }
      }}
      onClickCapture={(e) => {
        // Swallow the click that ends a drag so panning never selects a tomb.
        if (drag.current.moved) {
          e.preventDefault();
          e.stopPropagation();
          drag.current.moved = false;
        }
      }}
      sx={{
        width: '100%',
        height: '100%',
        overflow: 'auto',
        position: 'relative',
        cursor: grabbing ? 'grabbing' : 'grab',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'pan-x pan-y',
      }}
    >
      {layout && sizing && (
        <Box sx={{ position: 'relative', width: layout.width, height: layout.height }}>
          <Box
            component="svg"
            width={layout.width}
            height={layout.height}
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            sx={{ position: 'absolute', inset: 0, display: 'block' }}
          >
            <defs>
              <filter id="goldGlow" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation={sizing.tileSize * 0.09} result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="torchGlow" x="-120%" y="-120%" width="340%" height="340%">
                <feGaussianBlur stdDeviation={sizing.tileSize * 0.14} result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <radialGradient id="mapGlow" cx="50%" cy="40%" r="72%">
                <stop offset="0%" stopColor="#2b1f11" />
                <stop offset="55%" stopColor="#191108" />
                <stop offset="100%" stopColor="#0d0904" />
              </radialGradient>
            </defs>

            {/* Night desert with a warm central pool of light. */}
            <rect x={0} y={0} width={layout.width} height={layout.height} fill="url(#mapGlow)" />

            {/* The sand road. */}
            <path d={layout.path} fill="none" stroke="#2b2112" strokeWidth={sizing.tileSize * 0.5} strokeLinecap="round" strokeLinejoin="round" />
            <path d={layout.path} fill="none" stroke="#6f5528" strokeWidth={sizing.tileSize * 0.34} strokeLinecap="round" strokeLinejoin="round" />
            <path d={aheadPath} fill="none" stroke="rgba(214,196,140,0.26)" strokeWidth={2} strokeLinecap="round" strokeDasharray="2 10" />
            <path
              d={walkedPath}
              fill="none"
              stroke="#e7bd48"
              strokeWidth={2.6}
              strokeLinecap="round"
              strokeDasharray="2 9"
              style={{ filter: 'drop-shadow(0 0 3px rgba(231,189,72,0.4))' }}
            />

            {/* Pyramids, back (top rows) to front (bottom rows) so nearer overlap. */}
            {[...pyramids]
              .map((pyramid, i) => ({ pyramid, i, node: layout.nodes[i] }))
              .sort((a, b) => a.node.y - b.node.y)
              .map(({ pyramid, i, node }) => {
                const progress = pyramidProgress(pyramid);
                return (
                  <g key={pyramid.id} transform={`translate(${node.x}, ${node.y})`}>
                    <PyramidSprite
                      pyramid={pyramid}
                      pyramidLocked={!progress.unlocked}
                      isActive={i === activeIndex}
                      stateOf={stateOf}
                      labelOf={(id) => displayName(id)}
                      onSelect={onSelect}
                      tileSize={sizing.tileSize}
                      gap={sizing.gap}
                    />
                  </g>
                );
              })}
          </Box>

          {/* Clickable stone plaques overlaid on the scene. */}
          {pyramids.map((pyramid, i) => {
            const entry = entryLevelOf(pyramid);
            return (
              <PlaqueLabel
                key={pyramid.id}
                node={layout.nodes[i]}
                index={i}
                name={pyramid.name}
                isActive={i === activeIndex}
                progress={pyramidProgress(pyramid)}
                shape={sizing.shape}
                tileSize={sizing.tileSize}
                onClick={entry ? () => onSelect(entry) : undefined}
              />
            );
          })}
        </Box>
      )}
    </Box>
  );
}

interface PlaqueLabelProps {
  node: TrailNode;
  index: number;
  name: string;
  isActive: boolean;
  progress: PyramidProgress;
  shape: number;
  tileSize: number;
  onClick?: () => void;
}

/** Carved-stone sign beneath a pyramid: its name and completion; clickable. */
function PlaqueLabel({ node, index, name, isActive, progress, shape, tileSize, onClick }: PlaqueLabelProps) {
  const locked = !progress.unlocked;
  const clickable = !!onClick;
  return (
    <Box
      component={clickable ? 'button' : 'div'}
      type={clickable ? 'button' : undefined}
      onClick={onClick}
      aria-label={clickable ? `Go to ${name}` : name}
      className={`stone-sign${isActive ? ' stone-sign--active' : ''}`}
      sx={{
        position: 'absolute',
        left: node.x,
        top: node.y + tileSize * 0.78,
        transform: 'translateX(-50%)',
        width: Math.min(shape + 44, 208),
        px: 1,
        py: 0.6,
        m: 0,
        textAlign: 'center',
        fontFamily: 'inherit',
        opacity: locked ? 0.72 : 1,
        cursor: clickable ? 'pointer' : 'default',
        pointerEvents: clickable ? 'auto' : 'none',
        transition: 'transform 120ms ease, filter 120ms ease',
        '&:hover': clickable ? { transform: 'translateX(-50%) translateY(-2px)', filter: 'brightness(1.1)' } : {},
      }}
    >
      <Typography
        variant="subtitle2"
        noWrap
        sx={{
          fontWeight: 700,
          lineHeight: 1.2,
          letterSpacing: 0.2,
          color: isActive ? '#f4d774' : locked ? 'text.disabled' : '#e8d7a8',
          textShadow: '0 1px 0 rgba(0,0,0,0.6)',
        }}
      >
        {name}
      </Typography>
      <Typography
        variant="caption"
        component="span"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.5,
          color: isActive ? '#e7bd48' : 'text.secondary',
          fontWeight: 700,
        }}
      >
        {locked ? (
          <>
            <Lock size={11} /> Locked
          </>
        ) : (
          <>
            {index + 1} · {progress.completedCount}/{progress.total}
            {progress.completed && <Check size={12} />}
          </>
        )}
      </Typography>
    </Box>
  );
}
