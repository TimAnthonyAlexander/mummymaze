import { useLayoutEffect, useRef, useState } from 'react';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { ArrowRight } from 'lucide-react';
import type { GameState } from '../engine';
import type { RenderState } from '../game/render';
import { Board } from './Board';

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
  const available = Math.min(size.w, size.h) - PANE_PADDING - BOARD_CHROME;
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
          <Board level={state.level} render={render} cellSize={cellSize} />
          {done && (
            <Paper
              elevation={8}
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'grid',
                placeItems: 'center',
                bgcolor: 'rgba(20,16,10,0.82)',
                borderRadius: 2,
              }}
            >
              <Stack spacing={2} sx={{ alignItems: 'center' }}>
                <Typography variant="h4" color={won ? 'success.main' : 'error.main'}>
                  {won ? 'You escaped!' : 'You died'}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button variant="contained" color="warning" onClick={onRestart}>
                    Try again
                  </Button>
                  {won && hasNext && (
                    <Button
                      variant="contained"
                      color="success"
                      endIcon={<ArrowRight />}
                      onClick={onNext}
                    >
                      Next level
                    </Button>
                  )}
                </Stack>
              </Stack>
            </Paper>
          )}
        </Box>
      )}
    </Box>
  );
}
