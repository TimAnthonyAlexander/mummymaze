import { defineConfig } from 'vite';

// Standalone dev server for the sprite generator. Pinned to 5181 (the game dev
// server owns 5180); strictPort so it fails loudly rather than drifting to a
// random port.
export default defineConfig({
  server: { port: 5181, strictPort: true },
  preview: { port: 5181, strictPort: true },
  // Keep three un-minified-friendly and source-mapped while iterating.
  build: { sourcemap: true, target: 'es2022' },
});
