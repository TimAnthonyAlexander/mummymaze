import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Stack, Typography } from '@mui/material';
import { ArrowLeft } from 'lucide-react';
import { PYRAMIDS, getPyramidOfLevel, type Pyramid } from '../levels/pyramids';
import { useProgress } from '../game/useProgress';
import { loadSave } from '../game/storage';
import { LEVELS } from '../levels';
import { WorldTrail } from '../components/map/WorldTrail';

/** Resolve the pyramid the player is currently in (last-played, else the first). */
function currentPyramid(): Pyramid {
  const lastId = loadSave().lastPlayedLevelId;
  return (lastId && getPyramidOfLevel(lastId)) || PYRAMIDS[0];
}

/** Full-page world map of all pyramids. Reachable at `/map`. */
export function MapPage() {
  const navigate = useNavigate();
  const { unlocked, completed, pyramidProgress } = useProgress();

  const active = currentPyramid();
  const activeIndex = Math.max(0, PYRAMIDS.findIndex((p) => p.id === active.id));
  const lastId = loadSave().lastPlayedLevelId;
  const currentId = lastId && LEVELS.some((l) => l.id === lastId) ? lastId : undefined;

  const onSelect = useCallback((id: string) => navigate(`/play/${id}`), [navigate]);

  const backTo = currentId ?? LEVELS[0].id;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100%',
        bgcolor: 'background.default',
        overflowY: 'auto',
        overflowX: 'hidden',
        px: { xs: 2, sm: 4 },
        py: { xs: 3, sm: 5 },
      }}
    >
      <Stack sx={{ maxWidth: 1320, mx: 'auto', gap: { xs: 3, sm: 4 } }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          sx={{
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
            gap: 1.5,
          }}
        >
          <Button
            startIcon={<ArrowLeft size={18} />}
            onClick={() => navigate(`/play/${backTo}`)}
            color="inherit"
            sx={{ color: 'text.secondary', ml: -1 }}
          >
            Back to game
          </Button>
          <Stack sx={{ alignItems: { xs: 'flex-start', sm: 'flex-end' }, minWidth: 0 }}>
            <Typography
              variant="h4"
              color="primary"
              sx={{ fontSize: { xs: '1.6rem', sm: '2.125rem' }, lineHeight: 1.1 }}
            >
              The Necropolis
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {PYRAMIDS.length} tombs · choose your descent
            </Typography>
          </Stack>
        </Stack>

        <WorldTrail
          pyramids={PYRAMIDS}
          activeIndex={activeIndex}
          currentId={currentId}
          unlocked={unlocked}
          completed={completed}
          pyramidProgress={pyramidProgress}
          onSelect={onSelect}
        />
      </Stack>
    </Box>
  );
}
