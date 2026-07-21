import { Box, LinearProgress, Stack, Typography } from '@mui/material';
import type { Pyramid } from '../levels/pyramids';
import type { PyramidProgress } from '../game/useProgress';
import { PyramidShape } from './PyramidShape';

interface CurrentPyramidPanelProps {
  pyramid: Pyramid;
  currentId: string;
  unlocked: ReadonlySet<string>;
  completed: ReadonlySet<string>;
  progress: PyramidProgress;
  onSelect: (id: string) => void;
  tileSize?: number;
}

/**
 * Compact "current pyramid" block for the sidebar / mobile drawer: pyramid name,
 * a completed/total readout with a thin progress bar, and the mini pyramid of
 * level tiles (apex at top). Replaces the long flat level list.
 */
export function CurrentPyramidPanel({
  pyramid,
  currentId,
  unlocked,
  completed,
  progress,
  onSelect,
  tileSize = 38,
}: CurrentPyramidPanelProps) {
  const pct = progress.total > 0 ? (progress.completedCount / progress.total) * 100 : 0;
  return (
    <Box>
      <Stack
        direction="row"
        sx={{ alignItems: 'baseline', justifyContent: 'space-between', gap: 1, mb: 0.5 }}
      >
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
          {pyramid.name}
        </Typography>
        <Typography variant="caption" sx={{ color: 'warning.light', fontWeight: 700 }}>
          {progress.completedCount} / {progress.total}
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={pct}
        color="primary"
        sx={{ height: 4, borderRadius: 2, mb: 1.5, bgcolor: 'rgba(201,154,30,0.12)' }}
      />
      <Stack sx={{ alignItems: 'center' }}>
        <PyramidShape
          pyramid={pyramid}
          currentId={currentId}
          unlocked={unlocked}
          completed={completed}
          onSelect={onSelect}
          tileSize={tileSize}
          gap={Math.round(tileSize * 0.18)}
        />
      </Stack>
    </Box>
  );
}
