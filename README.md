# Maze Escape

A turn-based grid pursuit-maze puzzle. An explorer must reach the maze exit while deterministic monsters hunt them down. The monsters are fast (mummies take two steps per turn, scorpions one) but perfectly predictable: each one greedily steps toward you along a fixed axis priority (white monsters go horizontal-first, red monsters vertical-first) and never voluntarily steps away. You win by out-thinking their pathing, luring them into walls, traps, or each other, not by out-running them. Every level is a solvable puzzle with a known shortest solution.

![The game board](docs/screenshot-game.png)

## Clean-room / legal note

This is an original, from-scratch reimplementation of the *genre's* mechanics for personal, offline play. All code and assets are original or public-domain: the character sprites are hand-drawn SVG, the sound effects are short CC0 (public-domain) samples plus a couple of voices synthesized at runtime with the Web Audio API, and every level layout is generated or hand-authored here. Game rules and mechanics are not copyrightable; only specific expression (art, audio, level data, names, logos) is. This project does not use, and is not affiliated with, any specific commercial game's name, branding, artwork, audio, or level data.

## Features

- **Deterministic pure engine.** The whole simulation is a pure function of state plus a player action. No randomness in turn resolution, so outcomes are reproducible, undo is exact, and the engine is trivially unit-testable. Lives in `src/engine/` with no React imports.
- **Exact solver and difficulty scoring.** A BFS over game states finds the shortest winning move sequence (`solve`), which sets each level's `par`. A difficulty scorer rates layouts for ordering and validation.
- **Seeded build-time level generator.** A reproducible mulberry32-seeded generator draws candidate boards and keeps only those that pass machine-checkable quality filters: an anti-trivial "beeline" filter (a naive player who walks the shortest path ignoring enemies must *lose*), a threat-proximity filter (the nearest enemy must start close, no far-corner idlers), solver-verified solvability, and `par` greater than the straight-line distance.
- **Teaching curriculum.** Levels 1–9 introduce one mechanic at a time (fast mummy juke, then walls, traps, red monsters, two hunters, forced merges, scorpions, keys and gates) with the enemy always close and threatening. The rest are generated on progressively bigger, busier boards.
- **Real lock-and-key levels.** No decorative keys: a level either seals its exit behind a gate that a key elsewhere opens, verified to be *unsolvable* if the key is removed, or carries no key at all. Roughly one generated level in four is a genuine lock-and-key.
- **Dark / flashlight levels.** Some boards are lit only by a torch that follows the explorer; everything outside the pool stays black, with monsters reduced to a pair of glowing eyes and the exit always faintly visible so the way out is locatable. Every pyramid's apex (its largest board) is a dark level.
- **Pyramids and a world map.** Levels are grouped into themed pyramids of 10, laid out as rows of 4 / 3 / 2 / 1 and climbed base to apex as board size and difficulty rise. The pyramids are stitched into a draggable world map, and the pack is extensible. There are currently 180 levels across 18 pyramids.
- **Cinematic spawn intro.** Each level opens in darkness with the explorer walking in from the edge; the lights come up, then the enemies ride up out of the floor on their own tiles like elevators and twist their heads a full 360° to face you with a beast roar. It is view-only and skippable — any input settles straight to the true starting position.
- **Early-2000s pre-render look.** A carved-stone desert-tomb aesthetic: extruded faux-3D walls and gates with baked top-left lighting, procedural seamless sandstone textures, an ornate hieroglyph cabinet frame around the board, and hand-drawn low-poly-read sprites. It is entirely presentational; the engine never sees any of it.
- **Step-by-step animation.** Sprites hop one tile at a time, driven by the Web Animations API on the compositor so they stay smooth under load, while the authoritative state jumps instantly; input is ignored during the brief monster-move animation. Winning plays a real walk-out through the exit gap, and a monster collision kicks up smoke and sparkles. Bumping a wall wastes the turn, exactly like waiting.
- **Hints, solutions, and a dead-maze tell.** One free hint per level, plus a full solver-generated solution reveal. When no winning move remains — recomputed after every move, not only on request — the sidebar ankh turns blood-red and pulses.
- **Sound with toggles.** Short CC0 sound effects (footsteps, latches, impacts, chimes) plus synthesized spawn-intro voices, with mute and animation toggles. Everything degrades to silence and never throws when Web Audio is unavailable; provenance is tracked in `src/assets/audio/CREDITS.md`.
- **Progression via localStorage.** Completion, best-move counts, and settings persist locally. Unlock state and your current objective are *derived* from the completed set and the pyramid order rather than stored, so they can never desync when the pack is reordered. Storage degrades gracefully to memory if unavailable.
- **Web-based level editor.** Paint walls, gates, keys, traps, monsters, start, and exit on a grid with live solvability, par, and difficulty readouts, plus JSON export and import.
- **Responsive layouts** for desktop and mobile.

