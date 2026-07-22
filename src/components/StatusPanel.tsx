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
      <Typography
        variant="overline"
        sx={{ px: 0.5, letterSpacing: 2, color: '#b89a58', textShadow: '0 1px 0 rgba(0,0,0,0.6)' }}
      >
        Status
      </Typography>
      <Stack spacing={1} sx={{ mt: 0.5 }}>
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 700,
            color: '#f0d89a',
            letterSpacing: 0.3,
            textShadow: '0 1px 0 rgba(0,0,0,0.6)',
          }}
        >
          {state.level.name}
        </Typography>
        <StatusChips state={state} animating={animating} />
      </Stack>
    </Box>
  );
}
