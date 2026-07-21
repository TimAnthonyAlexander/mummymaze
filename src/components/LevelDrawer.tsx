import { Box, Divider, Drawer, Stack } from '@mui/material';
import type { GameState, Level } from '../engine';
import { AppTitle } from './AppTitle';
import { LevelList } from './LevelList';
import { StatusPanel } from './StatusPanel';
import { SidebarFooter } from './SidebarFooter';

interface LevelDrawerProps {
  open: boolean;
  onClose: () => void;
  levels: readonly Level[];
  currentId: string;
  state: GameState;
  animating: boolean;
  unlocked: ReadonlySet<string>;
  completed: ReadonlySet<string>;
  bestMoves: Record<string, number>;
  onSelectLevel: (id: string) => void;
  onResetProgress: () => void;
}

/**
 * Mobile-only temporary drawer holding the level list, status and footer
 * actions. Movement controls stay on the main shell, not in here.
 */
export function LevelDrawer({
  open,
  onClose,
  levels,
  currentId,
  state,
  animating,
  unlocked,
  completed,
  bestMoves,
  onSelectLevel,
  onResetProgress,
}: LevelDrawerProps) {
  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: 'min(84vw, 320px)' } } }}
    >
      <Stack spacing={2} sx={{ p: 2, flexGrow: 1, minHeight: '100%' }}>
        <AppTitle />

        <Divider />

        <Box sx={{ overflowY: 'auto' }}>
          <LevelList
            levels={levels}
            currentId={currentId}
            unlocked={unlocked}
            completed={completed}
            bestMoves={bestMoves}
            onSelectLevel={(id) => {
              onSelectLevel(id);
              onClose();
            }}
          />
        </Box>

        <Divider />

        <StatusPanel state={state} animating={animating} />

        <SidebarFooter onResetProgress={onResetProgress} onAfterReset={onClose} />
      </Stack>
    </Drawer>
  );
}
