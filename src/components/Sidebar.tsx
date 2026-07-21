import { Divider, Paper, Stack } from '@mui/material';
import type { Action, GameState, Level } from '../engine';
import { Controls } from './Controls';
import { AppTitle } from './AppTitle';
import { LevelList } from './LevelList';
import { StatusPanel } from './StatusPanel';
import { SidebarFooter } from './SidebarFooter';

interface SidebarProps {
  levels: readonly Level[];
  currentId: string;
  state: GameState;
  canUndo: boolean;
  animating: boolean;
  unlocked: ReadonlySet<string>;
  completed: ReadonlySet<string>;
  bestMoves: Record<string, number>;
  onSelectLevel: (id: string) => void;
  onResetProgress: () => void;
  onMove: (action: Action) => void;
  onUndo: () => void;
  onRestart: () => void;
}

export function Sidebar({
  levels,
  currentId,
  state,
  canUndo,
  animating,
  unlocked,
  completed,
  bestMoves,
  onSelectLevel,
  onResetProgress,
  onMove,
  onUndo,
  onRestart,
}: SidebarProps) {
  return (
    <Paper
      square
      elevation={4}
      sx={{
        width: 'clamp(200px, 16vw, 320px)',
        flexShrink: 0,
        height: '100%',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid rgba(201,154,30,0.25)',
      }}
    >
      <Stack spacing={2} sx={{ p: 2, flexGrow: 1 }}>
        <AppTitle />

        <Divider />

        <LevelList
          levels={levels}
          currentId={currentId}
          unlocked={unlocked}
          completed={completed}
          bestMoves={bestMoves}
          onSelectLevel={onSelectLevel}
        />

        <Divider />

        <StatusPanel state={state} animating={animating} />

        <Divider />

        <Controls
          onMove={onMove}
          onUndo={onUndo}
          onRestart={onRestart}
          canUndo={canUndo}
          disabled={animating || state.phase !== 'player'}
        />

        <SidebarFooter onResetProgress={onResetProgress} />
      </Stack>
    </Paper>
  );
}
