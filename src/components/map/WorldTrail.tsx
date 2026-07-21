import { type Ref, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { Check, Lock } from 'lucide-react';
import type { Pyramid } from '../../levels/pyramids';
import { displayName } from '../../levels/pyramids';
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
  const tileSize = clamp(Math.round(cellW * 0.14), 17, 32);
  const gap = Math.max(2, Math.round(tileSize * 0.12));
  // A pyramid is 4 blocks wide at the base and 4 courses tall → square bounds,
  // plus a capstone and a torch/marker above, and a plaque below.
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

interface Star {
  x: number;
  y: number;
  r: number;
  o: number;
}

/** Deterministic star field (no Math.random, so renders are stable). */
function makeStars(width: number, height: number): Star[] {
  const count = Math.round((width * height) / 14000);
  let seed = 987654321;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const out: Star[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      x: rnd() * width,
      y: rnd() * height,
      r: 0.5 + rnd() * 1.2,
      o: 0.06 + rnd() * 0.34,
    });
  }
  return out;
}

/** The desert expedition map: pyramids on a rising serpentine trail. */
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
  const activeNodeRef = useRef<HTMLDivElement | null>(null);
  const scrolledRef = useRef(false);

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

  const stars = useMemo(
    () => (layout ? makeStars(layout.width, layout.height) : []),
    [layout],
  );

  const { walkedPath, aheadPath } = useMemo(() => {
    if (!layout) return { walkedPath: '', aheadPath: '' };
    const reached = clamp(activeIndex, 0, layout.nodes.length - 1);
    return {
      walkedPath: smoothPath(layout.nodes.slice(0, reached + 1)),
      aheadPath: smoothPath(layout.nodes.slice(reached)),
    };
  }, [layout, activeIndex]);

  // Land the player on "you are here": the trail rises from the bottom, so the
  // active pyramid is usually below the fold early on. Scroll to it once.
  useLayoutEffect(() => {
    if (!layout || scrolledRef.current) return;
    const el = activeNodeRef.current;
    if (el) {
      el.scrollIntoView({ block: 'center', behavior: 'auto' });
      scrolledRef.current = true;
    }
  }, [layout]);

  const stateOf = (levelId: string): BlockState => {
    if (!unlocked.has(levelId)) return 'locked';
    if (levelId === currentId) return 'current';
    if (completed.has(levelId)) return 'completed';
    return 'available';
  };

  return (
    <Box ref={ref} sx={{ width: '100%' }}>
      {layout && sizing && (
        <Box sx={{ position: 'relative', width: layout.width, height: layout.height, mx: 'auto' }}>
          <Box
            component="svg"
            width={layout.width}
            height={layout.height}
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            sx={{ position: 'absolute', inset: 0, display: 'block', borderRadius: 3 }}
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
            </defs>

            {/* Night desert sky. */}
            <rect x={0} y={0} width={layout.width} height={layout.height} fill="#14100a" />
            {stars.map((s, i) => (
              <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#e7dcbd" opacity={s.o} />
            ))}
            {/* Moon. */}
            <circle cx={layout.width * 0.84} cy={sizing.marginTop * 0.42} r={sizing.tileSize * 1.6} fill="#cdbb84" opacity={0.06} />
            <circle cx={layout.width * 0.84} cy={sizing.marginTop * 0.42} r={sizing.tileSize * 0.9} fill="#e2d5a8" opacity={0.85} />

            {/* The sand road. */}
            <path d={layout.path} fill="none" stroke="#2b2112" strokeWidth={sizing.tileSize * 0.5} strokeLinecap="round" strokeLinejoin="round" />
            <path d={layout.path} fill="none" stroke="#6f5528" strokeWidth={sizing.tileSize * 0.34} strokeLinecap="round" strokeLinejoin="round" />
            <path d={aheadPath} fill="none" stroke="rgba(214,196,140,0.28)" strokeWidth={2} strokeLinecap="round" strokeDasharray="2 10" />
            <path
              d={walkedPath}
              fill="none"
              stroke="#e7bd48"
              strokeWidth={2.6}
              strokeLinecap="round"
              strokeDasharray="2 9"
              style={{ filter: 'drop-shadow(0 0 3px rgba(231,189,72,0.4))' }}
            />

            {/* Pyramids, back (top rows) to front (bottom rows) so nearer ones overlap. */}
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
                      labelOf={(id) => `${displayName(id)}`}
                      onSelect={onSelect}
                      tileSize={sizing.tileSize}
                      gap={sizing.gap}
                    />
                  </g>
                );
              })}
          </Box>

          {/* HTML plaques + active-node scroll anchor, overlaid on the scene. */}
          {pyramids.map((pyramid, i) => (
            <PlaqueLabel
              key={pyramid.id}
              node={layout.nodes[i]}
              index={i}
              name={pyramid.name}
              isActive={i === activeIndex}
              progress={pyramidProgress(pyramid)}
              shape={sizing.shape}
              tileSize={sizing.tileSize}
              anchorRef={i === activeIndex ? activeNodeRef : undefined}
            />
          ))}
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
  anchorRef?: Ref<HTMLDivElement>;
}

/** Carved-stone sign beneath a pyramid: its name and completion. */
function PlaqueLabel({ node, index, name, isActive, progress, shape, tileSize, anchorRef }: PlaqueLabelProps) {
  const locked = !progress.unlocked;
  return (
    <Box
      ref={anchorRef}
      sx={{
        position: 'absolute',
        left: node.x,
        top: node.y + tileSize * 0.78,
        transform: 'translateX(-50%)',
        width: Math.min(shape + 44, 208),
        px: 1,
        py: 0.5,
        borderRadius: 1,
        textAlign: 'center',
        bgcolor: 'rgba(16,11,6,0.82)',
        border: isActive ? '1px solid #e7bd48' : '1px solid rgba(201,154,30,0.28)',
        boxShadow: isActive ? '0 0 12px rgba(231,189,72,0.25)' : 'none',
        opacity: locked ? 0.7 : 1,
        pointerEvents: 'none',
      }}
    >
      <Typography
        variant="subtitle2"
        noWrap
        sx={{
          fontWeight: 700,
          lineHeight: 1.2,
          color: isActive ? '#f4d774' : locked ? 'text.disabled' : 'text.primary',
        }}
      >
        {name}
      </Typography>
      <Typography
        variant="caption"
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
