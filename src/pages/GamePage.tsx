import { useCallback, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Button, Stack, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Home } from 'lucide-react';
import type { Action } from '../engine';
import { LEVELS, getLevel } from '../levels';
import { PYRAMIDS, getPyramidOfLevel, nextInProgression } from '../levels/pyramids';
import { useAnimatedGame } from '../game/useAnimatedGame';
import { useProgress } from '../game/useProgress';
import { useHints } from '../game/useHints';
import { useSettings } from '../game/useSettings';
import { Sidebar } from '../components/Sidebar';
import { BoardPane } from '../components/BoardPane';
import { MobileShell } from '../components/MobileShell';

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

export function GamePage() {
  const { levelId = '' } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const level = getLevel(levelId);

  // Hooks must run unconditionally; guard the render below.
  const game = useAnimatedGame(level ?? LEVELS[0]);
  const { state, render, animating, move, undo, restart, load } = game;

  const progress = useProgress();
  const { isUnlocked, recordWin, setLastPlayed } = progress;

  const hints = useHints(state);
  const { moveArrows } = useSettings();

  // Reload engine when the route's level changes.
  useEffect(() => {
    if (level && state.level.id !== level.id) load(level);
  }, [level, state.level.id, load]);

  // Remember the last-played level whenever a (valid) level loads.
  useEffect(() => {
    if (level) setLastPlayed(level.id);
  }, [level, setLastPlayed]);

  // Record a win exactly once per win. The ref key ties the guard to the
  // specific level+moveCount so re-renders and animation frames can't double-fire.
  const recordedWinRef = useRef<string | null>(null);
  useEffect(() => {
    if (!level) return;
    if (state.phase !== 'won' || state.level.id !== level.id) return;
    const key = `${level.id}:${state.moveCount}`;
    if (recordedWinRef.current === key) return;
    recordedWinRef.current = key;
    recordWin(level.id, state.moveCount);
  }, [level, state.phase, state.level.id, state.moveCount, recordWin]);

  // Reset the win guard when navigating to a different level.
  useEffect(() => {
    recordedWinRef.current = null;
  }, [level?.id]);

  // Live "Enter" handler for the end-of-level screen, kept in a ref so the
  // key listener (subscribed once) always sees the current phase/level/next.
  // On WIN, Enter advances to the next level; on LOSE, Enter restarts (accepts
  // the death and retries). During normal play Enter does nothing.
  const onEnterRef = useRef<() => void>(() => {});
  useEffect(() => {
    onEnterRef.current = () => {
      if (!level) return;
      if (state.phase === 'won') {
        const nxt = nextInProgression(level.id);
        if (nxt) navigate(`/play/${nxt}`);
      } else if (state.phase === 'lost') {
        restart();
      }
    };
  });

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
      if (key === 'Enter') {
        e.preventDefault();
        onEnterRef.current(); // win -> next level; loss -> restart
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

  const selectLevel = useCallback(
    (id: string) => {
      if (!isUnlocked(id)) return; // locked levels are non-navigable
      navigate(`/play/${id}`);
    },
    [navigate, isUnlocked],
  );

  if (!level) {
    return (
      <Stack spacing={2} sx={{ alignItems: 'center', mt: 8 }}>
        <Typography variant="h5">Unknown level: {levelId}</Typography>
        <Button startIcon={<Home />} onClick={() => navigate(`/play/${LEVELS[0].id}`)}>
          Go to first level
        </Button>
      </Stack>
    );
  }

  const next = nextInProgression(level.id);
  const pyramid = getPyramidOfLevel(level.id) ?? PYRAMIDS[0];
  const pyramidProgress = progress.pyramidProgress(pyramid);
  const openMap = () => navigate('/map');

  if (isMobile) {
    return (
      <MobileShell
        pyramid={pyramid}
        pyramidProgress={pyramidProgress}
        currentId={level.id}
        state={state}
        render={render}
        canUndo={game.canUndo}
        animating={animating}
        unlocked={progress.unlocked}
        completed={progress.completed}
        hasNext={Boolean(next)}
        hintDir={hints.hintDir}
        hintUsed={hints.hintUsed}
        solution={hints.solution}
        unsolvable={hints.unsolvable}
        onSelectLevel={selectLevel}
        onResetProgress={progress.resetProgress}
        onOpenMap={openMap}
        onMove={move}
        onUndo={undo}
        onRestart={restart}
        onNext={() => next && navigate(`/play/${next}`)}
        onHint={hints.requestHint}
        onShowSolution={hints.showSolution}
      />
    );
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <Sidebar
        pyramid={pyramid}
        pyramidProgress={pyramidProgress}
        currentId={level.id}
        state={state}
        canUndo={game.canUndo}
        animating={animating}
        unlocked={progress.unlocked}
        completed={progress.completed}
        hintDir={hints.hintDir}
        hintUsed={hints.hintUsed}
        solution={hints.solution}
        unsolvable={hints.unsolvable}
        onSelectLevel={selectLevel}
        onResetProgress={progress.resetProgress}
        onOpenMap={openMap}
        onMove={move}
        onUndo={undo}
        onRestart={restart}
        onHint={hints.requestHint}
        onShowSolution={hints.showSolution}
      />
      <BoardPane
        state={state}
        render={render}
        animating={animating}
        hasNext={Boolean(next)}
        moveArrows={moveArrows}
        onMove={move}
        onRestart={restart}
        onNext={() => next && navigate(`/play/${next}`)}
      />
    </Box>
  );
}
