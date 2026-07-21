import { IconButton, Stack, Tooltip } from '@mui/material';
import { Volume2, VolumeX, Zap, ZapOff } from 'lucide-react';
import { useSettings } from '../game/useSettings';

interface SettingsTogglesProps {
  /** Icon size; the mobile app bar uses a smaller mark. */
  iconSize?: number;
  /** `edge="end"` alignment for the last button in a toolbar. */
  compact?: boolean;
}

/**
 * Sound (mute) + animations toggles, backed by persisted settings. Self-contained
 * — each mount reads/writes the same storage, so the desktop sidebar and the
 * mobile app bar can each render one without prop threading (only one is visible
 * at a time). Lucide speaker / lightning icons flip with the setting.
 */
export function SettingsToggles({ iconSize = 20, compact = false }: SettingsTogglesProps) {
  const { sound, animations, toggleSound, toggleAnimations } = useSettings();

  return (
    <Stack direction="row" spacing={compact ? 0 : 0.5} sx={{ alignItems: 'center' }}>
      <Tooltip title={sound ? 'Mute sound effects' : 'Unmute sound effects'}>
        <IconButton
          size={compact ? 'small' : 'medium'}
          aria-label={sound ? 'Mute sound' : 'Unmute sound'}
          aria-pressed={sound}
          onClick={toggleSound}
          sx={{ color: sound ? 'text.primary' : 'text.disabled' }}
        >
          {sound ? <Volume2 size={iconSize} /> : <VolumeX size={iconSize} />}
        </IconButton>
      </Tooltip>
      <Tooltip title={animations ? 'Turn off turn animations' : 'Turn on turn animations'}>
        <IconButton
          size={compact ? 'small' : 'medium'}
          aria-label={animations ? 'Disable animations' : 'Enable animations'}
          aria-pressed={animations}
          onClick={toggleAnimations}
          sx={{ color: animations ? 'text.primary' : 'text.disabled' }}
        >
          {animations ? <Zap size={iconSize} /> : <ZapOff size={iconSize} />}
        </IconButton>
      </Tooltip>
    </Stack>
  );
}
