import { Navigate, Route, Routes } from 'react-router-dom';
import { GamePage } from './pages/GamePage';
import { MapPage } from './pages/MapPage';
import { EditorPage } from './pages/EditorPage';
import { PlaytestPage } from './pages/PlaytestPage';

// The level is NEVER in the URL — GamePage resolves it from localStorage (the
// current objective) or from ephemeral navigation state set when picking a level
// on the map. So there is a single `/play` route with no level id.
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/play" replace />} />
      <Route path="/play" element={<GamePage />} />
      <Route path="/map" element={<MapPage />} />
      <Route path="/editor" element={<EditorPage />} />
      <Route path="/playtest" element={<PlaytestPage />} />
      <Route path="*" element={<Navigate to="/play" replace />} />
    </Routes>
  );
}
