import type { ReactNode } from 'react';
import type { Pyramid } from '../../levels/pyramids';

export type BlockState = 'locked' | 'available' | 'current' | 'completed';

interface PyramidSpriteProps {
  pyramid: Pyramid;
  /** Whole pyramid locked (its base level is not yet unlocked). */
  pyramidLocked: boolean;
  isActive: boolean;
  stateOf: (levelId: string) => BlockState;
  labelOf: (levelId: string) => string;
  onSelect: (levelId: string) => void;
  /** Edge length of one stone block, px. */
  tileSize: number;
  /** Mortar gap between blocks, px. */
  gap: number;
}

/** Sandstone palette — warm tans that read as a lit desert tomb. */
const C = {
  bodyDark: '#5c4420',
  bodyMid: '#7a5a28',
  stone: '#b1863a',
  stoneLit: '#d4ad55',
  stoneHi: '#e6cd86',
  stoneShadow: '#6b4f22',
  mortar: '#241a0c',
  gold: '#e7bd48',
  goldDeep: '#c99a1e',
  lockStone: '#2b2114',
  lockLine: '#3d2f19',
  sand: '#caa763',
  sandHi: '#e0c489',
  sandDark: '#8a6f3a',
};

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Geometry of one block. Local origin (0,0) = base-center; up is negative y. */
function blockRect(row: number, col: number, count: number, s: number, g: number): Rect {
  const rowW = count * s + (count - 1) * g;
  return {
    x: -rowW / 2 + col * (s + g),
    y: -((row + 1) * s + row * g),
    w: s,
    h: s,
  };
}

/** A single carved stone block with bevel + state glyph. */
function Block({
  rect,
  state,
  label,
  onClick,
  s,
}: {
  rect: Rect;
  state: BlockState;
  label: string;
  onClick?: () => void;
  s: number;
}) {
  const locked = state === 'locked';
  const play = state === 'available' || state === 'current';
  const done = state === 'completed';

  const fill = locked ? C.lockStone : play ? C.gold : done ? C.stoneLit : C.stone;
  const stroke = locked ? C.lockLine : C.mortar;
  const { x, y, w, h } = rect;
  const bevel = h * 0.22;

  return (
    <g
      onClick={locked ? undefined : onClick}
      style={{ cursor: locked ? 'default' : 'pointer' }}
      role={locked ? undefined : 'button'}
      aria-label={locked ? `${label} (locked)` : label}
    >
      <title>{locked ? 'Locked' : label}</title>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={Math.max(1, s * 0.06)}
        fill={fill}
        stroke={stroke}
        strokeWidth={Math.max(1, s * 0.05)}
        filter={play ? 'url(#goldGlow)' : undefined}
      />
      {!locked && (
        <>
          {/* top-left highlight course */}
          <rect x={x} y={y} width={w} height={bevel} fill={C.stoneHi} opacity={play ? 0.55 : 0.32} />
          {/* bottom shadow course */}
          <rect
            x={x}
            y={y + h - bevel}
            width={w}
            height={bevel}
            fill={C.stoneShadow}
            opacity={0.4}
          />
        </>
      )}
      {locked && (
        // A dark buried block: faint crack line.
        <line
          x1={x + w * 0.2}
          y1={y + h * 0.35}
          x2={x + w * 0.7}
          y2={y + h * 0.75}
          stroke="#191106"
          strokeWidth={Math.max(1, s * 0.04)}
        />
      )}
      {done && (
        // Carved check.
        <path
          d={`M ${x + w * 0.26} ${y + h * 0.52} L ${x + w * 0.44} ${y + h * 0.7} L ${x + w * 0.76} ${y + h * 0.3}`}
          fill="none"
          stroke={C.mortar}
          strokeWidth={Math.max(1.4, s * 0.1)}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.75}
        />
      )}
    </g>
  );
}

/**
 * A small explorer head (pith helmet + face) marking the block the player should
 * tackle next — the current step. Drawn to read as a HEAD wearing a helmet (face
 * prominent, brim only ~1.4x the face — not the wide brim of the full-body
 * sprite), emerging FROM the sandstone block, not floating above it like the old
 * torch. Colours mirror ExplorerSprite so the cast reads as one set.
 */
