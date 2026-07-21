import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Paper, Stack, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { ArrowLeft, Lock } from 'lucide-react';
import { PYRAMIDS, getPyramidOfLevel, type Pyramid } from '../levels/pyramids';
import { useProgress } from '../game/useProgress';
import { loadSave } from '../game/storage';
import { LEVELS } from '../levels';
import { PyramidShape } from '../components/PyramidShape';

/** Resolve the pyramid the player is currently in (last-played, else the first). */
function currentPyramid(): Pyramid {
  const lastId = loadSave().lastPlayedLevelId;
  return (lastId && getPyramidOfLevel(lastId)) || PYRAMIDS[0];
}

interface PyramidCardProps {
  pyramid: Pyramid;
  index: number;
  isCurrent: boolean;
  unlocked: ReadonlySet<string>;
  completed: ReadonlySet<string>;
  progress: { unlocked: boolean; completedCount: number; total: number };
  currentId?: string;
  onSelect: (id: string) => void;
  tileSize: number;
}

function PyramidCard({
  pyramid,
  index,
  isCurrent,
  unlocked,
  completed,
  progress,
  currentId,
  onSelect,
  tileSize,
}: PyramidCardProps) {
  const locked = !progress.unlocked;
  return (
    <Paper
      elevation={isCurrent ? 6 : 2}
      sx={{
        p: { xs: 2.5, sm: 3 },
        flex: '1 1 320px',
        maxWidth: 460,
        opacity: locked ? 0.55 : 1,
        border: isCurrent ? '2px solid #c99a1e' : '1px solid rgba(201,154,30,0.22)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
      }}
    >
      <Stack sx={{ alignItems: 'center', gap: 0.5, textAlign: 'center' }}>
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5 }}>
          Pyramid {index + 1}
        </Typography>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
          {locked && <Lock size={18} />}
          <Typography variant="h5">{pyramid.name}</Typography>
        </Stack>
        <Typography
          variant="body2"
          sx={{ color: isCurrent ? 'warning.light' : 'text.secondary', fontWeight: 700 }}
        >
          {progress.completedCount} / {progress.total}
          {isCurrent ? ' · current' : locked ? ' · locked' : ''}
        </Typography>
      </Stack>

      <PyramidShape
        pyramid={pyramid}
        currentId={currentId}
        unlocked={unlocked}
        completed={completed}
        onSelect={onSelect}
        tileSize={tileSize}
        gap={Math.round(tileSize * 0.2)}
      />
    </Paper>
  );
}

/** Full-page world map of all pyramids. Reachable at `/map`. */
export function MapPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { unlocked, completed, pyramidProgress } = useProgress();

  const active = currentPyramid();
  const lastId = loadSave().lastPlayedLevelId;
  const currentId = lastId && LEVELS.some((l) => l.id === lastId) ? lastId : undefined;

  const onSelect = useCallback((id: string) => navigate(`/play/${id}`), [navigate]);

  const backTo = currentId ?? LEVELS[0].id;
  const tileSize = isMobile ? 52 : 64;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        bgcolor: 'background.default',
        overflowY: 'auto',
        overflowX: 'hidden',
        px: { xs: 2, sm: 4 },
        py: { xs: 3, sm: 5 },
      }}
    >
      <Stack sx={{ maxWidth: 1000, mx: 'auto', gap: { xs: 3, sm: 4 } }}>
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
              Choose your tomb
            </Typography>
          </Stack>
        </Stack>

        <Stack
          direction={{ xs: 'column', md: 'row' }}
          sx={{ gap: { xs: 3, sm: 4 }, alignItems: 'stretch', justifyContent: 'center' }}
        >
          {PYRAMIDS.map((pyramid, i) => (
            <PyramidCard
              key={pyramid.id}
              pyramid={pyramid}
              index={i}
              isCurrent={pyramid.id === active.id}
              unlocked={unlocked}
              completed={completed}
              progress={pyramidProgress(pyramid)}
              currentId={currentId}
              onSelect={onSelect}
              tileSize={tileSize}
            />
          ))}
        </Stack>
      </Stack>
    </Box>
  );
}
