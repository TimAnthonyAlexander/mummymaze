/**
 * BUILD-TIME level pack generator (never runs at game runtime — it only emits
 * JSON that the app imports). Loads the pure engine through Vite's
 * ssrLoadModule so the exact same solver/difficulty code the tests use also
 * drives generation.
 *
 * DIFFICULTY-RAMP DESIGN (see the difficulty-ramp change):
 *   - Levels 1–4 are HAND-AUTHORED, deliberately gentle, single-monster boards
 *     that introduce one idea at a time: slow scorpion -> longer chase ->
 *     first (fast) mummy -> mummy + a wall. They are verified with the solver
 *     but never left to chance, so the early slope is smooth and small.
 *   - Levels 5–12 are GENERATED on a rising curve, adding a second monster,
 *     then traps, then a key+gate, then more monsters / bigger boards — one
 *     new mechanic per step, difficulty strictly non-decreasing.
 *
 * NEVER-REQUIRED MERGING (hard guarantee):
 *   Every emitted level is verified BOTH `solve(level).solvable` AND
 *   `solve(level, { forbidCollisions:true }).solvable`. The monster-collision /
 *   merge trick therefore still EXISTS (players may lure monsters together) but
 *   is never the REQUIRED path. `generateLevelDetailed` already enforces this
 *   for generated levels; the hand-authored levels are single-monster (a merge
 *   is impossible) and are re-checked anyway.
 *
 * Reproducible: a seeded mulberry32 PRNG with a FIXED base seed drives all
 * randomness, so a given mode+state always yields the same pack.
 *
 * Modes:
 *   node scripts/generate-levels.mjs [generate]
 *       (Re)generate the full curated base pack (12 rising-difficulty levels),
 *       overwriting 01..12 and rewriting src/levels/index.ts.
 *
 *   node scripts/generate-levels.mjs extend <N>
 *       READ the existing src/levels/*.json pack and APPEND N new
 *       solver-verified levels (same never-required-merging guarantee) WITHOUT
 *       modifying or renumbering existing files, continuing the curve upward.
 */
