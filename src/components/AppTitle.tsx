import { Stack, Typography } from '@mui/material';
import { Ghost } from 'lucide-react';

interface AppTitleProps {
  iconSize?: number;
  variant?: 'h6' | 'subtitle1';
}

/** The Ghost mark + "Maze Escape" wordmark, shared across shells. */
export function AppTitle({ iconSize = 26, variant = 'h6' }: AppTitleProps) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
      <Ghost size={iconSize} color="#c99a1e" style={{ flexShrink: 0 }} />
      <Typography variant={variant} sx={{ fontWeight: 700, minWidth: 0 }} noWrap>
        Maze Escape
      </Typography>
    </Stack>
  );
}
