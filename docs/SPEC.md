# Maze Escape — Technical Specification

A turn-based grid pursuit puzzle, re-implemented from scratch in React. An
explorer must reach the exit of a walled maze while deterministic monsters hunt
them down. This is a **clean-room reimplementation of game mechanics only**.

> **Legal note.** Game *rules and mechanics* are not copyrightable — only
> specific expression is (art, audio, level layouts, names, logos, trademarks).
> This project reproduces mechanics for personal, offline play. It must **not**
> use the original game's name, branding, artwork, sound, or level data. All
> assets and level designs here are original. Working title: **Maze Escape**.

---

## 1. Overview

- **Genre:** deterministic turn-based logic-maze puzzle.
- **Goal:** move the explorer from the start tile to the exit without being
  caught by a monster or stepping on a trap.
- **Core tension:** monsters move faster than you but are *fully predictable*.
  Every level is a solvable puzzle — you win by out-thinking the pursuit AI,
  luring monsters into walls, traps, or each other.
- **Platform:** browser, React SPA. No backend. Progress persisted to
  `localStorage`.

---

## 2. Core Mechanics

### 2.1 The grid

- The maze is a rectangular grid of square tiles, `width × height`. Coordinates
  are `(x, y)` with `x` increasing right, `y` increasing down; origin top-left.
- **Walls** sit on the *edges* between two tiles (or on the outer border). A
  wall blocks movement across that edge in both directions.
- Exactly one edge of the outer border is the **exit** — a gap the explorer
  can step through to win. Monsters cannot use the exit.
- Movement is orthogonal only (up/down/left/right). **No diagonals.**

### 2.2 Turn structure

The game is strictly turn-based and alternates:

1. **Player phase.** The player takes exactly one action:
   - move one tile (N/E/S/W) into an adjacent tile not blocked by a wall/closed
     gate, **or**
   - **wait** (skip — stay on the current tile). Waiting is a legal, essential
     move used to bait monsters.
2. **Resolution of the player action** (win/lose checks — see 2.6).
3. **Monster phase.** Every monster takes its full move (see 2.3), one monster
   at a time in a fixed order, with checks after *each individual step*.
4. Back to the player phase.

> **"For every one square you move, the mummy moves two."** Monster speed is
> defined in steps-per-turn, below.

### 2.3 Monsters and the pursuit algorithm

All monsters share one deterministic greedy chase rule; they differ only in
**axis priority** and **speed**.

| Monster        | Axis priority            | Steps per player turn |
|----------------|--------------------------|-----------------------|
| White monster  | Horizontal, then vertical | 2                    |
| Red monster    | Vertical, then horizontal | 2                    |
| White scorpion | Horizontal, then vertical | 1                    |
| Red scorpion   | Vertical, then horizontal | 1                    |

**Single-step decision** for a monster at `(mx, my)` chasing the player at
`(px, py)`:

```
dx = px - mx
dy = py - my

# "primary" is the monster's priority axis; "secondary" is the other axis.
if primary axis has a nonzero delta AND the step toward the player on that
   axis is not blocked (no wall / no closed gate / in bounds):
       take that step
else if secondary axis has a nonzero delta AND that step is not blocked:
       take that step
else:
       stay put this step   # fully blocked toward the player
```

Key properties of the algorithm:

- A monster **only ever steps in a direction that reduces its distance** to the
  player on that axis. It never voluntarily steps away. If the preferred axis is
  blocked by a wall, it falls back to the other axis; if both are blocked, it
  wastes the step (stays put). This is what makes walls and dead-ends usable as
  bait.
