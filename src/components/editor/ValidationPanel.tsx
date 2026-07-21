/**
 * Live feedback panel. Shows the validation error (if any) or, for a valid
 * level, the solver + difficulty read-out. Unsolvable levels are flagged red.
 */
import { Alert, Chip, Paper, Stack, Typography } from '@mui/material';
import { CircleCheck, CircleX, Gauge, Route, Search } from 'lucide-react';
import type { Analysis } from './useLevelAnalysis';

interface ValidationPanelProps {
  analysis: Analysis;
}

export function ValidationPanel({ analysis }: ValidationPanelProps) {
  const { error, solvable, par, statesExplored, score } = analysis;

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
        Validation
      </Typography>

      {error ? (
        <Alert severity="error" icon={<CircleX size={18} />} sx={{ mt: 1 }}>
          {error}
        </Alert>
      ) : (
        <Stack spacing={1.5} sx={{ mt: 1 }}>
          {solvable ? (
            <Alert severity="success" icon={<CircleCheck size={18} />}>
              Solvable ✓
            </Alert>
          ) : (
            <Alert severity="error" icon={<CircleX size={18} />}>
              Not solvable ✗ — the explorer cannot reach the exit alive.
            </Alert>
          )}

          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            {par !== null && (
              <Chip
                icon={<Route size={15} />}
                label={`Par ${par}`}
                size="small"
                color={solvable ? 'primary' : 'default'}
              />
            )}
            <Chip
              icon={<Gauge size={15} />}
              label={`Difficulty ${score.toFixed(2)}`}
              size="small"
              variant="outlined"
            />
            <Chip
              icon={<Search size={15} />}
              label={`States ${statesExplored.toLocaleString()}`}
              size="small"
              variant="outlined"
            />
          </Stack>
        </Stack>
      )}
    </Paper>
  );
}
