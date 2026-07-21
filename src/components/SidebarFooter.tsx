import { Box, Button, Divider, Link } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { Pencil } from 'lucide-react';

interface SidebarFooterProps {
  onResetProgress: () => void;
  /** Fired after a confirmed reset; lets the mobile drawer close itself. */
  onAfterReset?: () => void;
}

/** Level-editor link + "Reset progress" action, shared by sidebar and drawer. */
export function SidebarFooter({ onResetProgress, onAfterReset }: SidebarFooterProps) {
  const handleReset = () => {
    if (window.confirm('Reset all progress? This unlocks nothing and clears your best moves.')) {
      onResetProgress();
      onAfterReset?.();
    }
  };

  return (
    <Box sx={{ mt: 'auto', pt: 1 }}>
      <Divider sx={{ mb: 1 }} />
      <Link
        component={RouterLink}
        to="/editor"
        color="secondary"
        underline="hover"
        sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: 12, mb: 0.5 }}
      >
        <Pencil size={13} />
        Level editor
      </Link>
      <Button
        fullWidth
        size="small"
        color="inherit"
        onClick={handleReset}
        sx={{
          color: 'text.secondary',
          fontSize: 12,
          textTransform: 'none',
          '&:hover': { color: 'error.main' },
        }}
      >
        Reset progress
      </Button>
    </Box>
  );
}
