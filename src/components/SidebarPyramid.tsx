import type { Pyramid } from '../levels/pyramids';
import { displayName } from '../levels/pyramids';
import { PyramidSprite, type BlockState } from './map/PyramidSprite';

interface SidebarPyramidProps {
  pyramid: Pyramid;
  currentId: string;
  unlocked: ReadonlySet<string>;
  completed: ReadonlySet<string>;
  onSelect: (id: string) => void;
}

// Fixed block geometry; the SVG viewBox scales the whole pyramid to its plaque.
const S = 30;
const G = 6;

/**
 * The current pyramid rendered with the SAME carved-stone sprite the world map
 * uses (stepped stone blocks, gilded capstone, torch on the frontier, dark
 * entrance) — self-contained here with its own glow filters and a viewBox sized
 * to the geometry, wired to the sidebar's unlock/progress data. The map page and
 * this never mount together (different routes), so the shared filter ids that
 * PyramidSprite expects (goldGlow / torchGlow) are safe to define here.
 */
export function SidebarPyramid({
  pyramid,
  currentId,
  unlocked,
  completed,
  onSelect,
}: SidebarPyramidProps) {
  const flatBaseToApex = pyramid.rows.flat();
  const numberOf = (id: string) => flatBaseToApex.indexOf(id) + 1;

  const stateOf = (id: string): BlockState => {
    // Completed wins outright, so a completed level is never mislabelled current.
    if (completed.has(id)) return 'completed';
    if (id === currentId) return 'current';
    if (!unlocked.has(id)) return 'locked';
    return 'available';
  };
  const labelOf = (id: string) => `${numberOf(id)}. ${displayName(id)}`;

  const baseCount = pyramid.rows[0].length;
  const baseW = baseCount * S + (baseCount - 1) * G;
  const halfW = baseW * 0.75 + 4;
  const top = -(baseW + S * 0.62) - S; // apex + capstone + torch headroom
  const bottom = S * 0.75 + 6;

  return (
    <svg
      width="100%"
      viewBox={`${-halfW} ${top} ${2 * halfW} ${bottom - top}`}
      style={{ display: 'block', overflow: 'visible' }}
      aria-label={`${pyramid.name} pyramid`}
    >
      <defs>
        <filter id="goldGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation={S * 0.09} result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="torchGlow" x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur stdDeviation={S * 0.14} result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <PyramidSprite
        pyramid={pyramid}
        pyramidLocked={false}
        isActive
        stateOf={stateOf}
        labelOf={labelOf}
        onSelect={onSelect}
        tileSize={S}
        gap={G}
      />
    </svg>
  );
}
