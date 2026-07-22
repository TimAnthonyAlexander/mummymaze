# SPEC_UPDATE — mechanics research vs. our implementation

Findings from a fresh pass over the original *Mummy Maze / Mummy Maze Deluxe*
(2002) mechanics, checked against what we actually ship. This is a **research +
gap-analysis document only** — nothing here is built yet. It records what the
original does, what we already match, the few genuine divergences, and the
features we correctly *do not* have (and should not add).

Confidence: **HIGH** = official ReadMe / in-game tutorial / confirmed in a solver
source; **MEDIUM** = one secondary source or strong inference; **LOW** = weak or
single mention.

Sources are listed at the bottom.

---

## 0. RESOLUTION (actioned) — 2026-07

This gap analysis has been acted on. Outcomes:

- **§2.1 collision — ADOPTED.** The engine now resolves a mummy↔scorpion
  collision with the **mummy always winning** (same-class still mover-wins), in
  `step.ts` via `isMummy`. The **entire 180-level pack was regenerated** and is
  solver-verified under this rule (guaranteed solvable).
- **§2.2 ankh — DONE.** The sidebar `Ankh` turns blood-red + pulses when
  `useHints` reports the position `unsolvable` (the dead-maze tell).
- **Wall-bump — evaluated, KEPT.** A fresh mechanics audit flagged the original
  as likely a no-op (turn not consumed). By user decision we **keep the
  wasted-turn ruling** (see SPEC §7.7); the pack is verified against it.
- **Mechanics completeness — CONFIRMED.** An independent audit re-derived the
  full ruleset from primary sources and found **no missing gameplay mechanics**;
  the only divergences were the collision rule (now fixed) and wall-bump (kept).
- **Also shipped alongside** (not from this doc): every pyramid's apex is now a
  dark level, board size ramps base→apex within each pyramid, and spawn-in /
  crash / win-exit animations were added.

The remaining sections below are the original research record, kept for provenance.

---

## 1. What we already match (no action needed)

These were verified against the code — the original's behavior and ours agree.

- **Four monster kinds, including the red scorpion.** White/red mummies (2
  steps/turn) and white/red scorpions (1 step/turn), differing only in axis
  priority (white = horizontal-first, red = vertical-first). HIGH. Our
  `MonsterKind` already has all four (`src/engine/types.ts`), and levels use all
  four. *(The research initially flagged "red scorpion" as a likely gap because
  our CLAUDE.md/SPEC prose describes scorpions loosely; the engine is fine.)*
- **Greedy chase, never retreats, priority axis with fallback.** Each step moves
  toward the player on the sign of the delta; tries the priority axis first, falls
  back to the other axis if blocked, wastes the step if both are blocked. HIGH.
  Matches `monsterStep` in `src/engine/monsters.ts`.
- **Per-step corner-turning within a 2-step move.** A mummy's two sub-steps are
  resolved one tile at a time, re-computing direction after the first — so it can
  go horizontal then vertical in a single turn. HIGH. Matches the sub-step loop in
  `src/engine/step.ts` (re-calls `monsterStep` per sub-step against the updated
  monster position).
- **Turn order:** player moves (or waits) first, then all monsters. HIGH.
- **Traps kill the player only;** monsters cross them freely. HIGH. Matches
  `step.ts` (trap check on player; monsters ignore traps).
- **Keys toggle *all* gates, triggered by *any* entity** (player, mummy, or
  scorpion) stepping onto the key tile; it's a toggle, not one-shot. Gates block
  passage like walls when closed and sit on cell edges. HIGH. Matches
  `toggleAllGates` firing for both player and monster key entries.
- **Wait / pass** is a first-class move. HIGH.
- **Undo (step-by-step) and Reset/restart.** HIGH. We have both.
- **Diagonal moves never allowed**, player or monster. HIGH.
- **Win = reach the exit/stairs; Lose = a monster shares your tile, or you step on
  a trap.** HIGH.
- **No teleporters, ice, moving walls, colored keys, pushable blocks, one-way
  tiles, coins, time limits, or extra lives** — see §4; we correctly lack these.

---

## 2. Genuine divergences (decisions to make — not yet actioned)

### 2.1 Collision survivor rule: "mover wins" vs. "mummy always beats scorpion"

- **Original (HIGH):** two **mummies** colliding → one is destroyed (a fight, one
  survivor). A **mummy + scorpion** colliding → **the mummy always wins**; the
  scorpion is knocked out, regardless of which one moved.
- **Ours (`step.ts`, documented in SPEC §2.6/§7.1):** the **moving** monster
  survives, the stationary one is destroyed — independent of kind.
- **Why it matters:** our rule lets a **scorpion destroy a mummy** if the scorpion
  is the mover. In the original that can never happen. **162 of 180 levels place
  mummies and scorpions on the same board**, so this is reachable, and it can make
  a level solvable via a lure-collision the original would never permit (or change
  which monster survives a pile-up).
- **Options:**
  1. Adopt the original rule: on a mummy↔scorpion collision the **mummy** always
     survives; keep "mover wins" only for same-class collisions. Small, local
     change in `step.ts`; then re-verify every level with the solver (par may
     shift on affected levels).
  2. Keep "mover wins" as a deliberate clean-room ruling (it's already documented
     as one) and just annotate SPEC §7.1 to note it diverges from the original on
     mixed collisions.
- **Recommendation:** adopt the original rule (option 1) — it's cheap, more
  faithful, and removes a genuinely different puzzle affordance. Gate behind a
  full solver re-verification of the pack.

### 2.2 Ankh dead-state indicator (partially present)

