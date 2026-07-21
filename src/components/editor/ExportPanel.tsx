/**
 * Export / import. Copy or download the draft as a `LevelSpec` (empty arrays
 * omitted; `par` set to the solved length when the level is solvable), or paste
 * JSON to load it back into the editor. Parse failures are reported, not thrown.
 */
import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Clipboard, Download, Upload } from 'lucide-react';
import { fromSpec, toSpec, type EditorState } from './model';

interface ExportPanelProps {
  state: EditorState;
  par: number | null;
  solvable: boolean;
  onImport: (next: EditorState) => void;
}

export function ExportPanel({ state, par, solvable, onImport }: ExportPanelProps) {
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const buildJson = (): string => {
    const spec = toSpec(state, solvable && par !== null ? par : undefined);
    return JSON.stringify(spec, null, 2);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildJson());
      setToast('Copied JSON to clipboard');
    } catch {
      setToast('Clipboard unavailable — use Download instead');
    }
  };

  const handleDownload = () => {
    const blob = new Blob([buildJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.id.trim() || 'level'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    setImportError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(importText);
    } catch {
      setImportError('Invalid JSON — check for trailing commas or quotes.');
      return;
    }
    try {
      onImport(fromSpec(parsed));
      setToast('Level imported');
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Could not import level');
    }
  };

  return (
    <Stack spacing={1.5}>
      <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
        Export / Import
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        <Button
          onClick={handleCopy}
          variant="contained"
          color="primary"
          size="small"
          startIcon={<Clipboard size={16} />}
        >
          Copy JSON
        </Button>
        <Button
          onClick={handleDownload}
          variant="outlined"
          color="primary"
          size="small"
          startIcon={<Download size={16} />}
        >
          Download .json
        </Button>
      </Box>

      <TextField
        label="Paste JSON to import"
        value={importText}
        onChange={(e) => setImportText(e.target.value)}
        multiline
        minRows={3}
        maxRows={8}
        size="small"
        fullWidth
        error={Boolean(importError)}
        helperText={importError ?? ' '}
        slotProps={{ input: { style: { fontFamily: 'monospace', fontSize: 12 } } }}
      />
      <Box>
        <Button
          onClick={handleImport}
          variant="outlined"
          color="secondary"
          size="small"
          startIcon={<Upload size={16} />}
          disabled={!importText.trim()}
        >
          Import
        </Button>
      </Box>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={2200}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="info" onClose={() => setToast(null)} sx={{ width: '100%' }}>
          {toast}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
