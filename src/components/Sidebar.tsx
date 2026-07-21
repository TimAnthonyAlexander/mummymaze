import { Box, Button, Divider, Paper, Stack } from '@mui/material';
import { Map as MapIcon } from 'lucide-react';
import type { Action, GameState } from '../engine';
import type { Pyramid } from '../levels/pyramids';
import type { PyramidProgress } from '../game/useProgress';
import { Controls } from './Controls';
import { AppTitle } from './AppTitle';
import { CurrentPyramidPanel } from './CurrentPyramidPanel';
import { StatusPanel } from './StatusPanel';
import { SidebarFooter } from './SidebarFooter';
import { SettingsToggles } from './SettingsToggles';

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
 * Desktop left rail. A full-height flex COLUMN that never scrolls as a whole:
 * the title is pinned at the top, the current-pyramid + status live in the one
 * flexible middle region (which is the only part allowed to scroll, and only on
 * a very short viewport), and the controls + settings + map + footer are pinned
 * at the bottom so everything fits at normal heights.
 */
export function Sidebar({
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
  return (
    <Paper
      square
      elevation={4}
      sx={{
        width: 'clamp(220px, 17vw, 320px)',
        flexShrink: 0,
        height: '100%',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid rgba(201,154,30,0.25)',
      }}
    >
      {/* Pinned title */}
      <Box sx={{ px: 2, pt: 2, pb: 1, flexShrink: 0 }}>
        <AppTitle />
      </Box>
      <Divider />

      {/* Flexible middle: the ONLY region allowed to scroll (short viewports) */}
      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 2, py: 1.5 }}>
        <Stack sx={{ gap: 1.5 }}>
          <CurrentPyramidPanel
            pyramid={pyramid}
            currentId={currentId}
            unlocked={unlocked}
            completed={completed}
            progress={pyramidProgress}
            onSelect={onSelectLevel}
          />
          <Divider />
          <StatusPanel state={state} animating={animating} />
        </Stack>
      </Box>

      {/* Pinned controls + settings + map + footer */}
      <Box sx={{ flexShrink: 0, px: 2, pt: 1.5, pb: 1.5, borderTop: '1px solid rgba(201,154,30,0.18)' }}>
        <Stack sx={{ gap: 1.25, alignItems: 'stretch' }}>
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

          <Stack
            direction="row"
            sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}
          >
            <Button
              onClick={onOpenMap}
              startIcon={<MapIcon size={18} />}
              variant="outlined"
              color="primary"
              size="small"
              sx={{ flex: 1 }}
            >
              Map
            </Button>
            <SettingsToggles />
          </Stack>

          <SidebarFooter onResetProgress={onResetProgress} />
        </Stack>
      </Box>
    </Paper>
  );
}
