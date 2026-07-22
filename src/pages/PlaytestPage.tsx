/**
 * Playtest view for the editor. Loads the draft stashed in sessionStorage into
 * the REAL game engine + animation loop so the author can play their level
 * before exporting. Read-only over the engine; no persistence of progress.
 */
import { useEffect, useMemo } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Box, Button, Link, Paper, Stack, Typography } from '@mui/material';
import { ArrowLeft, Home } from 'lucide-react';
import { loadLevel, type Action, type Level } from '../engine';
import { useAnimatedGame } from '../game/useAnimatedGame';
import { useSettings } from '../game/useSettings';
import { BoardPane } from '../components/BoardPane';
import { Controls } from '../components/Controls';

const PLAYTEST_KEY = 'maze-editor-playtest';

const KEY_MAP: Record<string, Action> = {
  ArrowUp: 'N',
  ArrowDown: 'S',
  ArrowLeft: 'W',
  ArrowRight: 'E',
  w: 'N',
  s: 'S',
  a: 'W',
  d: 'E',
  ' ': 'wait',
  '.': 'wait',
};

/** Read + validate the stashed draft. Returns null with a reason on failure. */
function loadPlaytestLevel(): { level: Level | null; error: string | null } {
  const raw = sessionStorage.getItem(PLAYTEST_KEY);
  if (!raw) return { level: null, error: 'No level to play. Design one in the editor first.' };
  try {
    return { level: loadLevel(JSON.parse(raw)), error: null };
  } catch (err) {
    return { level: null, error: err instanceof Error ? err.message : 'Invalid level' };
  }
}

export function PlaytestPage() {
  const navigate = useNavigate();
  const { level, error } = useMemo(loadPlaytestLevel, []);

  return level ? (
    <PlaytestGame level={level} />
  ) : (
    <Stack spacing={2} sx={{ alignItems: 'center', mt: 10 }}>
      <Typography variant="h5">Cannot playtest</Typography>
      <Typography color="text.secondary">{error}</Typography>
      <Button startIcon={<Home />} onClick={() => navigate('/editor')}>
        Back to editor
      </Button>
    </Stack>
  );
}

function PlaytestGame({ level }: { level: Level }) {
  const game = useAnimatedGame(level);
  const { state, render, animating, move, undo, restart } = game;
  const { moveArrows } = useSettings();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (key === 'u') {
        e.preventDefault();
        undo();
        return;
      }
      if (key === 'r') {
        e.preventDefault();
        restart();
        return;
      }
      const action = KEY_MAP[key];
      if (action) {
        e.preventDefault();
        move(action);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [move, undo, restart]);

  return (
    <Box sx={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <Paper
        square
        elevation={4}
        sx={{
          width: 'clamp(200px, 16vw, 300px)',
          flexShrink: 0,
          height: '100%',
          overflowY: 'auto',
          borderRight: '1px solid rgba(201,154,30,0.25)',
        }}
      >
        <Stack spacing={2} sx={{ p: 2, height: '100%' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Playtest
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {state.level.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Moves: {state.moveCount}
            {state.level.par !== undefined ? ` · par ${state.level.par}` : ''}
          </Typography>
          <Controls
            onMove={move}
            onUndo={undo}
            onRestart={restart}
            canUndo={game.canUndo}
            disabled={animating || state.phase !== 'player'}
          />
          <Box sx={{ mt: 'auto' }}>
            <Link component={RouterLink} to="/editor" color="secondary" underline="hover">
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                <ArrowLeft size={16} />
                <span>Back to editor</span>
              </Stack>
            </Link>
          </Box>
        </Stack>
      </Paper>
      <BoardPane
        state={state}
        render={render}
        animating={animating}
        hasNext={false}
        moveArrows={moveArrows}
        onMove={move}
        onRestart={restart}
        onNext={() => undefined}
      />
    </Box>
  );
}
