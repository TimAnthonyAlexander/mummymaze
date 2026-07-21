/**
 * Web-based level editor. Design a level visually and export the exact JSON the
 * game imports. All engine calls are read-only: `loadLevel` validates the draft,
 * `solve` / `scoreDifficulty` drive the live feedback panel.
 */
import { useCallback, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Divider,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { ArrowLeft, Play, RotateCcw } from 'lucide-react';
import type { Dir, MonsterKind } from '../engine';
import {
  applyCellTool,
  applyEdgeTool,
  clampDim,
  EDGE_TOOLS,
  emptyState,
  resize,
  setField,
  toSpec,
  type EditorState,
  type Tool,
} from '../components/editor/model';
import { EditorGrid } from '../components/editor/EditorGrid';
import { ToolPalette } from '../components/editor/ToolPalette';
import { ValidationPanel } from '../components/editor/ValidationPanel';
import { ExportPanel } from '../components/editor/ExportPanel';
import { useLevelAnalysis } from '../components/editor/useLevelAnalysis';

const PLAYTEST_KEY = 'maze-editor-playtest';

export function EditorPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<EditorState>(() => emptyState());
  const [tool, setTool] = useState<Tool>('wall');
  const [monsterKind, setMonsterKind] = useState<MonsterKind>('mummy_white');

  const analysis = useLevelAnalysis(state);

  const handleCell = useCallback(
    (x: number, y: number) => {
      if (EDGE_TOOLS.has(tool)) return; // edge tools ignore cell-body clicks
      setState((s) => applyCellTool(s, tool, x, y, monsterKind));
    },
    [tool, monsterKind],
  );

  const handleEdge = useCallback(
    (x: number, y: number, dir: Dir) => {
      setState((s) => applyEdgeTool(s, tool, x, y, dir));
    },
    [tool],
  );

  const handleDim = (key: 'width' | 'height', raw: string) => {
    const n = clampDim(Number(raw));
    setState((s) => resize(s, key === 'width' ? n : s.width, key === 'height' ? n : s.height));
  };

  const handlePlaytest = () => {
    if (analysis.error) return;
    const spec = toSpec(state, analysis.par ?? undefined);
    sessionStorage.setItem(PLAYTEST_KEY, JSON.stringify(spec));
    navigate('/playtest');
  };

  const handleReset = () => {
    if (window.confirm('Clear the current level and start over?')) {
      setState(emptyState());
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Header */}
      <Paper
        square
        elevation={2}
        sx={{
          px: 3,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(201,154,30,0.25)',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Maze Escape · Level Editor
        </Typography>
        <Link component={RouterLink} to="/" color="secondary" underline="hover">
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            <ArrowLeft size={16} />
            <span>Back to game</span>
          </Stack>
        </Link>
      </Paper>

      {/* Body */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 3, p: 3 }}>
        {/* Controls column */}
        <Stack spacing={2.5} sx={{ width: 380, flexShrink: 0 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={2}>
              <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
                Level
              </Typography>
              <TextField
                label="Name"
                value={state.name}
                onChange={(e) => setState((s) => setField(s, 'name', e.target.value))}
                size="small"
                fullWidth
              />
              <TextField
                label="ID"
                value={state.id}
                onChange={(e) => setState((s) => setField(s, 'id', e.target.value))}
                size="small"
                fullWidth
              />
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Width"
                  type="number"
                  value={state.width}
                  onChange={(e) => handleDim('width', e.target.value)}
                  size="small"
                  slotProps={{ htmlInput: { min: 3, max: 12 } }}
                  fullWidth
                />
                <TextField
                  label="Height"
                  type="number"
                  value={state.height}
                  onChange={(e) => handleDim('height', e.target.value)}
                  size="small"
                  slotProps={{ htmlInput: { min: 3, max: 12 } }}
                  fullWidth
                />
              </Stack>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2 }}>
            <ToolPalette
              tool={tool}
              monsterKind={monsterKind}
              onTool={setTool}
              onMonsterKind={setMonsterKind}
            />
          </Paper>

          <ExportPanel
            state={state}
            par={analysis.par}
            solvable={analysis.solvable}
            onImport={setState}
          />
        </Stack>

        {/* Grid + feedback column */}
        <Stack spacing={2} sx={{ flex: 1, minWidth: 320, alignItems: 'flex-start' }}>
          <Stack direction="row" spacing={1}>
            <Button
              onClick={handlePlaytest}
              variant="contained"
              color="success"
              size="small"
              startIcon={<Play size={16} />}
              disabled={Boolean(analysis.error)}
            >
              Playtest
            </Button>
            <Button
              onClick={handleReset}
              variant="outlined"
              color="warning"
              size="small"
              startIcon={<RotateCcw size={16} />}
            >
              New / clear
            </Button>
          </Stack>

          <Box sx={{ maxWidth: '100%', overflow: 'auto' }}>
            <EditorGrid state={state} tool={tool} onCell={handleCell} onEdge={handleEdge} />
          </Box>

          <Typography variant="caption" color="text.secondary">
            Click a cell to place the active tool. Click a cell edge to add a wall,
            gate, or exit. The exit must sit on the outer border.
          </Typography>

          <Divider flexItem />

          <Box sx={{ width: '100%', maxWidth: 460 }}>
            <ValidationPanel analysis={analysis} />
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}
