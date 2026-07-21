import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
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

/** Full-viewport world map. Reachable at `/map`. */
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
    <Box sx={{ position: 'fixed', inset: 0, overflow: 'hidden', bgcolor: '#14100a' }}>
      <WorldTrail
        pyramids={PYRAMIDS}
        activeIndex={activeIndex}
        currentId={currentId}
        unlocked={unlocked}
        completed={completed}
        pyramidProgress={pyramidProgress}
        onSelect={onSelect}
      />

      {/* Overlay chrome: solid stone tabs above the map; only they catch input. */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 1,
          px: { xs: 1.5, sm: 2.5 },
          py: { xs: 1, sm: 1.5 },
          pointerEvents: 'none',
        }}
      >
        <Button
          startIcon={<ArrowLeft size={18} />}
          onClick={() => navigate(`/play/${backTo}`)}
          color="inherit"
          sx={{
            pointerEvents: 'auto',
            color: 'text.primary',
            bgcolor: 'rgba(16,11,6,0.88)',
            border: '1px solid rgba(201,154,30,0.28)',
            '&:hover': { bgcolor: 'rgba(30,22,12,0.95)' },
          }}
        >
          Back to game
        </Button>
        <Box
          sx={{
            textAlign: 'right',
            px: { xs: 1.25, sm: 1.75 },
            py: { xs: 0.5, sm: 0.75 },
            borderRadius: 1.5,
            bgcolor: 'rgba(16,11,6,0.88)',
            border: '1px solid rgba(201,154,30,0.28)',
          }}
        >
          <Typography
            variant="h4"
            color="primary"
            sx={{ fontSize: { xs: '1.35rem', sm: '2rem' }, lineHeight: 1.1 }}
          >
            The Necropolis
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
            {PYRAMIDS.length} tombs · drag to explore
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
