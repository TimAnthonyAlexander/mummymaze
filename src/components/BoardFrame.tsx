import type { CSSProperties, ReactNode } from 'react';
import { frameArt } from '../game/frieze';
import { boardTextures } from '../game/textures';
import './BoardFrame.css';

interface BoardFrameProps {
  /** Border thickness in px (also the frieze/braid band height). */
  thickness: number;
  children: ReactNode;
}

/**
 * The ornate Egyptian "cabinet" that wraps the play field: a dark carved-stone
 * border with a hieroglyph frieze along the top and bottom, twisted-rope braids
 * down the sides, and a sun-disc rosette in each corner. Purely decorative — the
 * board (play field + its own sandstone perimeter walls) renders inside.
 */
export function BoardFrame({ thickness, children }: BoardFrameProps) {
  const style = {
    '--frame': `${thickness}px`,
    '--frame-stone': boardTextures.frameStone,
    '--frieze': frameArt.glyphBand,
    '--braid': frameArt.braid,
    '--rosette': frameArt.rosette,
  } as CSSProperties;

  return (
    <div className="frame" style={style}>
      <div className="frame__band frame__band--top" aria-hidden="true" />
      <div className="frame__band frame__band--bottom" aria-hidden="true" />
      <div className="frame__braid frame__braid--left" aria-hidden="true" />
      <div className="frame__braid frame__braid--right" aria-hidden="true" />
      <div className="frame__corner frame__corner--tl" aria-hidden="true" />
      <div className="frame__corner frame__corner--tr" aria-hidden="true" />
      <div className="frame__corner frame__corner--bl" aria-hidden="true" />
      <div className="frame__corner frame__corner--br" aria-hidden="true" />
      <div className="frame__inner">{children}</div>
    </div>
  );
}
