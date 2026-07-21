import { Box, Button, Divider, Drawer, Stack } from '@mui/material';
import { Map as MapIcon } from 'lucide-react';
import type { GameState } from '../engine';
import type { Pyramid } from '../levels/pyramids';
import type { PyramidProgress } from '../game/useProgress';
import { AppTitle } from './AppTitle';
import { CurrentPyramidPanel } from './CurrentPyramidPanel';
import { StatusPanel } from './StatusPanel';
import { SidebarFooter } from './SidebarFooter';

interface LevelDrawerProps {
  open: boolean;
  onClose: () => void;
  pyramid: Pyramid;
  pyramidProgress: PyramidProgress;
  currentId: string;
  state: GameState;
  animating: boolean;
  unlocked: ReadonlySet<string>;
  completed: ReadonlySet<string>;
  onSelectLevel: (id: string) => void;
  onResetProgress: () => void;
  onOpenMap: () => void;
}

/**
 * Mobile-only temporary drawer holding the current pyramid, a Map button, the
 * status block and footer actions. Movement controls stay on the main shell.
 */
export function LevelDrawer({
  open,
  onClose,
  pyramid,
  pyramidProgress,
  currentId,
  state,
  animating,
  unlocked,
  completed,
  onSelectLevel,
  onResetProgress,
  onOpenMap,
}: LevelDrawerProps) {
  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: 'min(84vw, 320px)' } } }}
    >
      <Stack sx={{ p: 2, flexGrow: 1, minHeight: '100%', gap: 2 }}>
        <AppTitle />

        <Divider />

        <Box sx={{ overflowY: 'auto' }}>
          <CurrentPyramidPanel
            pyramid={pyramid}
            currentId={currentId}
            unlocked={unlocked}
            completed={completed}
            progress={pyramidProgress}
            onSelect={(id) => {
              onSelectLevel(id);
              onClose();
            }}
            tileSize={44}
          />
        </Box>

        <Button
          onClick={() => {
            onClose();
            onOpenMap();
          }}
          startIcon={<MapIcon size={18} />}
          variant="outlined"
          color="primary"
          fullWidth
        >
          World map
        </Button>

        <Divider />

        <StatusPanel state={state} animating={animating} />

        <SidebarFooter onResetProgress={onResetProgress} onAfterReset={onClose} />
      </Stack>
    </Drawer>
  );
}
