import { Box, List, ListItemButton, Stack, Typography } from '@mui/material';
import { CircleCheck, Lock } from 'lucide-react';
import type { Level } from '../engine';

interface LevelListProps {
  levels: readonly Level[];
  currentId: string;
  unlocked: ReadonlySet<string>;
  completed: ReadonlySet<string>;
  bestMoves: Record<string, number>;
  onSelectLevel: (id: string) => void;
}

/** Shared level picker used by both the desktop sidebar and the mobile drawer. */
export function LevelList({
  levels,
  currentId,
  unlocked,
  completed,
  bestMoves,
  onSelectLevel,
}: LevelListProps) {
  return (
    <Box>
      <Typography variant="overline" color="text.secondary" sx={{ px: 0.5, letterSpacing: 1 }}>
        Levels
      </Typography>
      <List dense disablePadding>
        {levels.map((lvl, i) => {
          const isLocked = !unlocked.has(lvl.id);
          const isCompleted = completed.has(lvl.id);
          const best = bestMoves[lvl.id];
          return (
            <ListItemButton
              key={lvl.id}
              selected={lvl.id === currentId}
              disabled={isLocked}
              onClick={() => onSelectLevel(lvl.id)}
              sx={{
                borderRadius: 1,
                mb: 0.5,
                opacity: isLocked ? 0.5 : 1,
                '&.Mui-selected': {
                  bgcolor: 'rgba(201,154,30,0.18)',
                  '&:hover': { bgcolor: 'rgba(201,154,30,0.26)' },
                },
              }}
            >
              <Stack
                direction="row"
                spacing={1}
                sx={{ minWidth: 0, width: '100%', alignItems: 'center' }}
              >
                <Stack sx={{ minWidth: 0, flexGrow: 1 }}>
                  <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                    {i + 1}. {lvl.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {lvl.width}×{lvl.height}
                    {lvl.par !== undefined ? ` · par ${lvl.par}` : ''}
                    {best !== undefined ? ` · best ${best}` : ''}
                  </Typography>
                </Stack>
                {isLocked ? (
                  <Lock size={15} color="#8a8a8a" aria-label="Locked" />
                ) : isCompleted ? (
                  <CircleCheck size={16} color="#4caf50" aria-label="Completed" />
                ) : null}
              </Stack>
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );
}
