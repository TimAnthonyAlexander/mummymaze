import { Chip, Stack } from '@mui/material';
import { Footprints, Skull, Trophy } from 'lucide-react';
import type { GameState } from '../engine';

export const LOSS_TEXT: Record<string, string> = {
  caught: 'A monster caught you!',
  trap: 'You stepped on a trap!',
  'walked-into-monster': 'You walked into a monster!',
};

interface StatusChipsProps {
  state: GameState;
  animating: boolean;
}

/**
 * The moves / par chips plus the settled win-or-lose chip. Shared by the
 * desktop status panel and the mobile top bar. While a turn animates the
 * outcome isn't final yet, so the end chips are held back.
 */
export function StatusChips({ state, animating }: StatusChipsProps) {
  const settled = state.phase !== 'player' && !animating;
  return (
    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
      <Chip icon={<Footprints size={15} />} label={`Moves: ${state.moveCount}`} size="small" />
      {state.level.par !== undefined && (
        <Chip label={`Par: ${state.level.par}`} size="small" variant="outlined" />
      )}
      {settled && state.phase === 'won' && (
        <Chip icon={<Trophy size={15} />} color="success" label="Escaped!" size="small" />
      )}
      {settled && state.phase === 'lost' && (
        <Chip
          icon={<Skull size={15} />}
          color="error"
          size="small"
          label={LOSS_TEXT[state.lossReason ?? 'caught']}
        />
      )}
    </Stack>
  );
}
