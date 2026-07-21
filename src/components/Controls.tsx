import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CircleDot,
  Eye,
  Lightbulb,
  RotateCcw,
  Undo2,
} from 'lucide-react';
import { Box, Button, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import type { Action } from '../engine';

interface ControlsProps {
  onMove: (action: Action) => void;
  onUndo: () => void;
  onRestart: () => void;
  canUndo: boolean;
  disabled: boolean;
  /** Optional hint affordances (wired on the game shells). */
  hintDir?: Action | null;
  hintUsed?: boolean;
  solution?: Action[] | null;
  unsolvable?: boolean;
  onHint?: () => void;
  onShowSolution?: () => void;
}

const DIR_LABEL: Record<Action, string> = {
  N: 'Up',
  S: 'Down',
  W: 'Left',
  E: 'Right',
  wait: 'Wait',
};

const ARROW_SIZE = 16;

/** Small direction arrow used in the solution sequence readout. */
function DirArrow({ action }: { action: Action }) {
  switch (action) {
    case 'N':
      return <ArrowUp size={ARROW_SIZE} />;
    case 'S':
      return <ArrowDown size={ARROW_SIZE} />;
    case 'W':
      return <ArrowLeft size={ARROW_SIZE} />;
    case 'E':
      return <ArrowRight size={ARROW_SIZE} />;
    default:
      return <CircleDot size={ARROW_SIZE} />;
  }
}

export function Controls({
  onMove,
  onUndo,
  onRestart,
  canUndo,
  disabled,
  hintDir = null,
  hintUsed = false,
  solution = null,
  unsolvable = false,
  onHint,
  onShowSolution,
}: ControlsProps) {
  const dpadBtn = (action: Action, icon: React.ReactNode, label: string) => {
    const highlighted = hintDir === action;
    return (
      <Tooltip title={label}>
        <span>
          <IconButton
            onClick={() => onMove(action)}
            disabled={disabled}
            sx={{
              bgcolor: highlighted ? 'rgba(201,154,30,0.28)' : 'background.paper',
              border: highlighted
                ? '2px solid rgba(201,154,30,0.95)'
                : '1px solid rgba(201,154,30,0.4)',
              color: highlighted ? 'warning.light' : 'inherit',
              '&:hover': { bgcolor: 'action.hover' },
              ...(highlighted && {
                animation: 'hintPulse 1.1s ease-in-out infinite',
                '@keyframes hintPulse': {
                  '0%, 100%': { boxShadow: '0 0 0 0 rgba(201,154,30,0.55)' },
                  '50%': { boxShadow: '0 0 10px 4px rgba(201,154,30,0.75)' },
                },
              }),
            }}
          >
            {icon}
          </IconButton>
        </span>
      </Tooltip>
    );
  };

  const showHintButtons = Boolean(onHint || onShowSolution);

  return (
    <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
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

      {showHintButtons && (
        <>
          <Stack direction="row" spacing={1}>
            <Tooltip title={hintUsed ? 'Hint already used this level' : 'Reveal the next best move'}>
              <span>
                <Button
                  onClick={onHint}
                  disabled={disabled || hintUsed || !onHint}
                  startIcon={<Lightbulb size={18} />}
                  variant="outlined"
                  size="small"
                >
                  Hint
                </Button>
              </span>
            </Tooltip>
            <Tooltip title="Last resort: reveal the full remaining solution">
              <span>
                <Button
                  onClick={onShowSolution}
                  disabled={disabled || !onShowSolution}
                  startIcon={<Eye size={18} />}
                  variant="text"
                  size="small"
                  color="inherit"
                  sx={{ color: 'text.secondary' }}
                >
                  Show solution
                </Button>
              </span>
            </Tooltip>
          </Stack>

          {unsolvable && (
            <Typography variant="caption" color="error.main" sx={{ textAlign: 'center' }}>
              No solution from here — undo or restart.
            </Typography>
          )}

          {!unsolvable && hintDir && !solution && (
            <Typography variant="caption" color="warning.light" sx={{ textAlign: 'center' }}>
              Hint: move {DIR_LABEL[hintDir]}
            </Typography>
          )}

          {!unsolvable && solution && solution.length > 0 && (
            <Stack spacing={0.5} sx={{ alignItems: 'center', maxWidth: 260 }}>
              <Typography variant="caption" color="text.secondary">
                Solution ({solution.length} {solution.length === 1 ? 'move' : 'moves'}):
              </Typography>
              <Stack
                direction="row"
                sx={{
                  flexWrap: 'wrap',
                  gap: 0.5,
                  justifyContent: 'center',
                  color: 'warning.light',
                }}
              >
                {solution.map((a, i) => (
                  <Box
                    key={`${i}-${a}`}
                    sx={{ display: 'inline-flex', alignItems: 'center' }}
                    aria-label={DIR_LABEL[a]}
                  >
                    <DirArrow action={a} />
                  </Box>
                ))}
              </Stack>
            </Stack>
          )}
        </>
      )}
    </Stack>
  );
}