import { createServer } from 'vite';
import { readFileSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LEVELS_DIR = join(__dirname, '..', 'src', 'levels');

const BASE_SEED = 0x5eed1234;

// ---- seeded PRNG (mulberry32) ---------------------------------------------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- hand-authored gentle opening (levels 1–4) -----------------------------
// Single-monster, verified gentle. Introduce one idea at a time. Pars rise
// 3 -> 4 -> 5 -> 6; difficulty scores rise in small steps. `par` is filled in
// at build time from the solver so it can never drift from the layout.
const HAND_AUTHORED = [
  {
    id: '01-first-steps',
    name: 'First Steps',
    width: 5,
    height: 5,
    start: { x: 2, y: 1 },
    exit: { x: 0, y: 1, dir: 'W' },
    monsters: [{ kind: 'scorpion_white', x: 4, y: 4 }],
  },
  {
    id: '02-slow-pursuit',
    name: 'Slow Pursuit',
    width: 5,
    height: 5,
    start: { x: 4, y: 3 },
    exit: { x: 4, y: 0, dir: 'N' },
    monsters: [{ kind: 'scorpion_red', x: 0, y: 0 }],
  },
  {
    id: '03-first-mummy',
    name: 'First Mummy',
    width: 6,
    height: 6,
    start: { x: 4, y: 3 },
    exit: { x: 5, y: 0, dir: 'N' },
    monsters: [{ kind: 'mummy_white', x: 0, y: 5 }],
  },
  {
    id: '04-the-long-wall',
    name: 'The Long Wall',
    width: 6,
    height: 6,
    start: { x: 5, y: 5 },
    exit: { x: 5, y: 0, dir: 'N' },
    walls: [
      { x: 5, y: 3, dir: 'W' },
      { x: 5, y: 2, dir: 'W' },
    ],
    monsters: [{ kind: 'mummy_red', x: 0, y: 0 }],
  },
];

// ---- generated curve (levels 5–12) -----------------------------------------
// One new mechanic per step: second monster -> traps -> key+gate -> more
// monsters / bigger boards. These are drawn (not hand-placed) but every draw is
// solver-verified solvable AND forbidCollisions-solvable, and each level's
// difficulty must strictly exceed the previous one.
const NAMES = [
  'First Steps',
  'Slow Pursuit',
  'First Mummy',
  'The Long Wall',
  'Two Hunters',
  'Trap Room',
  'Double Trouble',
  'Locked Gate',
  'Three Hunters',
  'The Gauntlet',
  'Onslaught',
  'Final Trial',
];

const GEN_SLOTS = [
  { name: 'Two Hunters', size: 6, monsters: ['scorpion_white', 'scorpion_red'], wallDensity: 0.0, traps: 0, key: false },
  { name: 'Trap Room', size: 7, monsters: ['scorpion_red', 'scorpion_white'], wallDensity: 0.04, traps: 1, key: false },
  { name: 'Double Trouble', size: 7, monsters: ['mummy_white', 'scorpion_red'], wallDensity: 0.06, traps: 2, key: false },
  { name: 'Locked Gate', size: 7, monsters: ['scorpion_white', 'scorpion_red'], wallDensity: 0.05, traps: 1, key: true },
  { name: 'Three Hunters', size: 8, monsters: ['mummy_white', 'scorpion_red', 'scorpion_white'], wallDensity: 0.06, traps: 1, key: false },
  { name: 'The Gauntlet', size: 8, monsters: ['mummy_white', 'mummy_red', 'scorpion_white'], wallDensity: 0.08, traps: 2, key: true },
  { name: 'Onslaught', size: 9, monsters: ['mummy_white', 'mummy_red', 'scorpion_white', 'scorpion_red'], wallDensity: 0.08, traps: 2, key: true },
  { name: 'Final Trial', size: 10, monsters: ['mummy_white', 'mummy_red', 'scorpion_white', 'scorpion_red'], wallDensity: 0.1, traps: 3, key: true },
];

const KIND_ROTATION = ['scorpion_white', 'mummy_white', 'mummy_red', 'scorpion_red'];

/** Build generate-options from a GEN_SLOTS entry. */
function optsFromSlot(slot, id) {
  const size = slot.size;
  return {
    id,
    name: slot.name,
    width: size,
    height: size,
    monsters: slot.monsters,
    wallDensity: slot.wallDensity,
    traps: slot.traps,
    key: slot.key,
    // Push the exit further from the start on bigger boards so later levels use
    // the space (a longer par) instead of collapsing to a short sprint.
    minStartExitDistance: Math.max(4, size - 3),
    attempts: 300,
  };
}

/**
 * Continuation curve for `extend`: keeps rising beyond the base pack (index 12,
 * 13, ...). Bigger boards, up to four monsters, traps and a key+gate.
 */
function slotOptionsFor(i, id, name) {
  const size = Math.min(11, 8 + Math.floor((i - 12) / 2)); // 8x8 -> 11x11
  const monsterCount = Math.min(4, 2 + Math.floor((i - 12) / 2));
  const monsters = [];
  for (let j = 0; j < monsterCount; j++) {
    monsters.push(KIND_ROTATION[(i + j) % KIND_ROTATION.length]);
  }
  return {
    id,
    name,
    width: size,
    height: size,
    monsters,
    wallDensity: Math.min(0.14, 0.06 + 0.01 * (i - 12)),
    traps: Math.min(4, 1 + Math.floor((i - 12) / 2)),
    key: true,
    minStartExitDistance: Math.max(3, Math.floor(size / 2)),
    attempts: 300,
  };
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ---- structural signature for dedupe --------------------------------------
function sortEdges(arr) {
  return [...(arr ?? [])]
    .map((e) => ({ x: e.x, y: e.y, dir: e.dir, ...(e.open !== undefined ? { open: e.open } : {}) }))
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}
function sortPts(arr) {
  return [...(arr ?? [])]
    .map((p) => ({ x: p.x, y: p.y }))
    .sort((a, b) => a.y - b.y || a.x - b.x);
}
function sortMonsters(arr) {
  return [...(arr ?? [])]
    .map((m) => ({ kind: m.kind, x: m.x, y: m.y }))
    .sort((a, b) => a.kind.localeCompare(b.kind) || a.y - b.y || a.x - b.x);
}
/** Layout signature ignoring id/name/par. */
function signature(spec) {
  return JSON.stringify({
    w: spec.width,
    h: spec.height,
    start: spec.start,
    exit: spec.exit,
    walls: sortEdges(spec.walls),
    gates: sortEdges(spec.gates),
    keys: sortPts(spec.keys),
    traps: sortPts(spec.traps),
    monsters: sortMonsters(spec.monsters),
  });
}

// ---- file helpers ----------------------------------------------------------
function existingLevelFiles() {
  return readdirSync(LEVELS_DIR)
    .filter((f) => /^\d+-.*\.json$/.test(f))
    .sort();
}

function identifierFor(file) {
  return 'lvl_' + file.replace(/\.json$/, '').replace(/[^a-zA-Z0-9]/g, '_');
}

function rewriteIndex() {
  const files = existingLevelFiles();
  const imports = files
    .map((f) => `import ${identifierFor(f)} from './${f}';`)
    .join('\n');
  const arr = files.map((f) => `  ${identifierFor(f)} as LevelSpec,`).join('\n');
  const content = `/**
 * Level registry. AUTO-GENERATED by scripts/generate-levels.mjs — do not edit by
 * hand; re-run the generator (generate / extend) to change the pack.
 * Every level here is verified solvable by the exact BFS solver at build time,
 * and solvable WITHOUT any monster merge (forbidCollisions), so the collision
 * trick is never required.
 */
import { loadLevel, type Level, type LevelSpec } from '../engine';
${imports}

const SPECS: LevelSpec[] = [
${arr}
];

/** Validated, runtime-ready levels in play order. */
export const LEVELS: Level[] = SPECS.map(loadLevel);

export function getLevel(id: string): Level | undefined {
  return LEVELS.find((l) => l.id === id);
}

export function getLevelIndex(id: string): number {
  return LEVELS.findIndex((l) => l.id === id);
}

export function nextLevelId(id: string): string | undefined {
  const i = getLevelIndex(id);
  return i >= 0 && i < LEVELS.length - 1 ? LEVELS[i + 1].id : undefined;
}
`;
  writeFileSync(join(LEVELS_DIR, 'index.ts'), content);
}

function writeSpec(numStr, spec) {
  const file = `${numStr}-${slugify(spec.name)}.json`;
  writeFileSync(join(LEVELS_DIR, file), JSON.stringify(spec, null, 2) + '\n');
  return file;
}

// ---- solver-verified checks ------------------------------------------------
/** True iff the level is solvable but ONLY via a monster merge. */
function mergeRequired(eng, level) {
  const r = eng.solve(level);
  if (!r.solvable) return false;
  const nm = eng.solve(level, { forbidCollisions: true });
  return !nm.solvable;
}

/**
 * Fully validate + score a finished spec: must be solvable, forbidCollisions-
 * solvable (never-required merging), and its recorded par must equal the
 * shortest (unconstrained) solution length. Returns { level, par, difficulty,
 * mergeReq } or throws with a clear message.
 */
function finalize(eng, spec) {
  const level = eng.loadLevel(spec);
  const r = eng.solve(level);
  if (!r.solvable) throw new Error(`level "${spec.id}" is not solvable`);
  const nm = eng.solve(level, { forbidCollisions: true });
  if (!nm.solvable) {
    throw new Error(`level "${spec.id}" REQUIRES a monster merge (forbidCollisions unsolvable)`);
  }
  const difficulty = eng.scoreDifficulty(level);
  return {
    level,
    par: r.solution.length,
    difficulty,
    mergeReq: false, // proven above
  };
}

// ---- candidate generation --------------------------------------------------
/**
 * Draw a rising-difficulty generated level for one slot. Pools several
 * candidates (each generateLevelDetailed call runs many internal attempts, and
 * already enforces solvable + forbidCollisions-solvable) and returns the
 * GENTLEST candidate whose difficulty still strictly exceeds `prevDiff` — i.e.
 * the smallest rising step — so the ramp climbs in small increments rather than
 * spiking to the hardest layout the slot happens to allow. Falls back to the
 * hardest candidate found (for the escalation loop) when none beats `prevDiff`.
 */
function drawSlot(eng, opts, rng, prevDiff, existingSignatures) {
  let hardest = null; // fallback for escalation when nothing rises
  let gentlestAbove = null; // smallest score strictly above prevDiff
  const POOL = 16;
  for (let k = 0; k < POOL; k++) {
    const cand = eng.generateLevelDetailed({ ...opts, minDifficulty: -Infinity }, rng);
    if (!cand) continue;
    if (existingSignatures.has(signature(cand.spec))) continue; // structural dup
    const s = cand.difficulty.score;
    if (hardest === null || s > hardest.difficulty.score) hardest = cand;
    if (s > prevDiff && (gentlestAbove === null || s < gentlestAbove.difficulty.score)) {
      gentlestAbove = cand;
    }
  }
  return gentlestAbove ?? hardest;
}

/**
 * Draw until we get a non-duplicate, forbidCollisions-solvable level whose score
 * strictly exceeds `prevDiff`. Escalates wall/trap density between rounds so a
 * slot that struggles to out-rank the previous level can still find a harder
 * layout. Returns the GeneratedLevel or null after the round budget.
 */
function drawRising(eng, baseOpts, rng, prevDiff, existingSignatures) {
  let opts = { ...baseOpts };
  for (let round = 0; round < 10; round++) {
    const cand = drawSlot(eng, opts, rng, prevDiff, existingSignatures);
    if (cand && cand.difficulty.score > prevDiff) return cand;
    // Escalate complexity mildly and try again.
    opts = {
      ...opts,
      wallDensity: Math.min(0.2, (opts.wallDensity ?? 0) + 0.02),
      traps: (opts.traps ?? 0) + 1,
    };
  }
  return null;
}

function fmtRow(cols, widths) {
  return cols.map((c, i) => String(c).padEnd(widths[i])).join('  ');
}

function monsterSummary(spec) {
  const kinds = (spec.monsters ?? []).map((m) => m.kind);
  const short = kinds
    .map((k) => k.replace('mummy_', 'M-').replace('scorpion_', 'S-').replace('white', 'w').replace('red', 'r'))
    .join(',');
  return `${kinds.length}:${short || '-'}`;
}

// ---- main ------------------------------------------------------------------
async function main() {
  const mode = process.argv[2] ?? 'generate';
  const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
  try {
    const eng = await server.ssrLoadModule('/src/engine/index.ts');

    if (mode === 'generate') {
      await runGenerate(eng);
    } else if (mode === 'extend') {
      const n = parseInt(process.argv[3] ?? '0', 10);
      if (!Number.isInteger(n) || n <= 0) {
        throw new Error('extend mode requires a positive count, e.g. `extend 50`');
      }
      await runExtend(eng, n);
    } else {
      throw new Error(`unknown mode "${mode}" (use "generate" or "extend")`);
    }
  } finally {
    await server.close();
  }
}

async function runGenerate(eng) {
  // Full (re)generation replaces the curated pack: remove any prior level files
  // so stale slugs don't linger and duplicate numbers in the index.
  for (const f of existingLevelFiles()) rmSync(join(LEVELS_DIR, f));

  const rng = mulberry32(BASE_SEED);
  const existingSignatures = new Set();
  const rows = [];
  let prevDiff = -Infinity;

  // --- Levels 1–4: hand-authored gentle opening ---
  let slotNum = 0;
  for (const base of HAND_AUTHORED) {
    slotNum++;
    const num = String(slotNum).padStart(2, '0');
    const { level, par, difficulty, mergeReq } = finalize(eng, base);
    if (difficulty.score < prevDiff) {
      throw new Error(
        `hand-authored "${base.id}" difficulty ${difficulty.score} < previous ${prevDiff} (fix the layout)`,
      );
    }
    const spec = { ...base, par };
    existingSignatures.add(signature(spec));
    const file = writeSpec(num, spec);
    prevDiff = difficulty.score;
    rows.push(rowFor(spec, par, difficulty, mergeReq, file, level));
  }

  // --- Levels 5–12: generated rising curve ---
  for (const slot of GEN_SLOTS) {
    slotNum++;
    const num = String(slotNum).padStart(2, '0');
    const id = `${num}-${slugify(slot.name)}`;
    const opts = optsFromSlot(slot, id);

    const cand = drawRising(eng, opts, rng, prevDiff, existingSignatures);
    if (!cand) throw new Error(`failed to generate a rising level for slot ${num} (${slot.name})`);

    const spec = { ...cand.spec, id, name: slot.name };
    const { level, par, difficulty, mergeReq } = finalize(eng, spec);
    const finalSpec = { ...spec, par };
    existingSignatures.add(signature(finalSpec));
    const file = writeSpec(num, finalSpec);
    prevDiff = difficulty.score;
    rows.push(rowFor(finalSpec, par, difficulty, mergeReq, file, level));
  }

  rewriteIndex();
  printTable('Generated base pack (never-required merging)', rows);

  const anyMerge = rows.some((r) => r.mergeReq);
  if (anyMerge) throw new Error('a level requires merging — this must never happen');
}

async function runExtend(eng, count) {
  const files = existingLevelFiles();
  if (files.length === 0) throw new Error('no existing pack to extend; run `generate` first');

  // Load existing specs; build signatures and find current difficulty ceiling.
  const existingSignatures = new Set();
  let maxNum = 0;
  let ceilingDiff = -Infinity;
  for (const f of files) {
    const spec = JSON.parse(readFileSync(join(LEVELS_DIR, f), 'utf8'));
    existingSignatures.add(signature(spec));
    const m = f.match(/^(\d+)-/);
    if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
    try {
      const lvl = eng.loadLevel(spec);
      const d = eng.scoreDifficulty(lvl);
      if (d.breakdown.solvable) ceilingDiff = Math.max(ceilingDiff, d.score);
    } catch {
      /* ignore unscoreable legacy level */
    }
  }
  if (!Number.isFinite(ceilingDiff)) ceilingDiff = 0;

  // Seed derived from existing pack size so appended levels differ from the base
  // pack and each extend run is reproducible for the current pack state.
  const seed = (BASE_SEED ^ Math.imul(files.length, 0x9e3779b1)) >>> 0;
  const rng = mulberry32(seed);

  const rows = [];
  let prevDiff = ceilingDiff;
  let produced = 0;
  // Continue the global curve index from where the base curve conceptually ends.
  let curveIndex = Math.max(files.length, HAND_AUTHORED.length + GEN_SLOTS.length);

  while (produced < count) {
    const num = String(maxNum + 1 + produced).padStart(2, '0');
    const name = `Trial ${maxNum + 1 + produced}`;
    const id = `${num}-${slugify(name)}`;
    const opts = slotOptionsFor(curveIndex, id, name);

    const cand = drawRising(eng, opts, rng, prevDiff, existingSignatures);
    curveIndex++;
    if (!cand) {
      if (curveIndex - (maxNum + 1 + produced) > 40) {
        throw new Error(`extend: exhausted attempts producing level ${num}`);
      }
      continue;
    }

    const spec = { ...cand.spec, id, name };
    const { level, par, difficulty, mergeReq } = finalize(eng, spec);
    const finalSpec = { ...spec, par };
    existingSignatures.add(signature(finalSpec));
    const file = writeSpec(num, finalSpec);
    prevDiff = difficulty.score;
    produced++;
    rows.push(rowFor(finalSpec, par, difficulty, mergeReq, file, level));
  }

  rewriteIndex();
  printTable(`Appended ${count} level(s) (existing top difficulty ${ceilingDiff.toFixed(2)})`, rows);

  const anyMerge = rows.some((r) => r.mergeReq);
  if (anyMerge) throw new Error('an appended level requires merging — this must never happen');
}

function rowFor(spec, par, difficulty, mergeReq, file, _level) {
  return {
    id: spec.id,
    size: `${spec.width}x${spec.height}`,
    monsters: monsterSummary(spec),
    par,
    score: difficulty.score,
    forced: difficulty.breakdown.forcedMoveFraction.toFixed(3),
    mergeReq,
    file,
  };
}

function printTable(title, rows) {
  const header = ['#', 'id', 'size', 'monsters', 'par', 'score', 'forced', 'mergeReq'];
  const body = rows.map((r, i) => [
    String(i + 1),
    r.id,
    r.size,
    r.monsters,
    String(r.par),
    String(r.score),
    r.forced,
    String(r.mergeReq),
  ]);
  const all = [header, ...body];
  const widths = header.map((_, c) => Math.max(...all.map((row) => row[c].length)));
  console.log(`\n${title}:\n`);
  console.log(fmtRow(header, widths));
  console.log(widths.map((w) => '-'.repeat(w)).join('  '));
  for (const row of body) console.log(fmtRow(row, widths));
  console.log('');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
