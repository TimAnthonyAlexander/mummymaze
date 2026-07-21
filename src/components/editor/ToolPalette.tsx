/**
 * Tool selector. Each tool is a labelled Lucide button; the Monster tool reveals
 * a sub-selector for the four monster kinds.
 */
import { Box, Button, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import {
  BrickWall,
  DoorClosed,
  Eraser,
  Key,
  LogOut,
  MapPin,
  Skull,
  type LucideIcon,
} from 'lucide-react';
import type { MonsterKind } from '../../engine';
import { MONSTER_KINDS, type Tool } from './model';
import { MonsterSprite } from '../sprites/CharacterSprites';

const TOOLS: readonly { tool: Tool; label: string; Icon: LucideIcon }[] = [
  { tool: 'start', label: 'Start', Icon: MapPin },
  { tool: 'exit', label: 'Exit', Icon: LogOut },
  { tool: 'wall', label: 'Wall', Icon: BrickWall },
  { tool: 'gate', label: 'Gate', Icon: DoorClosed },
  { tool: 'key', label: 'Key', Icon: Key },
  { tool: 'trap', label: 'Trap', Icon: Skull },
];

const KIND_LABEL: Record<MonsterKind, string> = {
  mummy_white: 'Mummy (W)',
  mummy_red: 'Mummy (R)',
  scorpion_white: 'Scorpion (W)',
  scorpion_red: 'Scorpion (R)',
};

interface ToolPaletteProps {
  tool: Tool;
  monsterKind: MonsterKind;
  onTool: (tool: Tool) => void;
  onMonsterKind: (kind: MonsterKind) => void;
}

export function ToolPalette({ tool, monsterKind, onTool, onMonsterKind }: ToolPaletteProps) {
  const toolBtn = (t: Tool, label: string, icon: React.ReactNode) => (
    <Button
      key={t}
      onClick={() => onTool(t)}
      variant={tool === t ? 'contained' : 'outlined'}
      color={tool === t ? 'primary' : 'inherit'}
      startIcon={icon}
      size="small"
      sx={{ justifyContent: 'flex-start', minWidth: 116 }}
    >
      {label}
    </Button>
  );

  return (
    <Stack spacing={1.5}>
      <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
        Tools
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {TOOLS.map((t) => toolBtn(t.tool, t.label, <t.Icon size={16} />))}
        {toolBtn('monster', 'Monster', <Skull size={16} />)}
        {toolBtn('eraser', 'Eraser', <Eraser size={16} />)}
      </Box>

      {tool === 'monster' && (
        <Box>
          <Typography variant="caption" color="text.secondary">
            Monster kind
          </Typography>
          <ToggleButtonGroup
            value={monsterKind}
            exclusive
            size="small"
            onChange={(_, v: MonsterKind | null) => v && onMonsterKind(v)}
            sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}
          >
            {MONSTER_KINDS.map((kind) => (
              <ToggleButton
                key={kind}
                value={kind}
                sx={{ gap: 0.5, textTransform: 'none', border: '1px solid rgba(201,154,30,0.4) !important', borderRadius: '8px !important' }}
              >
                <MonsterSprite kind={kind} size={20} />
                {KIND_LABEL[kind]}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
      )}
    </Stack>
  );
}
