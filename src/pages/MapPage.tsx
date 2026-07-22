import { type CSSProperties, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { ArrowLeft } from 'lucide-react';
import { PYRAMIDS, getPyramidOfLevel } from '../levels/pyramids';
import { useProgress } from '../game/useProgress';
import { boardTextures } from '../game/textures';
import { WorldTrail } from '../components/map/WorldTrail';

const STONE_VARS = {
  '--frame-stone': boardTextures.frameStone,
  '--tablet-stone': boardTextures.wallTop,
} as CSSProperties;

/** Full-viewport world map. Reachable at `/map`. */
export function MapPage() {
  const navigate = useNavigate();
  const { unlocked, completed, currentLevelId, pyramidProgress } = useProgress();

  // The map's single marker is the derived frontier (the current objective), and
  // the view centres on its pyramid — not on whatever was last opened.
  const currentId = currentLevelId;
  const active = (currentId && getPyramidOfLevel(currentId)) || PYRAMIDS[0];
  const activeIndex = Math.max(0, PYRAMIDS.findIndex((p) => p.id === active.id));

  // Picking a level carries it in ephemeral navigation state (not the URL); the
  // game reads state.levelId. "Back to game" clears it, so the game falls back to
  // the current objective from localStorage.
  const onSelect = useCallback(
    (id: string) => navigate('/play', { state: { levelId: id } }),
    [navigate],
  );

  return (
    <Box style={STONE_VARS} sx={{ position: 'fixed', inset: 0, overflow: 'hidden', bgcolor: '#14100a' }}>
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
        <button
          type="button"
          className="stone-btn stone-btn--sm"
          style={{ width: 'auto', pointerEvents: 'auto' }}
          onClick={() => navigate('/play')}
        >
          <ArrowLeft size={16} />
          Back to game
        </button>
        <Box
          className="stone-slab"
          sx={{
            textAlign: 'right',
            px: { xs: 1.5, sm: 2 },
            py: { xs: 0.75, sm: 1 },
            pointerEvents: 'auto',
          }}
        >
          <Typography
            variant="h4"
            sx={{
              fontSize: { xs: '1.35rem', sm: '2rem' },
              lineHeight: 1.1,
              fontWeight: 700,
              color: '#f4d774',
              letterSpacing: 0.5,
              textShadow: '0 2px 0 rgba(0,0,0,0.6)',
            }}
          >
            The Necropolis
          </Typography>
          <Typography
            variant="caption"
            sx={{ display: { xs: 'none', sm: 'block' }, color: '#c9ad74', textShadow: '0 1px 0 rgba(0,0,0,0.5)' }}
          >
            {PYRAMIDS.length} tombs · drag to explore
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
