# CLAUDE.md — Maze Escape

Working guide for this repo. Read it before making changes.

## What this is

**Maze Escape** is a turn-based grid pursuit-maze puzzle (a clean-room take on the
"mummy maze" genre) built as a browser SPA. An explorer must reach the maze exit
while deterministic monsters hunt them. Monsters are fast but perfectly
predictable; you win by out-thinking their greedy pathing, not out-running them.

**Clean-room / legal:** original, from-scratch reimplementation of the *genre's
mechanics* for personal use. All code and assets are original — hand-drawn SVG
sprites, Web-Audio-synthesized sound, generated/hand-authored levels. Game rules
aren't copyrightable; only specific expression is. Do **not** introduce any real
game's name, art, audio, level data, or branding. Keep it original.

## Stack & commands

- Node 22, Vite 8, React 19, TypeScript ~6, MUI v9 (+ emotion), lucide-react,
  react-router 7, Vitest 4. Package manager: npm.
- `npm run dev` — Vite dev server, **pinned to port 5180** (`strictPort` in
  `vite.config.ts`; the user wants non-8080/8081 ports). Run it detached in a
  `screen` named `mazedev`:
  `screen -dmS mazedev bash -c 'npm run dev > <scratch>/vite.log 2>&1'`
  (Not currently running — start it when you need the app.)
- `npm run build` — `tsc -b && vite build`. `npx tsc -b` alone to typecheck.
- `npm test` — Vitest (currently ~132 tests, runs in a few seconds; keep it fast).
- `npm run lint` — oxlint.
- Level generator (build-time only, see below):
  `node scripts/generate-levels.mjs generate` (rebuild pack) /
  `node scripts/generate-levels.mjs extend <N>` (append N solver-verified levels).

## Architecture

Three layers, cleanly separated.

**1. Pure engine — `src/engine/` (no React, no DOM, immutable):**
- `types.ts` — `Level`, `GameState`, `Action` (`'N'|'E'|'S'|'W'|'wait'`), `Dir`,
  `Monster`, `MonsterKind`, `Cell`, `Gate`, etc.
- `board.ts` — geometry, `canCross` (walls + gates + bounds).
- `monsters.ts` — the pursuit AI + `stepsPerTurn`.
- `step.ts` — `initGame`, `step(state, action)` (the single transition; pure),
  and `stepWithTrace` which also returns an ordered TRACE of single-tile events
  (move/gate/kill/exit) used to animate a turn one hop at a time. Each `move`
  event carries a `round` (player hop = 0; a monster's s-th sub-step = s+1) so
  the UI can play a whole round at once — monsters step SIMULTANEOUSLY — while
  the engine still RESOLVES them sequentially (order decides collisions).
- `solver.ts` — `solve(level, opts?)` and `solveFrom(state, opts?)`: exact BFS
  over player actions (monsters are deterministic, so it's single-agent
  shortest-path, NOT minimax). `opts.cap` bounds the state search;
  `opts.forbidCollisions` finds a win that never merges monsters.
- `difficulty.ts` — `scoreDifficulty(level, cap?)`.
- `generator.ts` — `generateLevel`/`generateLevelDetailed` + the curriculum
  quality helpers (`beelineTest`, `nearestMonsterDistance`, `monsterOnBeeline`,
  `curriculumCheck`).
- `level.ts` — `loadLevel(spec)`: validates + expands the compact `LevelSpec`
  authoring JSON; fails fast on bad data.
- `index.ts` — the public surface. Import engine things from `../engine`, not
  internal files.

**2. Game/React glue — `src/game/`:**
- `useAnimatedGame.ts` — the game hook. Keeps committed engine state
  authoritative and plays each turn's trace on a `setTimeout` timeline (sprites
  hop one tile at a time; win walks the player out the exit). `buildFrames`
  BATCHES the trace by `round` so all monsters step at the same tick (via one
  `setRender` + the CSS transform transition), not one-after-another. Holds undo
  history. Tracks the explorer's facing (last move dir) into `playerFacing`.
  Triggers sound at trace events; honors the animations setting (snap when off).
- `render.ts` — `RenderState` + `toRender` (what `Board` draws, decoupled from
  `GameState`). Includes `playerFacing: Dir` (defaults south) for sprite facing.