- **Original (HIGH):** an **ankh icon turns red when the maze has become
  unsolvable** from the current position, cueing the player to undo/reset.
- **Ours:** we already *detect* unsolvability — `useHints` runs `solveFrom` and
  exposes `unsolvable`, and `Controls` shows a red "No solution from here — undo or
  restart" caption. But our **`Ankh` component is decorative gold** (sidebar) and
  is **not wired to solvability**.
- **Gap:** wire the existing `unsolvable` signal to the ankh so it visibly turns
  red (the canonical genre tell), in addition to / instead of the text caption.
  Low effort, no engine change — purely presentational over an existing signal.
- **Recommendation:** implement; it's faithful and nearly free.

---

## 3. Design differences (intentional, not bugs — noted for the record)

- **Board sizes.** Original uses three fixed lattices: **6×6, 8×8, 10×10** (max
  10×10). HIGH. We cap at **12×12** and scale difficulty via monsters/walls/traps.
  Fine as a clean-room choice; noted so we know ≤10×10 is the canonical ceiling.
- **Modes & counts.** Original has **Adventure** (15 themed pyramids × 15 chambers
  = **225** hand-crafted levels, world-map unlock, tracks completion *time*) and
  **Classic** (endless random mazes, **scored** by difficulty + solve speed), plus
  a 3-part tutorial. There is **no separate "Puzzle" mode**. HIGH. We ship **180
  levels / 18 pyramids** (generated + curated) plus a **level editor** and
  **playtest** — a different structure. No endless/scored Classic mode exists here.
- **Par / stars.** The original has **no par-moves and no star rating** (Adventure
  = time only; Classic = points). HIGH. Our `par` is a **generator quality metric**
  (`par > manhattan`), not a canonical feature — fine to keep, just not "original."
- **Pyramid names/themes** in the original are cosmetic, escalating difficulty (e.g.
  Pharaoh's Tomb, Tomb of Nefertiti, Palace of Necho, Crypt of Khaemhat); mechanics
  are introduced *gradually across* pyramids, not gated to specific worlds.
  MEDIUM-HIGH. Our pyramid grouping is our own; no action.

---

## 4. Confirmed ABSENT in the original — do NOT add

The research explicitly checked for these and found them **not** part of Mummy
Maze. Keep them out (they'd break the clean-room "genre mechanics only" intent):

- Teleporters / portals — absent. HIGH.
- Moving / rotating walls — absent. HIGH.
- Ice / slippery tiles — absent. HIGH.
- Multiple key colors / colored doors — absent (one key toggles *all* gates). HIGH.
- Pushable blocks — absent. HIGH.
- One-way passages / directional-arrow tiles — **no Mummy Maze evidence.** One
  MobyGames blurb attributes "arrows restricting directions" to logic mazes *in
  general* (Theseus lineage), but no Mummy Maze source, walkthrough, or asset shows
  arrow tiles. Treat as NOT a feature. MEDIUM — **sources disagree; flagged.**
- In-maze coins / gems / collectibles — absent ("treasures" are per-pyramid
  completion rewards on the map, not pickups). HIGH.
- Time limits (as a fail condition) — none. HIGH.
- Extra lives — none; caught = restart the maze. HIGH.

"Caged scorpion" mazes (a scorpion penned behind gates, released when a key is
tripped) exist in the original but are **just the existing key/gate mechanic
applied to a layout** — not a new mechanic. MEDIUM. Our engine already supports
authoring these; it's a level-design pattern, not code.

---

## 5. Thin / disputed points (flagged)

1. **Multi-monster resolution order / tie-break.** No prose source states it; the
   original resolves monsters sequentially in a fixed list order and collision
   survival depends on that order. Our fixed-order sequential resolution matches
   this. MEDIUM.
2. **Directional/arrow tiles** — see §4; likely a genre generalization, not a real
   Mummy Maze tile. MEDIUM.
3. **Red scorpion** in the original is confirmed via **asset/class names**
   (`white_scorpion*` / `red_scorpion*`, separate classes) rather than prose, but
   the evidence is strong. HIGH-ish. We already implement it.

---

## 6. Suggested action list (nothing built yet)

Ordered by faithfulness-per-effort:

1. **Ankh dead-state (§2.2)** — wire existing `unsolvable` to a red ankh. No engine
   change. Low effort.
2. **Mummy-beats-scorpion collision (§2.1)** — small `step.ts` change + full solver
   re-verification of the pack (watch for par shifts). Low–medium effort.
3. **Doc-only:** annotate SPEC §7.1 with whichever collision ruling we land on, and
   record the ≤10×10 canonical board ceiling and the "no par/stars in original"
   note so future work doesn't mistake our metrics for canon.

Explicitly **not** recommended: adding any §4 mechanic.

---

## Sources

- Official ReadMe (Mac v1.1, 2002), via oldgamesdownload.com — modes, 15×15
  pyramids, axis priorities, traps, collisions, undo/reset, red ankh dead-state.
- In-game tutorial text mirror — https://maze.sourceforge.net/tutorial.html
- Solver analysis (board sizes 6/8/10, entity list) —
  https://bigheadghost.github.io/post/mummy-maze-solver/
- Solver source confirming the algorithm + white/red scorpion classes —
  https://github.com/tienpm/MummyMazeDeluxeSolver (`characters.py`, `image/`)
- MobyGames (modes, mechanics prose) —
  https://www.mobygames.com/game/41636/mummy-maze-deluxe/
- Speedrun.com forums (mummy-vs-scorpion resolution) —
  https://www.speedrun.com/mummy_maze_deluxe/forums/c1t6g
