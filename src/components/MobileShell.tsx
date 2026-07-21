import { useState } from 'react';
import { AppBar, Box, IconButton, Toolbar } from '@mui/material';
import { Menu } from 'lucide-react';
import type { Action, GameState, Level } from '../engine';
import type { RenderState } from '../game/render';
import { BoardPane } from './BoardPane';
import { Controls } from './Controls';
import { LevelDrawer } from './LevelDrawer';
import { AppTitle } from './AppTitle';
import { StatusChips } from './StatusChips';
import { SettingsToggles } from './SettingsToggles';

interface MobileShellProps {
  levels: readonly Level[];
  currentId: string;
  state: GameState;
  render: RenderState;
  canUndo: boolean;
  animating: boolean;
  unlocked: ReadonlySet<string>;
  completed: ReadonlySet<string>;
  bestMoves: Record<string, number>;
  hasNext: boolean;
  hintDir: Action | null;
  hintUsed: boolean;
  solution: Action[] | null;
  unsolvable: boolean;
  onSelectLevel: (id: string) => void;
  onResetProgress: () => void;
  onMove: (action: Action) => void;
  onUndo: () => void;
  onRestart: () => void;
  onNext: () => void;
  onHint: () => void;
  onShowSolution: () => void;
}

/**
 * Phone layout (< md): a slim top bar with a drawer trigger, the square board
 * filling the width, and the movement controls pinned below — no page scroll,
 * no horizontal overflow down to 375px.
 */
export function MobileShell({
  levels,
  currentId,
  state,
  render,
  canUndo,
  animating,
  unlocked,
  completed,
  bestMoves,
  hasNext,
  hintDir,
  hintUsed,
  solution,
  unsolvable,
  onSelectLevel,
  onResetProgress,
  onMove,
  onUndo,
  onRestart,
  onNext,
  onHint,
  onShowSolution,
}: MobileShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
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
          onRestart={onRestart}
          onNext={onNext}
        />
      </Box>

      <Box sx={{ py: 1.5, flexShrink: 0 }}>
        <Controls
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
        levels={levels}
        currentId={currentId}
        state={state}
        animating={animating}
        unlocked={unlocked}
        completed={completed}
        bestMoves={bestMoves}
        onSelectLevel={onSelectLevel}
        onResetProgress={onResetProgress}
      />
    </Box>
  );
}
