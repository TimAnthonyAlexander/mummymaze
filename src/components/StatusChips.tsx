import type { ReactNode } from 'react';
import { Stack } from '@mui/material';
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

/** A small engraved stone tag (icon + label), tinted per outcome. */
function StoneTag({ icon, label, tone }: { icon?: ReactNode; label: string; tone?: 'success' | 'error' }) {
  return (
    <span className={`stone-tag${tone ? ` stone-tag--${tone}` : ''}`}>
      {icon}
      {label}
    </span>
  );
}

/**
 * The moves / par readouts plus the settled win-or-lose tag, as engraved stone
 * tags. Shared by the desktop status panel and the mobile top bar. While a turn
 * animates the outcome isn't final yet, so the end tags are held back.
 */
export function StatusChips({ state, animating }: StatusChipsProps) {
  const settled = state.phase !== 'player' && !animating;
  return (
    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
      <StoneTag icon={<Footprints size={14} />} label={`Moves: ${state.moveCount}`} />
      {state.level.par !== undefined && <StoneTag label={`Par: ${state.level.par}`} />}
      {settled && state.phase === 'won' && (
        <StoneTag icon={<Trophy size={14} />} label="Escaped!" tone="success" />
      )}
      {settled && state.phase === 'lost' && (
        <StoneTag icon={<Skull size={14} />} label={LOSS_TEXT[state.lossReason ?? 'caught']} tone="error" />
      )}
    </Stack>
  );
}
