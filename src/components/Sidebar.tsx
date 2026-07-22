import { type CSSProperties, memo } from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { Map as MapIcon, Pencil } from 'lucide-react';
import type { Action, GameState } from '../engine';
import type { Pyramid } from '../levels/pyramids';
import type { PyramidProgress } from '../game/useProgress';
import { boardTextures } from '../game/textures';
import { Controls } from './Controls';
import { AppTitle } from './AppTitle';
import { StatusPanel } from './StatusPanel';
import { SettingsToggles } from './SettingsToggles';
import { SidebarPyramid } from './SidebarPyramid';
import { Ankh } from './Ankh';

interface SidebarProps {
  pyramid: Pyramid;
  pyramidProgress: PyramidProgress;
  currentId: string;
  state: GameState;
  canUndo: boolean;
  animating: boolean;
  unlocked: ReadonlySet<string>;
  completed: ReadonlySet<string>;
  hintDir: Action | null;
  hintUsed: boolean;
  solution: Action[] | null;
  unsolvable: boolean;
  onSelectLevel: (id: string) => void;
  onResetProgress: () => void;
  onOpenMap: () => void;
  onMove: (action: Action) => void;
  onUndo: () => void;
  onRestart: () => void;
  onHint: () => void;
  onShowSolution: () => void;
}

/**
 * Desktop left rail, styled as a carved-stone tomb wall. A full-height flex
 * column: title + settings pinned at the top, the status and the game controls
 * (no movement wheel — arrow keys / WASD move on desktop) below, then a flexible
 * gap, and pinned at the BOTTOM the big stone Map / Editor keys and the current
 * pyramid rendered like the world map (with a gold ankh on its plaque).
 */
export const Sidebar = memo(function Sidebar({
  pyramid,
  pyramidProgress,
  currentId,
  state,
  canUndo,
  animating,
  unlocked,
  completed,
  hintDir,
  hintUsed,
  solution,
  unsolvable,
  onSelectLevel,
  onResetProgress,
  onOpenMap,
  onMove,
  onUndo,
  onRestart,
  onHint,
  onShowSolution,
}: SidebarProps) {
  const stoneVars = {
    '--frame-stone': boardTextures.frameStone,
    '--tablet-stone': boardTextures.wallTop,
  } as CSSProperties;

  const handleReset = () => {
    if (window.confirm('Reset all progress? This relocks every pyramid and clears your best moves.')) {
      onResetProgress();
    }
  };

  return (
    <Paper
      square
      elevation={4}
      className="sidebar"
      style={stoneVars}
      sx={{
        width: 'clamp(250px, 19vw, 340px)',
        flexShrink: 0,
        height: '100%',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        // Set on the instance (not a class) so it beats the MuiPaper theme
        // override deterministically; the dark overlay keeps the stone deep.
        backgroundColor: '#140d06',
        backgroundImage: `linear-gradient(rgba(8,5,2,0.52), rgba(8,5,2,0.6)), var(--frame-stone)`,
        backgroundSize: 'auto, 172px',
      }}
    >
      {/* Pinned: title */}
      <Box sx={{ px: 2, pt: 2, pb: 1, flexShrink: 0 }}>
        <AppTitle />
      </Box>
      <hr className="stone-rule" style={{ marginLeft: 12, marginRight: 12 }} />

      {/* Status + controls */}
      <Box sx={{ px: 2, py: 1.25, flexShrink: 0 }}>
        <StatusPanel state={state} animating={animating} />
      </Box>
      <Box sx={{ px: 2, pb: 1, flexShrink: 0 }}>
        <Controls
          showWheel={false}
          onMove={onMove}
          onUndo={onUndo}
          onRestart={onRestart}
          canUndo={canUndo}
          disabled={animating || state.phase !== 'player'}
          hintDir={hintDir}
          hintUsed={hintUsed}
          solution={solution}
          unsolvable={unsolvable}
          onHint={onHint}
          onShowSolution={onShowSolution}
        />
      </Box>

      {/* Flexible gap pushes the map/editor + pyramid to the base of the wall. */}
      <Box sx={{ flex: 1, minHeight: 10, overflowY: 'auto' }} />

      {/* Pinned bottom: big stone keys + the current pyramid plaque. */}
      <Box sx={{ px: 2, pb: 2, flexShrink: 0 }}>
        <Stack sx={{ gap: 1.1 }}>
          <button type="button" className="stone-btn" onClick={onOpenMap}>
            <MapIcon size={19} />
            World Map
          </button>
          <RouterLink to="/editor" className="stone-btn" style={{ textDecoration: 'none' }}>
            <Pencil size={18} />
            Level Editor
          </RouterLink>

          <Box className="stone-plaque" sx={{ mt: 0.5 }}>
            <Ankh size={34} className="stone-plaque__ankh" dead={unsolvable} />
            <Stack
              direction="row"
              sx={{ alignItems: 'baseline', justifyContent: 'space-between', gap: 1, mb: 0.5, pr: 3.5 }}
            >
              <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1, lineHeight: 1.4 }}>
                {pyramid.name}
              </Typography>
              <Typography variant="caption" sx={{ color: 'warning.light', fontWeight: 700 }}>
                {pyramidProgress.completedCount} / {pyramidProgress.total}
              </Typography>
            </Stack>
            <SidebarPyramid
              pyramid={pyramid}
              currentId={currentId}
              unlocked={unlocked}
              completed={completed}
              onSelect={onSelectLevel}
            />
          </Box>

          <Stack
            direction="row"
            sx={{ mt: 0.25, alignItems: 'center', justifyContent: 'space-between' }}
          >
            <SettingsToggles />
            <Box
              component="button"
              type="button"
              onClick={handleReset}
              sx={{
                background: 'none',
                border: 0,
                cursor: 'pointer',
                color: 'text.secondary',
                fontFamily: 'inherit',
                fontSize: 12,
                py: 0.5,
                '&:hover': { color: 'error.main' },
              }}
            >
              Reset progress
            </Box>
          </Stack>
        </Stack>
      </Box>
    </Paper>
  );
});
