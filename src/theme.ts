import { createTheme } from '@mui/material/styles';

/**
 * Warm desert-tomb palette. One dominant gold, a single cool accent for
 * contrast, and warm neutrals. Solid colors only — no gradient washes,
 * glassmorphism, or decorative accents. Original artwork throughout.
 */
export const theme = createTheme({
  palette: {
    mode: 'dark',
    // Dominant: sandy gold.
    primary: { main: '#c99a1e', contrastText: '#1c1710' },
    // Single accent: a muted lapis blue that reads against the warm field.
    secondary: { main: '#2f6db3' },
    background: { default: '#1c1710', paper: '#2a2216' },
    // Functional signals, tuned warm to sit inside the palette.
    error: { main: '#d64545' },
    success: { main: '#3aa06a' },
    warning: { main: '#c56a2c' },
    divider: 'rgba(201, 154, 30, 0.18)',
    text: { primary: '#f0e6cf', secondary: '#b6a985' },
  },
  // One typeface, two weights: 700 for headings, 400 for body.
  typography: {
    fontFamily: '"Trebuchet MS", "Segoe UI", system-ui, sans-serif',
    fontWeightRegular: 400,
    fontWeightBold: 700,
    h4: { fontWeight: 700, letterSpacing: 0.5 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    button: { fontWeight: 700 },
  },
  shape: { borderRadius: 10 },
  components: {
    // Flat surfaces: strip MUI's dark-mode elevation gradient overlay.
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { textTransform: 'none', borderRadius: 8 },
      },
    },
  },
});
