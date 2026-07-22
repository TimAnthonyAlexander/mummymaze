import { useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
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
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const progress = useProgress();
  const { isUnlocked, recordWin, currentLevelId } = progress;

  // The level to play is NOT in the URL. It comes from localStorage — the current
  // OBJECTIVE, derived from completed levels — by default, or from ephemeral
  // navigation state when a specific past/current level was picked on the map.
  // Capture the objective once per mount so a win (which advances the objective)
  // never swaps the board out from under the win screen; explicit navigation
  // (select / next) supplies a fresh levelId in location.state.
  const mountObjective = useRef(currentLevelId ?? LEVELS[0].id);
  const navLevelId = (location.state as { levelId?: string } | null)?.levelId;
  const activeId =
    navLevelId && getLevel(navLevelId) && isUnlocked(navLevelId)
      ? navLevelId
      : mountObjective.current;
  const level = getLevel(activeId) ?? LEVELS[0];

  const game = useAnimatedGame(level);
  const { state, render, animating, move, undo, restart, load } = game;

  const hints = useHints(state);
  const { moveArrows } = useSettings();

  // Load the engine when the active level changes (select / next).
  useEffect(() => {
    if (state.level.id !== level.id) load(level);
  }, [level, state.level.id, load]);

  // Record a win exactly once per win. The ref key ties the guard to the
  // specific level+moveCount so re-renders and animation frames can't double-fire.
  const recordedWinRef = useRef<string | null>(null);
  useEffect(() => {
    if (state.phase !== 'won' || state.level.id !== level.id) return;
    const key = `${level.id}:${state.moveCount}`;
    if (recordedWinRef.current === key) return;
    recordedWinRef.current = key;
    recordWin(level.id, state.moveCount);
  }, [level, state.phase, state.level.id, state.moveCount, recordWin]);

  // Reset the win guard when the active level changes.
  useEffect(() => {
    recordedWinRef.current = null;
  }, [level.id]);

  // Live "Enter" handler for the end-of-level screen, kept in a ref so the
  // key listener (subscribed once) always sees the current phase/level/next.
  // On WIN, Enter advances to the next level; on LOSE, Enter restarts (accepts
  // the death and retries). During normal play Enter does nothing.
  const onEnterRef = useRef<() => void>(() => {});
  useEffect(() => {
    onEnterRef.current = () => {
      if (state.phase === 'won') {
        const nxt = nextInProgression(level.id);
        if (nxt) navigate('/play', { state: { levelId: nxt } });
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
      // The chosen level rides in ephemeral navigation state, not the URL.
      navigate('/play', { state: { levelId: id } });
    },
    [navigate, isUnlocked],
  );

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
        onNext={() => next && navigate('/play', { state: { levelId: next } })}
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
        onNext={() => next && navigate('/play', { state: { levelId: next } })}
      />
    </Box>
  );
}