- Each of a 2-step monster's steps is decided **independently and sequentially**:
  after step 1 the monster's position updates, then step 2 is recomputed against
  the (unchanged, since it's still the monster phase) player position. This lets
  monsters turn corners within a single turn.
- Scorpions are identical but take **one** step per turn — slower, so they can
  fall behind and be out-maneuvered more easily.

### 2.4 Traps

- A **trap** tile is lethal **to the explorer only**. Stepping onto it (by
  moving there) is an immediate loss.
- Monsters and scorpions **cross traps freely** with no effect.

### 2.5 Keys and gates

- A **gate** is a toggleable barrier on a tile edge (or passage). When *closed*
  it blocks movement like a wall; when *open* it is passable. Gates start in a
  level-defined state.
- A **key** is a tile. Whenever *any* entity — the explorer, a monster, or a
  scorpion — **steps onto** a key tile, **all gates in the level toggle**
  (open↔closed). The key is not consumed; it toggles again each time it is
  entered.
- Because monsters can trip keys, gate timing becomes part of the puzzle.

### 2.6 Win / lose / collision resolution

Checked in this exact order:

**After the player's action (player phase):**

1. If the player stepped through the **exit** → **WIN** immediately. Monsters do
   not move.
2. If the player's tile is now a **trap** → **LOSE**.
3. If the player moved **onto a tile occupied by a monster** → **LOSE** (walked
   into a monster).
4. If the player stepped on a **key** → toggle gates.

**During the monster phase, after each individual monster step:**

1. If the monster's new tile == the **player's tile** → **LOSE** (caught).
2. If the monster's new tile == another **monster's tile** → **collision**:
   they fight and exactly **one monster is removed**, leaving a single monster
   on that tile. Survivor rule (faithful to the original): a **mummy always
   beats a scorpion** (the scorpion is destroyed) regardless of which one moved;
   in a **same-class** collision (mummy↔mummy or scorpion↔scorpion) the *moving*
   monster survives. A scorpion that charges into a mummy is the one destroyed,
   so it also takes no further steps and cannot catch the player that turn. A
   destroyed monster no longer moves or threatens.
3. If the monster stepped on a **key** → toggle gates.
4. Traps have no effect on monsters.

If all monsters are destroyed via collisions, the level becomes a trivial walk
to the exit (still winnable — this is intended, it's a reward for good play).

### 2.7 Darkness (flashlight levels)

Some levels are **dark**. The maze is unlit except for a **pool of torchlight
that follows the explorer** — a "flashlight" the player carries. This is the
classic "dark pyramid" of the genre.

**Critical: darkness is a view-layer, information-hiding feature only. It changes
no rule.** Monsters still chase by the exact deterministic algorithm (§2.3),
walls still block, keys/gates/traps behave identically, and the level's solution,
`par`, solver result, and every engine unit test are unchanged whether the level
is dark or not. The engine does not read the darkness flag at all — only the
renderer does. Determinism (§3) is fully preserved, so undo and the BFS solver
work exactly as in a lit level.

The darkness rules the renderer applies:

- **Lit region.** A level may declare `dark: { radius }`. A tile `(x, y)` is
  *lit* iff its Euclidean distance to the explorer is `≤ radius + 0.5`
  (`hypot(x - px, y - py) ≤ radius + 0.5`). Recommended `radius` is `2` (a soft
  circular pool spanning a ~5×5 area). The light moves with the explorer and
  follows it smoothly during the move animation.
- **Walls and floor** outside the lit region are hidden (black). There is **no
  persistent memory** — a tile re-darkens once the explorer moves away. Planning
  around walls you can't currently see is the whole point of a dark level.
- **Monsters** inside the lit region draw as full sprites. Outside it, a monster
  shows only as a faint pair of **glowing eyes** — enough to sense the threat and
  roughly locate it, not enough to hand the player the maze layout for free.
- **The exit** always emits a soft **beacon glow** through the dark, so the player
  knows which border edge they are heading for even while the walls between are
  unlit.

Because darkness only hides information, dark levels are authored **easier on
pure solvability** than lit levels of the same tier (smaller boards, lower `par`,
fewer monsters). The darkness supplies the difficulty; the underlying puzzle
stays gentle so the level is fair rather than a memory-guessing slog.

---

## 3. Determinism & solvability

- The entire simulation is a **pure function of state + player action**. No
  randomness anywhere in the turn resolution. Given a level and a sequence of
  player moves, the outcome is always identical.
- This makes levels **puzzles with known solutions**, enables **undo**, and
  makes the engine trivially **unit-testable** and (optionally) auto-solvable
  with BFS over game states.

---

## 4. Data Model

Types below are expressed in TypeScript-ish pseudocode. The engine is written to
the immutability rule: **every transition returns a new state object; nothing is
mutated in place.**

```ts
type Dir = 'N' | 'E' | 'S' | 'W';

interface Pos { x: number; y: number; }

type MonsterKind =
  | 'mummy_white' | 'mummy_red'      // 2 steps/turn
  | 'scorpion_white' | 'scorpion_red'; // 1 step/turn

interface Monster {
  id: string;
  kind: MonsterKind;
  pos: Pos;
  alive: boolean;
}

// Walls stored per-cell as a 4-bit set of blocked edges. A wall between A and B
// is recorded on BOTH cells to keep lookups O(1) and symmetric.
interface Cell {
  walls: { N: boolean; E: boolean; S: boolean; W: boolean };
  trap: boolean;
  key: boolean;
}

interface Gate {
  id: string;
  // A gate lives on the edge between `a` and its neighbor in direction `dir`.
  a: Pos;
  dir: Dir;
  open: boolean;
}

interface Level {
  id: string;
  name: string;
  width: number;
  height: number;
  cells: Cell[][];          // [y][x]
  gates: Gate[];
  exit: { pos: Pos; dir: Dir }; // border edge that is the exit
  start: Pos;               // explorer start
  monstersStart: Monster[];
  dark?: { radius: number }; // if set, a flashlight level (§2.7); view-only
}

type Phase = 'player' | 'resolving' | 'won' | 'lost';

interface GameState {
  level: Level;
  player: Pos;
  monsters: Monster[];
  gatesOpen: Record<string, boolean>; // gateId -> open?
  phase: Phase;
  turn: number;
  moveCount: number;        // player moves used (for scoring / par)
}
```

### 4.1 Level format (JSON on disk)

Levels are authored as JSON and bundled with the app (`/src/levels/*.json`).
A compact authoring format is preferred over the fully-expanded runtime `Level`;
a loader expands it. Suggested authoring shape:

```json
{
  "id": "world1-03",
  "name": "Corner Trap",
  "width": 8,
  "height": 8,
  "start": { "x": 0, "y": 7 },
  "exit": { "x": 7, "y": 0, "dir": "N" },
  "walls": [ { "x": 2, "y": 3, "dir": "E" }, "..." ],
  "gates": [ { "x": 4, "y": 4, "dir": "S", "open": false } ],
  "keys": [ { "x": 1, "y": 1 } ],
  "traps": [ { "x": 5, "y": 5 } ],
  "monsters": [ { "kind": "mummy_white", "x": 7, "y": 7 } ],
  "dark": { "radius": 2 }
}
```

The loader validates every level at load time (in-bounds coords, symmetric
walls, exit on border, exactly one start, solvable if a `par` is declared).
Invalid levels fail fast with a clear error (per the input-validation rule).

---

## 5. Engine API

A framework-agnostic pure module, `src/engine/`, with **no React imports**.

```ts
// Build initial state from a level.
initGame(level: Level): GameState

// The single transition function. `action` is a direction or 'wait'.
// Returns a NEW state; never mutates. Runs the full turn:
//   apply player action -> checks -> monster phase -> checks.
step(state: GameState, action: Dir | 'wait'): GameState

// Movement legality for UI affordances (highlight reachable tiles).
canPlayerMove(state: GameState, dir: Dir): boolean

// Helpers used internally and by tests:
canCross(level, gatesOpen, from: Pos, dir: Dir): boolean  // wall/gate/bounds
monsterStep(state, monster): Pos                          // one greedy step
```

Recommended internal decomposition (keep files 200–400 lines, per style rules):

- `engine/types.ts`
- `engine/board.ts` — geometry, `canCross`, neighbor math.
- `engine/monsters.ts` — the pursuit algorithm + collision resolution.
- `engine/step.ts` — turn orchestration, win/lose checks.
- `engine/level.ts` — authoring-format loader + validation.
- `engine/index.ts` — public surface.

---

## 6. UI / React Architecture

No backend; everything runs client-side.

### 6.1 Component tree

```
<App>
  <GameProvider>            // holds GameState + history via useReducer
    <TopBar>                // level name, moves, par, restart/undo buttons
    <Board>                 // the maze grid
      <Tile>               // floor, walls, trap, key, gate, exit markers
      <Explorer>           // player sprite (absolutely positioned)
      <MonsterSprite>      // one per living monster
    <Controls>             // on-screen arrows + wait (mobile); keyboard too
    <LevelComplete/GameOver overlay>
    <LevelSelect>          // grid of unlocked levels
```

### 6.2 State management

- A `useReducer` over `GameState` with actions: `MOVE(dir)`, `WAIT`, `UNDO`,
  `RESTART`, `LOAD_LEVEL(id)`.
- The reducer delegates the actual game logic to the pure `step()` engine
  function — the reducer only manages history and level lifecycle.
- **Undo** is implemented by keeping a stack of prior `GameState`s. Each `MOVE`/
  `WAIT` pushes; `UNDO` pops. Because states are immutable this is cheap and
  exact. (The original supported undo/restart — keep parity.)
- **Restart** resets to `initGame(currentLevel)`.

### 6.3 Rendering

- Board rendered with **CSS Grid** (or SVG) sized to `width × height`. Prefer
  CSS Grid for tiles + absolutely-positioned sprites layered on top, so sprites
  can **animate** (CSS transitions on `transform: translate`) between tiles.
- Walls drawn as thick borders on tile edges; gates as a distinct
  open/closed border style; traps and keys as tile-center glyphs; exit as a gap
  in the border with an arrow.
- Distinct, colorblind-safe visuals for white vs red monsters and for
  scorpions vs full-size monsters (shape + color, not color alone).
- Animation is **cosmetic only** — the authoritative state jumps instantly;
  the view interpolates. Never let animation gate input (queue or ignore input
  during the brief monster-move animation).
- **Dark levels (§2.7)** add a torchlight overlay above the floor/walls: a black
  layer with a soft radial "hole" centred on the explorer (radius from
  `level.dark.radius`), so only nearby tiles are visible. Sprites are drawn above
  the overlay and gated per-sprite: a monster outside the lit region renders as
  glowing eyes instead of its full body; the exit keeps a faint beacon glow. The
  lit/unlit test is a pure helper so it is unit-testable without the DOM. The
  overlay respects `prefers-reduced-motion` (no light flicker).
- **Shipped visual style** is a stylized early-2000s pre-render: muddy sandstone
  textures (procedural `feTurbulence`, baked light), an ornate Egyptian hieroglyph
  "cabinet" frame around the board, carved-stone UI chrome, and low-poly-read
  sprites (upstanding cylinder-limbed figures + a top-down scorpion). This is
  **view-only** — it changes no rule or state — and is documented in `CLAUDE.md`
  ("Visual system"). The board is split into memoized static layers so a turn
  animation repaints only the moving sprites.

### 6.4 Controls

- Keyboard: arrow keys / WASD to move; Space or `.` to wait; `U` undo; `R`
  restart.
- Pointer: click/tap an adjacent tile to move there; a dedicated **Wait**
  button; on-screen D-pad for touch.
- Ignore inputs when `phase !== 'player'`.

---

## 7. Known ambiguities & our chosen rulings

These are edge cases where original behavior is folk-knowledge or version-
dependent. We pick one deterministic ruling and document it so tests can pin it:

1. **Monster-vs-monster collision survivor.** Faithful to the original: a
   **mummy always beats a scorpion** (regardless of who moved); a same-class
   collision is won by the *moving* monster. See §2.6.
2. **Simultaneity of monster moves.** Monsters move **sequentially in a fixed
   order** (level definition order), full move each, with checks after every
   step — not truly simultaneously. Order can affect rare collision/key cases.
3. **Two 2-step monsters, key toggled mid-move.** Gate state can flip *between*
   a monster's two steps and between monsters. This is intended; the engine
   re-reads gate state before every `canCross`.
4. **Player waiting on a key / trap / exit.** Waiting keeps you on your current
   tile and does not re-trigger a key (a key toggles on *entering* a tile, not
   on remaining). Standing on a trap is only lethal on the entering step; define
   levels so the player never *starts* on a trap.
5. **Monster with zero distance on both axes** = it's on the player = caught
   (handled by the lose check before it matters).
6. **Darkness never affects resolution.** A dark level (§2.7) is byte-for-byte
   the same simulation as the identical lit level: same monster moves, same
   collisions, same win/lose, same `par`, same solver output. Only what the
   player can *see* differs. Tests pin this — a dark level and its lit twin
   produce identical `step()` traces.
7. **Wall-bump wastes the turn.** A directional move into a wall/border/closed
   gate is treated as a **wait**: the player stays and the monsters still move.
   A mechanics-faithfulness pass weighed the original's likely no-op (turn not
   consumed) against this; we deliberately **keep the wasted-turn ruling** — it's
   tactically useful, players still have an explicit wait, and the whole solved
   level pack is verified against it.

---

## 8. Persistence (localStorage)

No backend. A single namespaced key, e.g. `maze-escape:v1`, holds:

```ts
interface SaveData {
  version: 1;
  unlockedLevelIds: string[];
  bestMoves: Record<string, number>;   // levelId -> fewest moves to win
  completedLevelIds: string[];
  lastPlayedLevelId?: string;
  settings: { sound: boolean; animations: boolean };
}
```

- Wrap all access in a `storage` module with try/catch (private-mode / quota
  failures must degrade gracefully to in-memory, never crash).
- Validate/parse-guard on read; on version mismatch, migrate or reset with a
  sensible default. Never trust the parsed blob (input-validation rule).
- Completing a level unlocks the next and records `bestMoves` (min).

---

## 9. Content / Progression

- Levels grouped into "worlds" of increasing difficulty (e.g. introduce: basic
  chase → walls/dead-ends → two monsters → scorpions → traps → keys/gates →
  combinations → **darkness** (§2.7)).
- **Dark levels** are the **apex (top rung) of every pyramid** — climbing a
  pyramid ends in the dark. Board size climbs base→apex within a pyramid (fewer
  squares on the lower rungs, biggest at the apex), so the dark apex is the
  largest board and a radius-2 torch leaves most of it unseen. Darkness is a
  difficulty multiplier on its own, so the apex's underlying layout is authored
  gentler on raw solvability; `pyramids.ts` sorts dark levels last so the
  gentler-`par` apex still lands at the top.
- Each level may declare an optional `par` (a known-good move count) for a
  score/star rating. Since the engine is deterministic, `par` can be verified by
  a BFS solver in tests (see §10).
- A **level editor** is a natural future addition (out of scope for v1): it
  emits the same authoring JSON and can validate via the loader + solver.

---

## 10. Testing Strategy

Meets the project's TDD + 80% coverage expectations. The pure engine makes this
straightforward.

- **Unit (engine):** table-driven tests for the pursuit algorithm — for each
  monster kind, assert the chosen step for representative `(dx, dy, walls)`
  configurations, including wall-blocked fallback and fully-blocked "stay".
- **Unit:** wall symmetry, `canCross` with gates open/closed, key toggling,
  trap lethality (player yes / monster no), collision resolution.
- **Integration (turn resolution):** scripted move sequences on fixture levels
  asserting the resulting `GameState` (win, lose-by-catch, lose-by-trap,
  lose-by-walk-into-monster, gate timing, corner-turning within a 2-step move).
- **Solver-backed:** a BFS/DFS over game states that finds a winning move
  sequence; assert every bundled level is solvable and that declared `par`
  matches the shortest solution. This doubles as regression protection when the
  engine changes.
- **UI:** component tests for input→reducer wiring, undo/restart, and that input
  is ignored outside the player phase. localStorage module tested with a mocked
  storage that throws (quota/private mode) to prove graceful degradation.
- **E2E (critical flow):** load level → solve → see completion → next level
  unlocked and persisted across reload.

---

## 11. Suggested project structure

```
src/
  engine/            # pure, framework-agnostic (see §5)
  levels/            # *.json authored levels + index
  state/             # reducer, history, storage module
  ui/
    Board/ Tile/ Sprite/ Controls/ Overlays/ LevelSelect/
  App.tsx
docs/
  SPEC.md            # this file
tests/
  engine/ levels/ ui/ e2e/
```

---

## 12. Non-goals for v1

- No backend, accounts, leaderboards, or networked features.
- No **reused** original assets — all art/audio is original or CC0 (public domain).

Since-shipped (these were non-goals at spec time, now built):

- A **level editor UI** (`/editor`) that round-trips the authoring JSON and
  validates via the loader + solver.
- **Sound design** beyond a toggle: recorded **CC0 (Kenney, public domain)** SFX
  played via Web Audio (`src/game/sound.ts`, `src/assets/audio/`), on/off setting
  preserved.
- A full **early-2000s pre-rendered visual style** (see §6.3 and `CLAUDE.md`).

---

## Sources consulted (mechanics research)

- [Mummy Maze Game Tutorial (maze.sourceforge.net)](https://maze.sourceforge.net/tutorial.html)
- [Mummy Maze Solver write-up](https://bigheadghost.github.io/post/mummy-maze-solver/)
- [Mummy Maze Deluxe — MobyGames](https://www.mobygames.com/game/41636/mummy-maze-deluxe/)
- [Speedrun.com rules clarification thread](https://www.speedrun.com/Mummy_Maze_Deluxe/thread/c1t6g)
