import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CircleDot,
  RotateCcw,
  Undo2,
} from 'lucide-react';
import { Box, Button, IconButton, Stack, Tooltip } from '@mui/material';
import type { Action } from '../engine';

interface ControlsProps {
  onMove: (action: Action) => void;
  onUndo: () => void;
  onRestart: () => void;
  canUndo: boolean;
  disabled: boolean;
}

export function Controls({ onMove, onUndo, onRestart, canUndo, disabled }: ControlsProps) {
  const dpadBtn = (action: Action, icon: React.ReactNode, label: string) => (
    <Tooltip title={label}>
      <span>
        <IconButton
          onClick={() => onMove(action)}
          disabled={disabled}
          sx={{
            bgcolor: 'background.paper',
            border: '1px solid rgba(201,154,30,0.4)',
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          {icon}
        </IconButton>
      </span>
    </Tooltip>
  );

  return (
    <Stack spacing={2} sx={{ alignItems: 'center' }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 48px)',
          gridTemplateRows: 'repeat(3, 48px)',
          gap: 1,
          placeItems: 'center',
        }}
      >
        <Box />
        {dpadBtn('N', <ArrowUp />, 'Up (↑ / W)')}
        <Box />
        {dpadBtn('W', <ArrowLeft />, 'Left (← / A)')}
        {dpadBtn('wait', <CircleDot />, 'Wait (Space)')}
        {dpadBtn('E', <ArrowRight />, 'Right (→ / D)')}
        <Box />
        {dpadBtn('S', <ArrowDown />, 'Down (↓ / S)')}
        <Box />
      </Box>

      <Stack direction="row" spacing={1}>
        <Button
          onClick={onUndo}
          disabled={!canUndo}
          startIcon={<Undo2 size={18} />}
          variant="outlined"
          color="secondary"
        >
          Undo
        </Button>
        <Button
          onClick={onRestart}
          startIcon={<RotateCcw size={18} />}
          variant="outlined"
          color="warning"
        >
          Restart
        </Button>
      </Stack>
    </Stack>
  );
}
