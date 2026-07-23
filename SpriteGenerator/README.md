# Maze Escape — Mummy Sprite Generator

Standalone tool that procedurally generates the game's mummy sprites as **baked
sprite sheets** from a **parametric 3D model** (three.js). No coupling to the
game in either direction — this folder imports nothing from `../src` and the game
imports nothing from here. Integration happens later, once the sheets are signed
off.

## Approach

- The mummy is a rig of three.js primitives (capsules, a squashed sphere, tori
  for bandage bands) in a joint hierarchy — **never 2D art**.
- Every proportion is a plain number in `src/mummyParams.ts`. Tune by editing
  numbers; the dev page hot-reloads.
- One **fixed** orthographic camera matches the game's faked bird's-eye board
  view (near-overhead, tilted ~20° toward South). The camera never moves;
  **facing is a Y-rotation of the model's root**. Camera/light live in
  `src/sceneParams.ts` and are exposed as live sliders so the exact angle can be
  dialled in, then frozen.
- Baking renders each of **8 facings × each frame of each clip** at 4× (256px),
  downscales to 64px with a light sharpen, and packs a transparent sheet +
  `mummy.meta.json`.

## Commands

```bash
npm install
npm run dev      # http://localhost:5181 — preview + controls + live sheet + Export
npm run bake     # headless export to ./out (needs Playwright, see below)
npm run typecheck
```

`npm run dev` gives you: the fixed-camera preview, a free-orbit debug view, white/red
+ clip + frame + facing controls, live camera/light sliders, a live contact sheet,
and an **Export** button that downloads `mummy_white.png`, `mummy_red.png`,
`mummy.meta.json`.

### Headless bake (optional)

`npm run bake` uses Playwright. It's intentionally not a hard dependency:

```bash
npm i -D playwright && npx playwright install chromium
npm run bake     # writes ./out/mummy_white.png, mummy_red.png, mummy.meta.json
```

If Playwright isn't installed, use the in-browser **Export** button instead.

## Files

| File | Role |
|------|------|
| `src/mummyParams.ts` | every body proportion (numbers only) |
| `src/sceneParams.ts` | fixed camera + lights + facing table |
| `src/textures.ts` | procedural bandage texture (white/red palette swap) |
| `src/buildMummy.ts` | the parametric primitive rig |
| `src/pose.ts` | `applyPose(clip, t)` — idle + walk |
| `src/clips.ts` | clip frame counts / fps |
| `src/stage.ts` | shared camera + light builders |
| `src/capture.ts` | bake facings×frames → packed sheet + meta |
| `src/main.ts` | dev page (preview, controls, sheet, export) |
| `scripts/bake.mjs` | headless export |

## Sheet layout / metadata

`mummy.meta.json` describes the sheet: `frameW`/`frameH` (64), `facings` order
`[N,NE,E,SE,S,SW,W,NW]`, and `clips[]` each with `frames`, `fps`, and the `row`
where its 8-facing block starts. Columns are animation frames; each clip owns a
block of 8 rows (one per facing).