function ExplorerHead({ cx, cy, s }: { cx: number; cy: number; s: number }) {
  const helm = '#d8cba2';
  const helmLt = '#efe6c8';
  const helmSh = '#a99b6f';
  const skin = '#cf9f70';
  const r = s * 0.4; // face radius (prominent, so it reads as a head)
  const sw = Math.max(0.5, s * 0.03);
  return (
    <g filter="url(#torchGlow)">
      {/* face */}
      <ellipse cx={cx} cy={cy + r * 0.16} rx={r} ry={r * 1.06} fill={skin} />
      {/* brow shadow under the brim + eyes */}
      <ellipse cx={cx} cy={cy - r * 0.06} rx={r * 0.9} ry={r * 0.4} fill="#a67c4d" opacity="0.35" />
      <circle cx={cx - r * 0.36} cy={cy + r * 0.26} r={r * 0.17} fill="#2a1d10" />
      <circle cx={cx + r * 0.36} cy={cy + r * 0.26} r={r * 0.17} fill="#2a1d10" />
      {/* helmet dome — compact */}
      <path
        d={`M ${cx - r * 0.86} ${cy - r * 0.24} Q ${cx - r * 0.86} ${cy - r * 1.32} ${cx} ${cy - r * 1.32} Q ${cx + r * 0.86} ${cy - r * 1.32} ${cx + r * 0.86} ${cy - r * 0.24} Z`}
        fill={helm}
      />
      {/* brim — just over the brow, ~1.3x the face */}
      <ellipse cx={cx} cy={cy - r * 0.22} rx={r * 1.28} ry={r * 0.38} fill={helm} stroke={helmSh} strokeWidth={sw} />
      {/* dome highlight + knob */}
      <path
        d={`M ${cx - r * 0.46} ${cy - r * 0.62} Q ${cx - r * 0.14} ${cy - r * 1.12} ${cx + r * 0.12} ${cy - r * 1.16}`}
        fill="none"
        stroke={helmLt}
        strokeWidth={sw * 1.6}
        strokeLinecap="round"
        opacity="0.85"
      />
      <circle cx={cx} cy={cy - r * 1.36} r={r * 0.18} fill={helm} />
    </g>
  );
}

/**
 * A pyramid drawn as a stepped tomb of carved stone blocks — one block per level
 * (base→apex, rows 4/3/2/1) — planted in sand with a gilded capstone. Each
 * unlocked block is individually clickable.
 */
export function PyramidSprite({
  pyramid,
  pyramidLocked,
  isActive,
  stateOf,
  labelOf,
  onSelect,
  tileSize: s,
  gap: g,
}: PyramidSpriteProps) {
  const rows = pyramid.rows; // base→apex, lengths [4,3,2,1]
  const baseCount = rows[0].length;
  const baseW = baseCount * s + (baseCount - 1) * g;
  const pad = s * 0.16;
  const apexRow = rows.length - 1;
  const apexTopY = blockRect(apexRow, 0, rows[apexRow].length, s, g).y;
  const capH = s * 0.62;
  const capApexY = apexTopY - capH;

  const gilded = isActive || (!pyramidLocked && pyramid.rows.flat().every((id) => stateOf(id) === 'completed'));

  // Backing mass so blocks read as one pyramid, with mortar showing between them.
  const backing = `M ${-(baseW / 2 + pad)} 3 L ${baseW / 2 + pad} 3 L 0 ${capApexY} Z`;
  const mound = `M ${-baseW * 0.72} 4 Q 0 ${-s * 0.34} ${baseW * 0.72} 4 L ${baseW * 0.72} ${s * 0.55} L ${-baseW * 0.72} ${s * 0.55} Z`;

  // Find the single "play" block (the current frontier) to mark with the explorer.
  let torch: { cx: number; topY: number } | undefined;

  const blocks: ReactNode[] = [];
  rows.forEach((row, r) => {
    row.forEach((id, i) => {
      const rect = blockRect(r, i, row.length, s, g);
      const state = pyramidLocked ? 'locked' : stateOf(id);
      if ((state === 'available' || state === 'current') && !torch) {
        torch = { cx: rect.x + rect.w / 2, topY: rect.y };
      }
      blocks.push(
        <Block
          key={id}
          rect={rect}
          state={state}
          label={labelOf(id)}
          onClick={() => onSelect(id)}
          s={s}
        />,
      );
    });
  });

  return (
    <g opacity={pyramidLocked ? 0.85 : 1}>
      {/* grounding shadow */}
      <ellipse cx={0} cy={6} rx={baseW * 0.62} ry={s * 0.2} fill="rgba(0,0,0,0.38)" />
      {/* sand the pyramid is planted in (behind base) */}
      <path d={mound} fill={C.sandDark} />
      {/* pyramid body */}
      <path d={backing} fill={pyramidLocked ? C.bodyDark : C.bodyMid} stroke={C.mortar} strokeWidth={Math.max(1, s * 0.04)} />
      {/* capstone */}
      <path
        d={`M ${-s * 0.5} ${apexTopY} L ${s * 0.5} ${apexTopY} L 0 ${capApexY} Z`}
        fill={pyramidLocked ? C.lockStone : gilded ? C.gold : C.stoneLit}
        stroke={C.mortar}
        strokeWidth={Math.max(1, s * 0.05)}
        filter={gilded ? 'url(#goldGlow)' : undefined}
      />
      {blocks}
      {/* front sand pile burying the very base */}
      <path
        d={`M ${-baseW * 0.66} 3 Q 0 ${-s * 0.24} ${baseW * 0.66} 3 L ${baseW * 0.66} ${s * 0.6} L ${-baseW * 0.66} ${s * 0.6} Z`}
        fill={C.sand}
      />
      <path
        d={`M ${-baseW * 0.66} 3 Q 0 ${-s * 0.24} ${baseW * 0.66} 3`}
        fill="none"
        stroke={C.sandHi}
        strokeWidth={Math.max(1, s * 0.05)}
        opacity={0.6}
      />
      {torch && <ExplorerHead cx={torch.cx} cy={torch.topY + s * 0.34} s={s} />}
    </g>
  );
}