## Getting started

```bash
npm install
npm run dev      # dev server on http://localhost:5180
npm run build    # type-check and production build
npm test         # Vitest engine + game unit tests
npm run lint     # oxlint
```

## Controls

- **Move:** arrow keys or WASD, or the on-screen D-pad.
- **Wait:** Space or `.` (staying put is a legal, essential move for baiting monsters).
- **Undo:** `U`. **Restart:** `R`.
- **Hint** reveals the next move; **Show solution** reveals the full solver path.
- **Map** opens the world map of pyramids.
- Any key or click **skips the spawn intro** and settles the board immediately.

## Level format and editor

Levels are compact `LevelSpec` JSON authored as sparse lists rather than a fully expanded grid. Walls and gates are edge entries (`{ x, y, dir }`, gates add `open`), keys and traps are cell entries (`{ x, y }`), monsters carry a `kind` and position, and the exit is a single border edge. A loader (`src/engine/level.ts`) validates and expands each spec at load time (in-bounds coordinates, symmetric walls, exit on the border) and fails fast on bad data.

```json
{
  "id": "01-the-chase",
  "name": "The Chase",
  "width": 6,
  "height": 6,
  "start": { "x": 0, "y": 4 },
  "exit": { "x": 1, "y": 5, "dir": "S" },
  "monsters": [{ "kind": "mummy_white", "x": 1, "y": 2 }],
  "par": 3
}
```

Monster kinds are `mummy_white`, `mummy_red`, `scorpion_white`, and `scorpion_red`. Levels live in `src/levels/*.json` and are grouped into pyramids by `src/levels/pyramids.ts` (a config layer that only references level ids and never edits the JSON). Build or tweak levels visually at `/editor`, which shows live validation and exports the same JSON.

## The generator CLI

The level pack is produced at build time only; there is no runtime generation. `src/levels/*.json` and `src/levels/index.ts` are auto-generated — never hand-edit them.

```bash
node scripts/generate-levels.mjs generate      # rebuild the curated pack from scratch
node scripts/generate-levels.mjs extend <N>    # append N solver-verified levels
```

`generate` replaces the pack (hand-authored teaching levels plus generated combinations) and rewrites `src/levels/index.ts`. `extend <N>` reads the existing pack and appends N new levels that pass the same curriculum filters, on progressively bigger and busier boards, without renumbering existing files. Both drive the exact same solver, difficulty scorer, and curriculum filters that the tests use. Generation is slow at high tiers (it proves bad candidates bad by searching them to the solver's state cap), so it is a build-time step only; players and tests use the pre-verified JSON.

## Tech stack

Node 22, Vite 8, React 19, TypeScript, MUI v9 (with emotion), lucide-react, react-router 7, and Vitest 4. Package manager: npm.

## Project structure

```
src/
  engine/       Pure, framework-agnostic game logic (no React)
    types.ts        Core data model
    board.ts        Geometry, canCross, neighbor math
    monsters.ts     Greedy pursuit + collision resolution
    step.ts         Turn orchestration, trace, win/lose checks
    solver.ts       BFS shortest-solution search
    difficulty.ts   Layout difficulty scoring
    generator.ts    Seeded generator + curriculum filters
    level.ts        LevelSpec loader and validator
  levels/       *.json levels, index.ts registry, pyramids.ts grouping
  game/         React hooks + services (animated game, render state, hints,
                progress, storage, sound, settings, procedural textures)
  components/   Board, walls, sprites, sidebar, editor, ornate frame
  pages/        GamePage, MapPage, EditorPage, PlaytestPage
  assets/audio/ CC0 sound samples + CREDITS.md
scripts/
  generate-levels.mjs   Build-time pack generator CLI
docs/
  SPEC.md       Full mechanics, data model, engine API, design rulings
  solutions/    Solver-generated per-level solutions
```

## More

See [docs/SPEC.md](docs/SPEC.md) for the full mechanics, data model, engine API, and the documented rulings on edge cases (collision survivor, monster move order, gate timing). Solver-generated walkthroughs live in [docs/solutions/](docs/solutions/).