- `sound.ts` — sample-based SFX. Short **CC0 (Kenney, public domain)** clips in
  `src/assets/audio/*.mp3` (provenance in `src/assets/audio/CREDITS.md`), fetched +
  `decodeAudioData`'d once into `AudioBuffer`s and fired via `BufferSource` + gain;
  same event API (`sfx.step/monster/key/merge/win/lose/hint/blockedWait`). Was
  procedural synths (read as "8-bit") until the 2002 pass. **See Safari gotcha
  below** — the one-time gesture unlock now also warms/decodes every sample.
  Spawn-intro extras (both samples now): `sfx.scare` (the enemies' roar on the
  head-turn) is a Mixkit Free-License clip (`scare.mp3`); `sfx.rumble` (the
  stone-drag on the rise) is `rumble.mp3` — user-supplied, licence UNVERIFIED (not
  confirmed CC0; swap before distributing). These are the only non-Kenney/non-CC0
  clips — see CREDITS.md.
- `storage.ts` — safe localStorage wrapper, key `maze-escape:v1`; degrades to
  in-memory, never throws. **The `completedLevelIds` set is the SINGLE source of
  truth for progression** — there is deliberately no stored `unlockedLevelIds`
  (removed): storing derived unlock state let it desync from the pyramid order
  after a reorder (phantom frontiers/helmets). Only `completedLevelIds`,
  `bestMoves`, `lastPlayedLevelId` (vestigial), and `settings` persist.
- `useProgress.ts` — DERIVES everything from the completed set + pyramid order,
  never stores unlock state. The current **objective** = the level right AFTER
  the FURTHEST completed one (`currentObjectiveId` in `pyramids.ts`), NOT the
  first uncompleted — so an early skipped level (holes appear when the pack is
  reordered mid-save) never drags you back to the start. `unlocked` = every level
  up to & including the objective (completed levels replay, skipped ones stay
  playable, the objective is the single frontier). `currentLevelId` = that
  objective; the map marks it with one explorer head.
- `useHints.ts` — on-demand `solveFrom` for the one-hint-per-level + full-solution
  reveal.
- `useSettings.ts` — sound/animations toggles.

