import { Navigate, Route, Routes } from 'react-router-dom';
import { LEVELS, getLevel } from './levels';
import { progressionOrder } from './levels/pyramids';
import { GamePage } from './pages/GamePage';
import { MapPage } from './pages/MapPage';
import { EditorPage } from './pages/EditorPage';
import { PlaytestPage } from './pages/PlaytestPage';
import { loadSave } from './game/storage';

/**
 * Resolve the initial route to the CURRENT OBJECTIVE — the first not-yet-cleared
 * level in progression order (the same frontier the world map marks) — so opening
 * the game always drops you where you actually are. Falls back to the last-played
 * level, then level 1 (e.g. once the whole pack is cleared).
 */
function initialLevelId(): string {
  const completed = new Set(loadSave().completedLevelIds);
  const frontier = progressionOrder().find((id) => !completed.has(id));
  if (frontier) return frontier;
  const lastId = loadSave().lastPlayedLevelId;
  if (lastId && getLevel(lastId)) return lastId;
  return LEVELS[0].id;
}

export default function App() {
  const startId = initialLevelId();
  return (
    <Routes>
      <Route path="/" element={<Navigate to={`/play/${startId}`} replace />} />
      <Route path="/play/:levelId" element={<GamePage />} />
      <Route path="/map" element={<MapPage />} />
      <Route path="/editor" element={<EditorPage />} />
      <Route path="/playtest" element={<PlaytestPage />} />
      <Route path="*" element={<Navigate to={`/play/${LEVELS[0].id}`} replace />} />
    </Routes>
  );
}
