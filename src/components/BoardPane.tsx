import { type CSSProperties, useLayoutEffect, useRef, useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { ArrowRight, RotateCcw } from 'lucide-react';
import type { Action, GameState } from '../engine';
import type { RenderState } from '../game/render';
import { boardTextures } from '../game/textures';
import { Board } from './Board';
import { BoardFrame } from './BoardFrame';

const STONE_VARS = {
  '--frame-stone': boardTextures.frameStone,
  '--tablet-stone': boardTextures.wallTop,
} as CSSProperties;

/** Padding (px) reserved around the square board inside the pane. */
const PANE_PADDING = 32;
/**
 * The board draws its own frame outside the cell grid (6px padding + 3px wall
 * border per side => 18px total). Reserve it so the framed board never spills
 * past the pane — critical on mobile where the pane is only ~375px wide.
 */
const BOARD_CHROME = 18;

interface BoardPaneProps {
  state: GameState;
  render: RenderState;
  animating: boolean;
  hasNext: boolean;
  moveArrows: boolean;
  onMove: (action: Action) => void;
  onRestart: () => void;
  onNext: () => void;
}

/**
 * Right-hand pane. Measures its own box with a ResizeObserver and derives the
 * largest square board that fits, keeping every cell a perfect 1:1 square.
 * More grid cells => smaller cells, never a bigger board.
 */
export function BoardPane({
  state,
  render,
  animating,
  hasNext,
  moveArrows,
  onMove,
  onRestart,
  onNext,
}: BoardPaneProps) {
  const paneRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = paneRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  const gridDim = Math.max(state.level.width, state.level.height);
  // The ornate frame thickness scales with the pane (bounded), then reserves its
  // own room so the framed board still fits — critical on narrow mobile.
  const paneMin = Math.min(size.w, size.h);
  const frame = paneMin > 0 ? Math.min(42, Math.max(18, Math.round(paneMin * 0.05))) : 0;
  const available = paneMin - PANE_PADDING - BOARD_CHROME - frame * 2;
  const cellSize = gridDim > 0 && available > 0 ? Math.floor(available / gridDim) : 0;

  // Only reveal the end-of-level overlay once the turn's animation has settled
  // (e.g. after the explorer has actually walked out through the exit).
  const done = state.phase !== 'player' && !animating;
  const won = state.phase === 'won';

  return (
    <Box
      ref={paneRef}
      sx={{
        flex: 1,
        height: '100%',
        minWidth: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: `${PANE_PADDING / 2}px`,
        overflow: 'visible',
      }}
    >
      {cellSize > 0 && (
        <Box sx={{ position: 'relative', overflow: 'visible' }}>
          <BoardFrame thickness={frame}>
            <Board
              level={state.level}
              render={render}
              cellSize={cellSize}
              moveArrows={moveArrows}
              interactive={state.phase === 'player' && !animating}
              onMove={onMove}
            />
          </BoardFrame>
          {done && (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                zIndex: 5,
                display: 'grid',
                placeItems: 'center',
                bgcolor: 'rgba(12,8,3,0.72)',
                borderRadius: 2,
              }}
            >
              <Box
                className="stone-slab"
                style={STONE_VARS}
                sx={{ px: { xs: 3, sm: 4 }, py: { xs: 2.5, sm: 3 }, textAlign: 'center', maxWidth: '86%' }}
              >
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 700,
                    letterSpacing: 0.5,
                    mb: 2,
                    color: won ? '#f4d774' : '#e79070',
                    textShadow: '0 2px 0 rgba(0,0,0,0.65)',
                  }}
                >
                  {won ? 'You escaped!' : 'You died'}
                </Typography>
                <Stack direction="row" spacing={1.25} sx={{ justifyContent: 'center' }}>
                  <button
                    type="button"
                    className="stone-btn stone-btn--sm stone-btn--warn"
                    style={{ width: 'auto' }}
                    onClick={onRestart}
                  >
                    <RotateCcw size={16} />
                    Try again
                  </button>
                  {won && hasNext && (
                    <button
                      type="button"
                      className="stone-btn stone-btn--sm stone-btn--gold"
                      style={{ width: 'auto' }}
                      onClick={onNext}
                    >
                      Next level
                      <ArrowRight size={16} />
                    </button>
                  )}
                </Stack>
              </Box>
            </Box>
          )}
        </Box>

      )}
    </Box>
  );
}
