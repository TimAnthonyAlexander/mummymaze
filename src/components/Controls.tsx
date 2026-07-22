import type { ReactNode } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Eye,
  Lightbulb,
  RotateCcw,
  Squircle,
  Undo2,
} from 'lucide-react';
import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
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
  /** Compact (mobile): collapse Undo/Restart/Hint/Solution into an icon-button row. */
  compact?: boolean;
  /** Show the directional wheel. Off on desktop (arrow keys / WASD move instead). */
  showWheel?: boolean;
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
      return <Squircle size={ARROW_SIZE} />;
  }
}

/** A single square control button; shared treatment for the pad and the center. */
function PadButton({
  onClick,
  disabled,
  label,
  highlighted = false,
  center = false,
  gridArea,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  highlighted?: boolean;
  center?: boolean;
  gridArea: string;
  children: ReactNode;
}) {
  return (
    <Tooltip title={label} disableInteractive>
      <Box
        component="button"
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        sx={{
          gridArea,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 0,
          cursor: disabled ? 'default' : 'pointer',
          borderRadius: center ? '50%' : '12px',
          color: highlighted ? 'warning.light' : center ? 'text.secondary' : 'primary.light',
          bgcolor: highlighted
            ? 'rgba(201,154,30,0.30)'
            : center
              ? 'rgba(120,110,80,0.14)'
              : 'rgba(201,154,30,0.08)',
          border: highlighted
            ? '2px solid #c99a1e'
            : center
              ? '1px dashed rgba(201,154,30,0.5)'
              : '1px solid rgba(201,154,30,0.4)',
          transition: 'transform 100ms ease, background-color 120ms ease, filter 120ms ease',
          '&:disabled': { opacity: 0.4, cursor: 'default' },
          '&:hover:not(:disabled)': {
            bgcolor: highlighted ? 'rgba(201,154,30,0.4)' : 'rgba(201,154,30,0.18)',
            filter: 'brightness(1.08)',
          },
          '&:active:not(:disabled)': { transform: 'scale(0.92)' },
          ...(highlighted && {
            animation: 'hintPulse 1.1s ease-in-out infinite',
            '@keyframes hintPulse': {
              '0%, 100%': { boxShadow: '0 0 0 0 rgba(201,154,30,0.5)' },
              '50%': { boxShadow: '0 0 10px 3px rgba(201,154,30,0.7)' },
            },
          }),
        }}
      >
        {children}
      </Box>
    </Tooltip>
  );
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
  compact = false,
  showWheel = true,
}: ControlsProps) {
  const showHintButtons = Boolean(onHint || onShowSolution);

  return (
    <Stack sx={{ alignItems: 'center', gap: 1.5 }}>
      {/* Directional cluster: a 3×3 template with a cohesive tile treatment.
          Hidden on desktop, where arrow keys / WASD move the explorer. */}
      {showWheel && (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 46px)',
          gridTemplateRows: 'repeat(3, 46px)',
          gap: '6px',
          p: '8px',
          borderRadius: '18px',
          bgcolor: 'rgba(20,16,10,0.5)',
          border: '1px solid rgba(201,154,30,0.18)',
          gridTemplateAreas: `
            ".    up    ."
            "left wait  right"
            ".    down  ."
          `,
        }}
      >
        <PadButton
          gridArea="up"
          onClick={() => onMove('N')}
          disabled={disabled}
          label="Up (↑ / W)"
          highlighted={hintDir === 'N'}
        >
          <ArrowUp size={22} />
        </PadButton>
        <PadButton
          gridArea="left"
          onClick={() => onMove('W')}
          disabled={disabled}
          label="Left (← / A)"
          highlighted={hintDir === 'W'}
        >
          <ArrowLeft size={22} />
        </PadButton>
        <PadButton
          gridArea="wait"
          onClick={() => onMove('wait')}
          disabled={disabled}
          label="Wait (Space)"
          highlighted={hintDir === 'wait'}
          center
        >
          <Squircle size={18} />
        </PadButton>
        <PadButton
          gridArea="right"
          onClick={() => onMove('E')}
          disabled={disabled}
          label="Right (→ / D)"
          highlighted={hintDir === 'E'}
        >
          <ArrowRight size={22} />
        </PadButton>
        <PadButton
          gridArea="down"
          onClick={() => onMove('S')}
          disabled={disabled}
          label="Down (↓ / S)"
          highlighted={hintDir === 'S'}
        >
          <ArrowDown size={22} />
        </PadButton>
      </Box>
      )}

      {compact ? (
        /* Mobile: one tight row of icon buttons + tooltips. */
        <Stack direction="row" sx={{ gap: 0.5, alignItems: 'center' }}>
          <Tooltip title="Undo (U)" disableInteractive>
            <span>
              <IconButton onClick={onUndo} disabled={!canUndo} size="small" color="secondary" aria-label="Undo">
                <Undo2 size={20} />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Restart (R)" disableInteractive>
            <IconButton onClick={onRestart} size="small" color="warning" aria-label="Restart">
              <RotateCcw size={20} />
            </IconButton>
          </Tooltip>
          {onHint && (
            <Tooltip title={hintUsed ? 'Hint already used this level' : 'Hint: reveal the next best move'} disableInteractive>
              <span>
                <IconButton onClick={onHint} disabled={disabled || hintUsed} size="small" color="primary" aria-label="Hint">
                  <Lightbulb size={20} />
                </IconButton>
              </span>
            </Tooltip>
          )}
          {onShowSolution && (
            <Tooltip title="Show solution: reveal the full remaining path" disableInteractive>
              <span>
                <IconButton
                  onClick={onShowSolution}
                  disabled={disabled}
                  size="small"
                  aria-label="Show solution"
                  sx={{ color: 'text.secondary' }}
                >
                  <Eye size={20} />
                </IconButton>
              </span>
            </Tooltip>
          )}
        </Stack>
      ) : (
        /* Desktop: carved-stone control keys. */
        <Stack sx={{ gap: 1, width: '100%' }}>
          <Stack direction="row" sx={{ gap: 1, width: '100%' }}>
            <Tooltip title="Undo (U)" disableInteractive>
              <Box sx={{ flex: 1 }}>
                <button type="button" className="stone-btn stone-btn--sm" onClick={onUndo} disabled={!canUndo}>
                  <Undo2 size={16} />
                  Undo
                </button>
              </Box>
            </Tooltip>
            <Tooltip title="Restart (R)" disableInteractive>
              <Box sx={{ flex: 1 }}>
                <button type="button" className="stone-btn stone-btn--sm stone-btn--warn" onClick={onRestart}>
                  <RotateCcw size={16} />
                  Restart
                </button>
              </Box>
            </Tooltip>
          </Stack>

          {showHintButtons && (
            <Stack direction="row" sx={{ gap: 1, width: '100%' }}>
              <Tooltip title={hintUsed ? 'Hint already used this level' : 'Reveal the next best move'}>
                <Box sx={{ flex: 1 }}>
                  <button
                    type="button"
                    className="stone-btn stone-btn--sm stone-btn--gold"
                    onClick={onHint}
                    disabled={disabled || hintUsed || !onHint}
                  >
                    <Lightbulb size={16} />
                    Hint
                  </button>
                </Box>
              </Tooltip>
              <Tooltip title="Last resort: reveal the full remaining solution">
                <Box sx={{ flex: 1 }}>
                  <button
                    type="button"
                    className="stone-btn stone-btn--sm stone-btn--muted"
                    onClick={onShowSolution}
                    disabled={disabled || !onShowSolution}
                  >
                    <Eye size={16} />
                    Solution
                  </button>
                </Box>
              </Tooltip>
            </Stack>
          )}
        </Stack>
      )}

      {showHintButtons && (
        <>
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
            <Stack sx={{ alignItems: 'center', gap: 0.5, maxWidth: 260 }}>
              <Typography variant="caption" color="text.secondary">
                Solution ({solution.length} {solution.length === 1 ? 'move' : 'moves'}):
              </Typography>
              <Stack
                direction="row"
                sx={{ flexWrap: 'wrap', gap: 0.5, justifyContent: 'center', color: 'warning.light' }}
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
