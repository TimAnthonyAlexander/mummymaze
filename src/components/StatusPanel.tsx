import { Box, Stack, Typography } from '@mui/material';
import type { GameState } from '../engine';
import { StatusChips } from './StatusChips';

interface StatusPanelProps {
  state: GameState;
  animating: boolean;
}

/** Full status block (heading + level name + chips), shared by sidebar and drawer. */
export function StatusPanel({ state, animating }: StatusPanelProps) {
  return (
    <Box>
      <Typography variant="overline" color="text.secondary" sx={{ px: 0.5, letterSpacing: 1 }}>
        Status
      </Typography>
      <Stack spacing={1} sx={{ mt: 0.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {state.level.name}
        </Typography>
        <StatusChips state={state} animating={animating} />
      </Stack>
    </Box>
  );
}
