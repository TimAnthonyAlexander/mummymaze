import { useState } from 'react';
import { AppBar, Box, IconButton, Toolbar, Tooltip } from '@mui/material';
import { Map as MapIcon, Menu } from 'lucide-react';
import type { Action, GameState } from '../engine';
import type { RenderState } from '../game/render';
import type { Pyramid } from '../levels/pyramids';
import type { PyramidProgress } from '../game/useProgress';
import { BoardPane } from './BoardPane';
import { Controls } from './Controls';
import { LevelDrawer } from './LevelDrawer';
import { AppTitle } from './AppTitle';
import { StatusChips } from './StatusChips';
import { SettingsToggles } from './SettingsToggles';
import { useSettings } from '../game/useSettings';

interface MobileShellProps {
  pyramid: Pyramid;
  pyramidProgress: PyramidProgress;
  currentId: string;
  state: GameState;
  render: RenderState;
  canUndo: boolean;
  animating: boolean;
  unlocked: ReadonlySet<string>;
  completed: ReadonlySet<string>;
  hasNext: boolean;
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
  onNext: () => void;
  onHint: () => void;
  onShowSolution: () => void;
}

/**
 * Phone layout (< md): a slim top bar with a drawer trigger + map shortcut, the
 * square board filling the width, and the movement controls pinned below — no
 * page scroll, no horizontal overflow down to 375px.
 */
export function MobileShell({
  pyramid,
  pyramidProgress,
  currentId,
  state,
  render,
  canUndo,
  animating,
  unlocked,
  completed,
  hasNext,
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
  onNext,
  onHint,
  onShowSolution,
}: MobileShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { moveArrows } = useSettings();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        // Use the SMALL viewport height (svh): the height with the browser's
        // chrome shown, so nothing is ever hidden under iOS 26 Safari's floating
        // nav bar. Fall back to vh on older engines that lack svh.
        height: '100vh',
        minHeight: '100svh',
        maxHeight: '100svh',
        width: '100vw',
        overflow: 'hidden',
      }}
    >
      <AppBar position="static" elevation={4} color="default">
        <Toolbar variant="dense" disableGutters sx={{ gap: 0.5, minHeight: 56, px: 1 }}>
          <IconButton
            edge="start"
            aria-label="Open menu"
            onClick={() => setDrawerOpen(true)}
            sx={{ color: 'text.primary' }}
          >
            <Menu />
          </IconButton>
          <Box sx={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
            <AppTitle iconSize={22} variant="subtitle1" />
          </Box>
          <Box sx={{ flexShrink: 0 }}>
            <StatusChips state={state} animating={animating} />
          </Box>
          <Tooltip title="World map">
            <IconButton
              aria-label="World map"
              onClick={onOpenMap}
              size="small"
              sx={{ color: 'primary.main', flexShrink: 0 }}
            >
              <MapIcon size={20} />
            </IconButton>
          </Tooltip>
          <Box sx={{ flexShrink: 0 }}>
            <SettingsToggles iconSize={18} compact />
          </Box>
        </Toolbar>
      </AppBar>

      <Box sx={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <BoardPane
          state={state}
          render={render}
          animating={animating}
          hasNext={hasNext}
          moveArrows={moveArrows}
          onMove={onMove}
          onRestart={onRestart}
          onNext={onNext}
        />
      </Box>

      <Box
        sx={{
          pt: 1.5,
          // Keep the movement wheel above the home indicator / floating nav.
          pb: 'calc(12px + env(safe-area-inset-bottom))',
          flexShrink: 0,
        }}
      >
        <Controls
          compact
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

      <LevelDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        pyramid={pyramid}
        pyramidProgress={pyramidProgress}
        currentId={currentId}
        state={state}
        animating={animating}
        unlocked={unlocked}
        completed={completed}
        onSelectLevel={onSelectLevel}
        onResetProgress={onResetProgress}
        onOpenMap={onOpenMap}
      />
    </Box>
  );
}