**3. UI — `src/components/`, `src/pages/`:**
- `pages/GamePage.tsx` — the shell. Branches on `useMediaQuery(down('md'))`:
  desktop = `Sidebar` + `BoardPane`; mobile = `MobileShell`. Owns keyboard input.
  **The level is NOT in the URL** — GamePage resolves it from (a) ephemeral
  `location.state.levelId` (set when you pick a level on the map / "next"), else
  (b) the objective from localStorage. The objective is captured once per mount
  (a ref) so winning — which advances the objective — never swaps the board out
  from under the win screen. `currentId` passed to the sidebar is the level you're
  PLAYING (so the sidebar's explorer head = "you are here", even on a replay);
  the MAP's marker is the objective.
- `components/Board.tsx` (+ `Board.css`) — the square board, sprites, walls,
  gates, exit opening. The grid stays a flat perfect square; depth is FAKED
  (light source top-left). Walls are extruded slabs computed by
  `computeWallSegments` + `wallStyle`, drawn in TWO PLANES: a transparent
  `.wall-shadow` (a stacked down-right `box-shadow` from `extrudeShadow` = the
  side faces + cast shadow) under a solid `.wall-top`, so connected walls merge
  (a top always covers a neighbour's shadow) and only the outer silhouette
  extrudes. Gates reuse the same two-plane classes (so they merge in 3D) but the
  top is a barred `gate-top` portcullis. **Do not casually edit `Board.css`
  sprite/wall/gate/exit rules.** PERF: the board is split into memoized layers
  (`BoardFloor` = the textured cells + decals, `BoardStaticOverlay` = AO/grain/exit,
  `BoardWalls` = walls+gates keyed on `gatesOpen`) so a turn animation re-renders
  ONLY the sprites, not the ~144 textured cells + walls each hop. Keep new static
  board chrome inside a memoized layer, not the per-hop `Board` body.
- `components/sprites/CharacterSprites.tsx` — hand-drawn inline-SVG mummy /
  explorer / scorpion, cel-shaded, styled after the pre-rendered PNGs in
  `src/assets/sprites/` (those PNGs are unused reference now — kept, not
  imported). The SVGs carry NO baked shadow; the board draws a separate static
  circular `.sprite__shadow` under each and mirrors only the `.sprite__body`.
  (Under `components/`; not in the depth-2 listing.)
- Sidebar is composed of small pieces: `Sidebar`, `CurrentPyramidPanel`,
  `PyramidShape`, `LevelList`/`StatusPanel`/`StatusChips`/`AppTitle`/
  `SidebarFooter`, `Controls` (the d-pad), `SettingsToggles`. Mobile:
  `MobileShell`, `LevelDrawer`.
- `pages/MapPage.tsx` — the world map (`/map`): pyramids as clickable shapes.
- `pages/EditorPage.tsx` (+ `components/editor/*`) — the level editor (`/editor`),
  live solvability + par + JSON export/import. `PlaytestPage.tsx` (`/playtest`).
- Routes in `App.tsx`: `/` → `/play`; `/play` (NO level id — see GamePage); `/map`;
  `/editor`; `/playtest`.
- `theme.ts` — warm desert-tomb palette (one gold + one lapis accent, flat, no
  gradients). `index.css` — reset, focus-visible ring, reduced-motion, the
  tomb-wall body backdrop, AND the global **carved-stone UI primitives**
  (`.stone-btn` [+`--sm`/`--warn`/`--gold`/`--muted`], `.stone-tag`, `.stone-slab`,
  `.stone-sign`, `.stone-plaque`, `.sidebar`). **`index.css` MUST be imported in
  `main.tsx`** — it was orphaned for a long time, so every rule in it (stone
  classes, backdrop, focus ring) silently didn't apply; MUI's `CssBaseline` masked
  the missing reset. If stone classes "don't apply", check that import first.

## Visual system (the 2002 pre-render pass)

The whole app is styled as an early-2000s pre-rendered isometric-ish tomb game
(muddy sandstone, baked lighting, carved stone chrome). This is **view-only** —
no engine/mechanics changed. Key pieces:

- **`src/game/textures.ts`** — procedural, seamlessly-tiling sandstone/stone
  textures from `feTurbulence` (baked into the diffuse, no real-time light),
  exported as `boardTextures` data-URI CSS `url(...)`s: `floorA`/`floorB` (checker),
  `wallTop`, `grain` (a soft-light film), `frameStone` (dark carved stone). Small
  tiles so the repeat is faintly visible (the biggest 2002 tell).
- **`src/game/frieze.ts` + `components/BoardFrame.tsx/.css`** — the ornate Egyptian
  cabinet frame around the board: a hand-authored, tileable hieroglyph frieze
  (ankh/sun-disc/seated-pharaoh/eye-of-horus), twisted-rope side braids, and corner
  sun-disc rosettes. Thickness scales with the pane (reserved in `BoardPane`).
- **`components/sprites/CharacterSprites.tsx`** — the cast rebuilt as low-poly
  pre-render read: mummy + explorer are **upstanding, broad-shouldered men built
  from cylinder limbs** (arms thrust straight forward foreshorten to short stubs;
  the explorer's arms bend at the elbow), the scorpion is **top-down**. Baked
  top-left light via gradients, soft self-colored edges (no ink outline), muddy
  palette; red/white stays distinct. `MonsterSprite`/`ExplorerSprite` are `memo`'d.
- **`components/sprites/TileDecals.tsx`** — skull/key as carved-stone medallions
  (not line icons). The exit (`Board.tsx` `ExitOpening`) is an in-tile descending
  staircase with a warm glow.
- **`components/Ankh.tsx`** — a gilded ☥; **`components/SidebarPyramid.tsx`** — the
  current pyramid drawn with the map's own carved-stone `PyramidSprite`.
- **Desktop `Sidebar.tsx`** — carved-stone rail: NO movement wheel (arrow/WASD
  move), big full-width stone `.stone-btn` keys for Map/Editor, the pyramid moved
  to the bottom in a `.stone-plaque` with the ankh, engraved status + stone tags.
  `Controls` gained `showWheel` (desktop `false`) and `compact` (mobile icon row).
- **Map (`WorldTrail`/`MapPage`)** and the **win/lose overlay (`BoardPane`)** use the
  same stone primitives (signs, cartouche header, night vignette, stone tablet).

## Levels: the generate-don't-edit rule

- **`src/levels/*.json` and `src/levels/index.ts` are AUTO-GENERATED. Never
  hand-edit them.** To change the pack, edit `scripts/generate-levels.mjs` (or
  the generator/curriculum logic in `src/engine/generator.ts`) and re-run
  `generate` / `extend`. The script rewrites `index.ts`.
- `src/levels/pyramids.ts` is a **config layer** over the flat level list. It
  groups levels into **pyramids of 10** (rows 4/3/2/1, climbed base→apex) with
  themed names, and defines the play/unlock order (`progressionOrder`,
  `nextInProgression`, `getPyramidOfLevel`, `pyramidLevelIds`, `displayName`,
  `levelNumberInPyramid`, `currentObjectiveId`, `furthestCompletedIndex`). Keep
  that exported API stable — the UI + `useProgress` depend on it.
- **`buildPyramids` orders each pyramid's floors by BOARD SIZE** (dark level last
  → apex), so the lowest floor always has the fewest squares and boards grow every
  floor up. This is a LAYOUT concern here, separate from the generator: `tierPlan`
  ramps size by *registry position*, but the floors are laid out here, so the
  ordering MUST key on the size itself — else a big board lands on the base floor.
  Because this re-orders the pyramid, unlock/progression must be derived from the
  completed set (see `useProgress`), never stored.
- Current pack: **180 levels / 18 pyramids** (10 levels each). Levels 1–9 are the
  hand-authored teaching curriculum; the rest are generated. Every level is
  build-time verified: solvable within the solver cap **under the current
  collision rule**, **not** beeline-trivial, enemy close, `par > manhattan`.
  Merges are never *required* in levels 1–6; from level 7 a merge may be part of
  the intended solution.
- **Key policy: no decorative keys.** A generated level either is a real
  LOCK-AND-KEY (the exit tile is sealed so its only interior entrance is one
  closed gate; a key elsewhere opens it) or carries no key at all. Lock-and-key
  levels land at a ~1-in-4 cadence (`isKeyLevel` in `generate-levels.mjs`: every
  4th global index, never a dark apex) plus the hand-authored level 09, and are
  verified by `generator.keyRequired` (the `requireKey` generate option):
  solvable, but UNsolvable with the key removed, so the key is on the only
  winning path no matter who trips it. Random/decorative gates are gone.
- **Board size ramps base→apex within each pyramid** (fewer squares on the lower
  rungs, biggest at the apex — echoing the original's 6/8/10 lattices), set in
  `tierPlan` in `scripts/generate-levels.mjs`. **Every pyramid's APEX (top rung)
  is a DARK/flashlight level** (§2.7) — the biggest board, so a radius-2 torch
  stays mostly dark; `pyramids.ts` sorts dark levels last so the gentler-`par`
  apex lands at the top. (Superseded the old single all-dark "Lightless Vault"
  pyramid.)
- The generator proves quality: for each candidate it runs the real BFS solver
  (rejects if it hits the state cap = "intractable"), the beeline test (a naive
  walk-to-exit player must LOSE, or the level is a boring stroll), and a proximity
  check. Boards are capped at 12×12; difficulty rises via more monsters/walls/
  traps/keys and the base→apex size ramp.

## Core mechanics (full detail in `docs/SPEC.md`)

- Turn: player moves 1 tile or waits; then every monster moves. Mummies take 2
  steps/turn, scorpions 1. White = horizontal-first, red = vertical-first. Each
  monster greedily steps toward the player on its priority axis, falling back to
  the other axis if blocked, and never voluntarily steps away. The engine
  resolves monsters in fixed order (order decides collisions), but the animation
  plays each sub-step SIMULTANEOUSLY across all monsters (see the trace `round`).
- **Wall-bump wastes the turn like a wait** (player stays, monsters still move) —
  intentional, tactically useful. Implemented in `step.ts` (`blocked → 'wait'`).
- Two monsters colliding (a "merge"): a **mummy always beats a scorpion**
  (regardless of who moved); a same-class collision is won by the mover. A
  scorpion charging into a mummy is the one destroyed (and takes no further steps
  that turn). Implemented in `step.ts` via `isMummy` (faithful to the original).
- Keys toggle all gates when any entity enters the key tile. Traps kill the player
  only. Win by stepping through the exit border edge.
- **Dead-state ankh:** when no winning move remains (`useHints`'s `solveFrom`
  reports `unsolvable`), the sidebar `Ankh` turns blood-red and pulses — the
  canonical "dead maze" tell. Presentational only (`Ankh.tsx` `dead` prop).
- **Animations** (`useAnimatedGame.ts` + `Board.tsx/.css`, view-only): a
  **spawn-in** intro (board starts black, explorer walks in from the right edge
  to its start tile, then lights come up — full reveal on lit levels, torch view
  on dark ones; then the **enemy elevator**: each enemy's start tile rises up out
  of a dark pit carrying the enemy — a slow, LINEAR stone rise, no overshoot —
  and the risen enemies' heads twist a full 360° to face the player with a scare
  roar; one-time per load, skippable, snaps when animations off). Driven by a
  `SpawnPhase` machine (`dark`→`reveal`→`rise`→`turn`, then null) on `RenderState`:
  the normal monster layer is suppressed for every non-null phase and `SpawnRisers`
  draws the enemies instead. **Read these design points before touching it — they
  are all bugs already fixed:**
  - **TWO planes per enemy** (not one): a floor plane (pit + rising slab) at
    `z-index 1` BELOW the walls, so a wall bordering the tile is never blacked out
    by the pit; and an enemy plane at `z-index 6` ABOVE the walls. Both share the
    SAME `.spawn-riser__lift` `spawn-rise` animation, so they rise in lockstep.
  - The rising slab is drawn **pixel-identically to a static `.cell`** (checker
    parity `--a`/`--b`, 1px grid border, no fake-3D shadows) AND the floor plane is
    pulled back 2px (`top/left: -2px`) to undo the overlay-vs-grid offset — else it
    flashes the wrong floor / lands 2px down-right on hand-off.
  - The enemy plane's bottom clip is raised (`--enemy-clip-bottom`, set per enemy)
    ONLY when a horizontal wall sits on that tile's south edge (so the rising enemy
    never covers the wall-top); otherwise 0, so the legs reach the floor.
  - The enemy body carries the same facing mirror as the settled monster
    (`mirrorStyle(faceToward(m.pos, player))`) so it doesn't flip L/R at hand-off.
  - The head-turn is **`SpawnHead3D`** (CharacterSprites): the flat body-SVG head
    (`.sprite-head`) is hidden and this overlays in its place — a round ball whose
    front is pixel-identical to the flat head (no pop) while a per-frame rAF orbits
    the eyes across its surface and brings the back of the head round (a real 3D
    sphere turn; a flat SVG `rotateY` collapses to a line, which is wrong).
  - No red "menace glow" — it read as a shadow that popped away on settle.
  The
  **win-exit** walk; and a monster/player **crash** (loser squash-and-fade
  knockout + survivor recoil + a **gray smoke cloud + gold sparkles** with the
  merge sound, held so it finishes before the turn settles — also fired when the
  player is caught). All on non-memoized layers so a turn still re-renders only
  sprite content.
- **Sprite hop movement is driven by the Web Animations API (WAAPI),** not a CSS
  `transition` — see the compositing gotcha below (this is what fixed mobile
  "static enemies" and the desktop 3-FPS stutter).

## Gotchas (read these)

- **MUI v9 `Stack`**: `alignItems` / `justifyContent` / `flexWrap` were removed as
  direct props — use them via `sx` (`<Stack sx={{ alignItems: 'center' }}>`).
  Passing them directly gives a misleading `Property 'component' is missing` tsc
  error. `tsc` catches it; Vite dev does not.
- **Safari Web Audio**: Safari won't start/resume an `AudioContext` outside a
  direct user gesture, and our SFX fire from the animation `setTimeout` timeline.
  `sound.ts` installs gesture listeners (pointerdown/keydown/touchend) that
  create+resume+kick a silent buffer + warm every sample. These stay attached
  **for the whole page lifetime — never detached** (detaching after the first
  unlock left audio permanently silent after a tab switch, until a browser
  restart). Safari suspends/`'interrupt'`s a backgrounded tab's context, so:
  `audio()`/`unlock()` resume on ANY non-`'running'` state (not just
  `'suspended'`), and a `visibilitychange` handler proactively `suspend()`s on
  hide (clean recovery) and `resume()`s on show; a wedged context is otherwise
  cured by the next gesture. Ported from `~/chessgo`'s `sounds.ts`. Don't
  re-add listener removal or narrow the resume to `'suspended'` (Chrome is lax
  and hides the bug).
- **HMR desync**: renaming/removing an exported hook breaks React Fast Refresh and
  leaves the page in a stale, wrong state (once looked like sprites "phasing
  through walls" — it wasn't a real bug). After such a change, hard-refresh or
  restart the dev server before diagnosing anything.
- **Headless screenshots**: system Chrome is at `/Applications/Google Chrome.app`.
  `--headless=new ... --window-size=W,H --screenshot=out.png URL` works, but
  `--window-size` does NOT set the CSS layout viewport — for a true mobile (375px)
  check use CDP device emulation, not `--window-size`. Always Read the PNG to
  confirm; the DOM can look right while pixels are wrong.
- **Board exit opening** must stay `position: absolute` in `Board.css` — as an
  in-flow element it shifts the static origin the absolutely-positioned sprites
  translate from, dropping a sprite off-tile on some boards.
- **Faux-3D walls (light top-left):** each wall's TOP FACE overhangs UP-LEFT
  (leading edge) always — that overhang is the 3D read; it must NOT overhang
  down-right into an empty neighbour (spills onto floor). A trailing (right/
  bottom) end overhangs ONLY when a perpendicular wall meets it there (lands on
  wall, closes the corner square gap). Merging depends on the two-plane z-order
  (all shadows below all tops) — a border/rounding on `.wall-top` re-draws
  internal seams as a visible gleam, so keep tops flat and butted.
- **`.board` sets `isolation: isolate`** so the walls'/sprites' z-indexes stay
  contained and the end-of-level `Paper` overlay (BoardPane, `zIndex: 5`) paints
  ABOVE them. Overlay z-scale: wall-shadow 1, wall-top/gate 2, exit 4, monster 6,
  player 7. Without the isolate, the win/lose buttons hide behind the walls.
- **Sprite movement = WAAPI + GPU-cached board layers (perf-critical).** Each
  single-tile hop is animated with `el.animate()` (Web Animations API) in a
  `Board` `useLayoutEffect`, NOT a CSS `transition` — WAAPI runs on the compositor
  and stays smooth even when the main thread is janky (a CSS transition drops
  frames on a slow phone and the hop reads as a teleport = the "enemies look
  static on mobile" bug). Multi-tile jumps (undo/restart/snap) are not animated.
  The `.sprite` CSS has NO `transform` transition (only opacity) so the two can't
  fight. CRITICAL companion: the extruded walls use stacked `box-shadow`s
  (very expensive to repaint), so they + the floor are wrapped in **cached
  compositor layers** (`.board__walls` and `.board__grid` get `transform:
  translateZ(0)`). Without that, a sprite animating OVER the walls repaints them
  every frame → the whole app drops to ~3 FPS while anything moves. Don't remove
  the `translateZ(0)` or re-add a transform transition on `.sprite`.
- **World-map clicks: don't `setPointerCapture` on `pointerdown`.** `WorldTrail`
  is drag-to-pan; capturing the pointer on down makes Chrome retarget the ensuing
  `click` to the scroll container, so a plain tap on a tomb never reaches its
  `onClick` (tombs feel dead). Capture ONLY once the drag threshold is crossed
  (in `pointermove`), so a stationary click selects the level.
- **Current-step marker is an explorer HEAD, not a torch.** `PyramidSprite`
  (shared by map + sidebar) draws a small pith-helmet head on the block whose
  `stateOf` is `'current'` — ONLY that state (never `'available'`), so exactly one
  head shows. The map's `stateOf` is completed-first (objective = current); the
  SIDEBAR's is current-first (the level you're playing shows a head even when it's
  a completed replay).
- **Sprite facing is a horizontal MIRROR, never a rotation.** The art is
  top-down-ish with a look that breaks if rotated; rotating also spun the old
  baked PNG shadow. So `.sprite__body` only flips L/R (mirrors on west) over a
  separate, static `.sprite__shadow`. Monsters face the player; the explorer
  faces its last move. (Lesson: pre-rendered sprites with baked shadows can't be
  rotated cleanly — keep the shadow a separate board layer.)
- **Running engine/levels headlessly** (no browser): use Vite `ssrLoadModule` in a
  `node --input-type=module` script (`createServer({server:{middlewareMode:true}})`
  → `ssrLoadModule('/src/engine/index.ts')`). The `WebSocket server error: Port
  24678 is already in use` line it prints is harmless.
- **Generation is slow** at high tiers (it proves bad candidates bad by searching
  them to the state cap). Build-time only; players/tests use pre-verified JSON.
  Run it in the background and use a single waiter, don't poll.
- **`docs/solutions/*.md` are STALE** (old pre-rename level ids). Regenerate from
  the current pack if you need them; don't trust them as-is.
- `pack.test.ts` SAMPLES levels (base+apex of each pyramid + a seeded subset), not
  all 180 — keep it that way so the suite stays fast.
- **Vite dep-cache corruption.** If the dev log shows "You are loading @emotion/react
  when it is already loaded" / "multiple copies of React" / "Invalid hook call" and
  the app renders as unstyled defaults, it's a stale optimize cache, not your code:
  `rm -rf node_modules/.vite` and restart the dev server.
- **Orphaned CSS import.** A global CSS file only applies if something imports it.
  `index.css` (stone primitives + backdrop) is imported in `main.tsx`; a
  component CSS (`Board.css`, `BoardFrame.css`) by its component. Rules that "don't
  apply" are usually an un-imported stylesheet, not a specificity problem. Prefer
  setting a Paper/Box background via `sx` (instance) over a competing class — MUI's
  `MuiPaper` theme override (`backgroundImage:'none'`) ties on specificity with a
  plain class and wins unpredictably by injection order.
- **Mobile viewport / iOS 26 floating nav.** `MobileShell` sizes to `100svh`
  (+ `100vh` fallback) with `env(safe-area-inset-bottom)` padding on the control
  cluster, so the movement wheel is never hidden under Safari's floating tab bar.
  Use `svh`, not `vh`, for any full-height mobile shell.

## Verification workflow

Before considering any change done: `npx tsc -b` clean, `npm test` green, and —
for anything visual — a headless Chrome screenshot that you actually Read. The
engine also has a fast SSR path for logic checks (above).

## Working preferences (the user's)

- **Ambitious, wave-by-wave.** Use **subagents** to do the building; keep the main
  thread for orchestration. Run independent streams in parallel on disjoint files;
  sequence when they share files.
- **Commit after every completed, verified "thing."** Local commits only — **no
  push, no remote yet.** **Omit attribution trailers** (Co-Authored-By /
  Claude-Session) — attribution is disabled globally. Conventional-commit style
  (`feat:`, `fix:`, `docs:`, …). When other work is mid-flight, stage only the
  relevant paths (`git add <path>`), not `git add -A`.
- **Quality bar is high** — "no laziness," do it properly. Think about the human
  playing and about what makes the genre good, not just passing checks.
- **Writing/UI taste**: plain, direct prose — no hype words, no "not just X but Y",
  minimal em-dashes, no filler openers/closers. Avoid "vibecoded" UI tells: no
  purple/indigo gradients or glassmorphism, constrained palette, real SVG icons
  (not emoji), solid backgrounds, real title/favicon/meta. The desert-tomb theme
  is deliberate — keep it.
- **Don't over-poll background work**; a single waiter that fires once is right.
  When told to wait, wait and do nothing.

## Open items / ideas (not started)

- Pyramids 18–20 (finish the intended 20) via another `extend`.
- Solver speedups for faster regeneration (build-time only): (1) lower the
  *generation* solve cap (~60k) + run cheap filters before the expensive solve
  (biggest, lowest-risk win, keep the runtime/hint cap separate); (2) ring-buffer
  BFS queue + packed integer/bitboard state keys instead of string keys (~2–4x,
  touches the core solver — test carefully). A*/IDA* and a Go/Rust rewrite were
  considered and deprioritized (A* misses the reject bottleneck; a second engine
  risks rule divergence).
- Regenerate `docs/solutions/` against the current pack.

## Pointers

- `docs/SPEC.md` — full mechanics, data model, engine API, design rulings.
- `README.md` — public-facing overview.
