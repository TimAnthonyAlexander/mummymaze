import { Navigate, Route, Routes } from 'react-router-dom';
import { LEVELS, getLevel } from './levels';
import { GamePage } from './pages/GamePage';
import { MapPage } from './pages/MapPage';
import { EditorPage } from './pages/EditorPage';
import { PlaytestPage } from './pages/PlaytestPage';
import { loadSave } from './game/storage';

/** Resolve the initial route: last-played level if still valid, else level 1. */
function initialLevelId(): string {
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
