/**
 * BUILD-TIME level-pack generator (never runs at game runtime — it only emits
 * JSON that the app imports). Loads the pure engine through Vite's
 * ssrLoadModule so the exact same solver / difficulty / curriculum-filter code
 * the tests use also drives generation.
 *
 * CURRICULUM DESIGN (the point of this generator)
 * ------------------------------------------------
 * Early levels must not be trivial "the enemy idles in a far corner while you
 * stroll to the exit" boards. Every teaching level puts the enemy CLOSE and
 * threatening and forces the player to USE the mechanic it teaches. Two
 * machine-checkable QUALITY FILTERS (implemented in src/engine/generator.ts and
 * shared with the tests) enforce this:
 *
 *   1. BEELINE (anti-trivial): a greedy player walks a fixed shortest path from
 *      start to the exit IGNORING enemies. For every level from #3 (index >= 2)
 *      that naive walk MUST LOSE (caught / trap / gate-blocked). If beelining
 *      wins, the level is trivial and is rejected. Level 1 tolerates a beeline
 *      win only if a monster came within one tile during the walk; level 2 must
 *      also defeat the beeliner.
 *   2. THREAT PROXIMITY: the nearest enemy must start close (short open-edge
 *      path, <= ceil(maxDim/2)) OR sit on the beeline path. No far-corner idlers.
 *
 *   Plus: every level is solver-verified solvable and `par > manhattan(start,
 *   exit)` (real maneuvering, not a straight shot).
 *
 * MERGE POLICY
 * ------------
 * Luring two monsters onto one tile destroys one (a "merge"). Merging is never
 * REQUIRED for levels 1-6 (they are verified solvable WITHOUT any merge via
 * `forbidCollisions`). From level 7 ("Collision") on, a merge MAY be required —
 * that level teaches merging as a weapon — so forbidCollisions is not enforced
 * there. `curriculumFailures(level, index, requireForbid)` encodes this: the
 * generator passes `requireForbid = index < 6`.
 *
 * STRUCTURE
 * ---------
 *   Levels 1-9  : HAND-AUTHORED teaching puzzles, one new idea at a time
 *                 (fast mummy juke -> wall -> trap -> red mummy -> combine ->
 *                 two hunters to evade -> merge -> scorpion -> key+gate). Their
 *                 coordinates were found by searching for layouts that pass all
 *                 filters, then frozen here. `par` is filled from the solver at
 *                 build time so it can never drift from the layout.
 *   Levels 10-12: GENERATED combinations on bigger boards (more hunters, traps,
 *                 a key+gate), each drawn until it passes the SAME curriculum
 *                 filters. Merge allowed (index >= 6).
 *
 * Reproducible: a seeded mulberry32 PRNG with a FIXED base seed drives all
 * generated randomness, so a given mode+state always yields the same pack.
 *
 * Modes:
 *   node scripts/generate-levels.mjs [generate]
 *       (Re)generate the full curriculum pack, overwriting the level files and
 *       rewriting src/levels/index.ts.
 *
 *   node scripts/generate-levels.mjs extend <N>
 *       READ the existing pack and APPEND N new curriculum-filter-passing levels
 *       (bigger boards, merge allowed) WITHOUT renumbering existing files.
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

// ===========================================================================
// HAND-AUTHORED CURRICULUM (levels 1-9)
//
// Each entry teaches exactly ONE new idea. Coordinates were found by searching
// for layouts that pass the curriculum filters (beeline-loss + proximity +
// solvable + par>manhattan, and no-merge for 1-6) and then frozen. `par` is
// filled from the solver at build time. `mechanic` documents the lesson.
// ===========================================================================
const CURRICULUM = [
  {
    id: '01-the-chase',
    name: 'The Chase',
    mechanic: 'A white mummy moves TWICE per turn but is predictable — juke it against the border instead of outrunning it',
    width: 6,
    height: 6,
    start: { x: 0, y: 4 },
    exit: { x: 1, y: 5, dir: 'S' },
    monsters: [{ kind: 'mummy_white', x: 1, y: 2 }],
  },
  {
    id: '02-broken-line',
    name: 'Broken Line',
    mechanic: 'A wall breaks the mummy pursuit — it wastes a step when the wall blocks its greedy move',
    width: 6,
    height: 6,
    start: { x: 2, y: 2 },
    exit: { x: 4, y: 0, dir: 'N' },
    walls: [{ x: 3, y: 3, dir: 'S' }],
    monsters: [{ kind: 'mummy_white', x: 1, y: 4 }],
  },
  {
    id: '03-spikes',
    name: 'Spikes',
    mechanic: 'A trap tile is lethal to YOU (not monsters) — route around it while being chased',
    width: 6,
    height: 6,
    start: { x: 4, y: 3 },
    exit: { x: 5, y: 4, dir: 'E' },
    traps: [{ x: 5, y: 3 }],
    monsters: [{ kind: 'mummy_white', x: 5, y: 1 }],
  },
  {
    id: '04-the-other-way',
    name: 'The Other Way',
    mechanic: 'A RED mummy prioritises VERTICAL first — the opposite axis, so it juke differently from a white one',
    width: 6,
    height: 6,
    start: { x: 3, y: 1 },
    exit: { x: 2, y: 0, dir: 'N' },
    monsters: [{ kind: 'mummy_red', x: 5, y: 0 }],
  },
  {
    id: '05-red-corridor',
    name: 'Red Corridor',
    mechanic: 'Combine it: a close red mummy, walls, and a trap all at once',
    width: 7,
    height: 7,
    start: { x: 3, y: 3 },
    exit: { x: 4, y: 6, dir: 'S' },
    walls: [
      { x: 4, y: 4, dir: 'E' },
      { x: 2, y: 5, dir: 'E' },
    ],
    traps: [{ x: 4, y: 1 }],
    monsters: [{ kind: 'mummy_red', x: 2, y: 2 }],
  },
  {
    id: '06-two-hunters',
    name: 'Two Hunters',
    mechanic: 'Two mummies to EVADE at once — solvable without ever letting them merge (juggle both greedy chasers)',
    width: 7,
    height: 7,
    start: { x: 5, y: 4 },
    exit: { x: 6, y: 6, dir: 'E' },
    monsters: [
      { kind: 'mummy_white', x: 6, y: 1 },
      { kind: 'mummy_white', x: 1, y: 0 },
    ],
  },
  {
    id: '07-collision',
    name: 'Collision',
    mechanic: 'Merging is now a WEAPON — lure the two mummies onto one tile to destroy one (a merge is required here)',
    width: 6,
    height: 6,
    start: { x: 0, y: 3 },
    exit: { x: 2, y: 5, dir: 'S' },
    monsters: [
      { kind: 'mummy_white', x: 4, y: 2 },
      { kind: 'mummy_white', x: 0, y: 0 },
    ],
  },
  {
    id: '08-scavenger',
    name: 'Scavenger',
    mechanic: 'A slow SCORPION (1 step/turn) hunts alongside a fast mummy — different speeds to out-time',
    width: 7,
    height: 7,
    start: { x: 6, y: 3 },
    exit: { x: 5, y: 0, dir: 'N' },
    walls: [
      { x: 6, y: 5, dir: 'S' },
      { x: 1, y: 1, dir: 'S' },
    ],
    monsters: [
      { kind: 'mummy_white', x: 0, y: 5 },
      { kind: 'scorpion_red', x: 4, y: 2 },
    ],
  },
  {
    id: '09-lock-and-key',
    name: 'Lock & Key',
    mechanic: 'A closed GATE blocks the exit; step on the KEY to open it — the exit is unreachable otherwise',
    width: 6,
    height: 6,
    start: { x: 1, y: 1 },
    exit: { x: 0, y: 0, dir: 'N' },
    walls: [{ x: 0, y: 0, dir: 'E' }],
    gates: [{ x: 0, y: 0, dir: 'S', open: false }],
    keys: [{ x: 0, y: 1 }],
    monsters: [{ kind: 'mummy_white', x: 3, y: 1 }],
  },
];

// ===========================================================================
// GENERATED TAIL (levels 10-12): combinations on bigger boards. Each is drawn
// until it passes the SAME curriculum filters. Merge allowed (index >= 6).
// ===========================================================================
const GEN_SLOTS = [
  {
    name: 'Ambush',
    mechanic: 'Mummy + scorpion + a trap and a key on a bigger board',
    size: 8,
    monsters: ['mummy_white', 'scorpion_red'],
    wallDensity: 0.06,
    traps: 1,
    key: true,
  },
  {
    name: 'The Warren',
    mechanic: 'Three hunters, walls, two traps and a key',
    size: 8,
    monsters: ['mummy_white', 'mummy_red', 'scorpion_white'],
    wallDensity: 0.06,
    traps: 2,
    key: true,
  },
  {
    name: 'Final Trial',
    mechanic: 'Everything at once: three hunters, walls, traps and a key on the largest board',
    size: 9,
    monsters: ['mummy_white', 'mummy_red', 'scorpion_red'],
    wallDensity: 0.08,
    traps: 2,
    key: true,
  },
];

const KIND_ROTATION = ['scorpion_white', 'mummy_white', 'mummy_red', 'scorpion_red'];

/** Should this level index be verified solvable WITHOUT any merge? (levels 1-6) */
function requiresForbid(index) {
  return index < 6;
}

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
    // Keep the exit only mildly distant so par does not balloon; enemy CLOSENESS
    // is enforced by the proximity filter, not by pushing the exit away.
    minStartExitDistance: 2,
    attempts: 60,
  };
}

// ===========================================================================
// TIER MODEL for the extended pack (pyramids 3..20 = levels 21..200)
//
// The pack is organised into 20 difficulty TIERS, one per pyramid of 10 levels.
// Pyramids 1-2 are the hand-authored + first generated content; pyramids 3..20
// are grown here. Two design rules the tier model encodes:
//
//   * Boards stay SMALL (<= 12). Difficulty rises via MORE walls / traps / keys
//     / monsters, NEVER via ever-larger boards. Walls in particular raise the
//     "tension" (forced-move fraction) and par while SHRINKING the reachable
//     state space — so they make levels harder AND faster to solve.
//   * Difficulty rises GENTLY. Each tier gets a target difficulty WINDOW that
//     drifts up per pyramid; inside a pyramid the 10 levels climb base->apex.
//     The window (never the solvable/beeline/proximity invariants) is what gets
//     relaxed if a tier is hard to fill, so generation always completes.
// ===========================================================================

/** Solver/difficulty state budget for generated levels: cap-hits are rejected. */
const EXTEND_CAP = 250_000;
/** Difficulty floor for every generated level (keeps them above pyramid 1). */
const EXTEND_FLOOR = 30;

/**
 * Tier plan for a 0-based global play index (>= 20 for pyramid 3+). Returns the
 * board/monster/hazard parameters plus the target difficulty window centre.
 */
function tierPlan(idx) {
  const pyramid = Math.floor(idx / 10) + 1; // 3..20
  const pos = idx % 10; // 0 (base) .. 9 (apex)
  const t = pyramid;

  // Boards grow GENTLY and stay capped at 12 (mostly 8..11).
  const size = Math.min(12, 8 + Math.floor((t - 3) / 3)); // t3:8 .. t12:11 .. t15:12

  // Monsters rise gently, capped at 5.
  const monsterCount = Math.min(5, 3 + Math.floor((t - 3) / 4)); // t3:3 t7:4 t11:5
  const monsters = [];
  for (let j = 0; j < monsterCount; j++) {
    monsters.push(KIND_ROTATION[(idx + j) % KIND_ROTATION.length]);
  }

  // Primary difficulty levers: walls + traps + a key/gate (fast, high-tension).
  const wallDensity = Math.min(0.16, 0.08 + 0.005 * (t - 3) + 0.004 * pos);
  const traps = Math.min(5, 1 + Math.floor((t - 3) / 3) + Math.floor(pos / 5));

  // Gently rising difficulty window: base drifts +1.1/tier, +~0.67/step inside.
  const center = 40 + (t - 3) * 1.1 + pos * (6 / 9);

  return { pyramid, pos, size, monsters, wallDensity, traps, center };
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
function levelFileNumber(f) {
  const m = f.match(/^(\d+)-/);
  return m ? parseInt(m[1], 10) : Number.MAX_SAFE_INTEGER;
}

/**
 * Level files in PLAY order. Sorted NUMERICALLY by their leading number — a
 * plain lexical sort would place "100-" before "18-" once the pack passes 99
 * levels, scrambling play/pyramid order.
 */
function existingLevelFiles() {
  return readdirSync(LEVELS_DIR)
    .filter((f) => /^\d+-.*\.json$/.test(f))
    .sort((a, b) => levelFileNumber(a) - levelFileNumber(b) || a.localeCompare(b));
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
 * Every level here is verified at build time to be solvable by the exact BFS
 * solver AND to pass the curriculum quality filters: the naive "beeline" player
 * loses (levels >= #3), the nearest enemy starts close, and par exceeds the
 * straight-line distance. Levels 1-6 are additionally solvable WITHOUT any
 * monster merge; from level 7 a merge may be part of the intended solution.
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

// ---- curriculum validation -------------------------------------------------
/**
 * Fully validate a finished spec at play `index`: load it, run every curriculum
 * filter, and throw with a clear message if any fails. Returns
 * { level, par, difficulty, check }.
 */
function finalize(eng, gen, spec, index) {
  const level = eng.loadLevel(spec);
  const fails = gen.curriculumFailures(level, index, requiresForbid(index));
  if (fails.length) {
    throw new Error(`level "${spec.id}" (index ${index}) fails curriculum filters: ${fails.join('; ')}`);
  }
  const r = eng.solve(level);
  const difficulty = eng.scoreDifficulty(level);
  const check = gen.curriculumCheck(level);
  return { level, par: r.solution.length, difficulty, check };
}

// ---- generated-tail drawing ------------------------------------------------
/**
 * Draw generated candidates for one slot and keep the GENTLEST that (a) passes
 * every curriculum filter at `index` and (b) scores strictly above `prevDiff`
 * (so the tail keeps rising). Falls back to the hardest passing candidate. If
 * nothing passes, escalates wall/trap density and retries.
 */
function drawCurriculumRising(eng, gen, baseOpts, index, rng, prevDiff, existingSignatures) {
  let opts = { ...baseOpts };
  for (let round = 0; round < 12; round++) {
    let hardest = null;
    let gentlestAbove = null;
    const POOL = 40;
    for (let k = 0; k < POOL; k++) {
      const cand = gen.generateLevelDetailed({ ...opts, minDifficulty: -Infinity }, rng);
      if (!cand) continue;
      if (existingSignatures.has(signature(cand.spec))) continue;
      if (gen.curriculumFailures(cand.level, index, requiresForbid(index)).length) continue;
      const s = cand.difficulty.score;
      if (hardest === null || s > hardest.difficulty.score) hardest = cand;
      if (s > prevDiff && (gentlestAbove === null || s < gentlestAbove.difficulty.score)) {
        gentlestAbove = cand;
      }
    }
    if (gentlestAbove) return gentlestAbove;
    if (hardest) return hardest; // rising not achievable but a valid level exists
    // Nothing passed at all: make the board busier and retry.
    opts = {
      ...opts,
      wallDensity: Math.min(0.2, (opts.wallDensity ?? 0) + 0.02),
      traps: (opts.traps ?? 0) + 1,
    };
  }
  return null;
}

/**
 * Draw a level for `idx` matching its tier plan. Pulls a POOL of curriculum-
 * passing candidates (cap-hits already rejected inside generateLevelDetailed),
 * keeps the one CLOSEST to the tier's target difficulty within a widening band,
 * and relaxes ONLY the difficulty window (never the invariants) if a tier is
 * hard to fill. Guaranteed to return a curriculum-passing level (above the
 * floor) or null only if the board genuinely cannot host one.
 */
function drawTierLevel(eng, gen, idx, plan, id, name, rng, existingSignatures) {
  const opts = {
    id,
    name,
    width: plan.size,
    height: plan.size,
    monsters: plan.monsters,
    wallDensity: plan.wallDensity,
    traps: plan.traps,
    key: true,
    minStartExitDistance: 2,
    attempts: 90,
    cap: EXTEND_CAP,
    // Advanced levels: a merge MAY be required, so do not force forbid-solvable.
    requireForbidSolvable: false,
    minDifficulty: -Infinity,
    maxDifficulty: Infinity,
  };
  const POOL = 26;
  let band = 5;
  let cur = { ...opts };
  let fallback = null; // closest curriculum-passing candidate >= floor (any band)
  let fallbackDelta = Infinity;

  for (let round = 0; round < 9; round++) {
    let best = null;
    let bestDelta = Infinity;
    for (let k = 0; k < POOL; k++) {
      const cand = gen.generateLevelDetailed(cur, rng);
      if (!cand) continue;
      if (existingSignatures.has(signature(cand.spec))) continue;
      if (gen.curriculumFailures(cand.level, idx, false).length) continue;
      const s = cand.difficulty.score;
      if (s < EXTEND_FLOOR) continue;
      const delta = Math.abs(s - plan.center);
      if (delta < fallbackDelta) {
        fallback = cand;
        fallbackDelta = delta;
      }
      if (s >= plan.center - band && s <= plan.center + band && delta < bestDelta) {
        best = cand;
        bestDelta = delta;
      }
    }
    if (best) return best;
    // Relax the WINDOW (widen the band) and make the board a touch busier so a
    // higher-difficulty candidate becomes reachable. Invariants stay untouched.
    band += 4;
    cur = {
      ...cur,
      wallDensity: Math.min(0.2, (cur.wallDensity ?? 0) + 0.008),
      traps: (cur.traps ?? 0) + 1,
    };
  }
  return fallback;
}

// ---- reporting -------------------------------------------------------------
function monsterSummary(spec) {
  const kinds = (spec.monsters ?? []).map((m) => m.kind);
  const short = kinds
    .map((k) => k.replace('mummy_', 'M-').replace('scorpion_', 'S-').replace('white', 'w').replace('red', 'r'))
    .join(',');
  return `${kinds.length}:${short || '-'}`;
}

function rowFor(index, spec, par, difficulty, check, mechanic) {
  const b = check.beeline;
  const beelineResult = b.win ? 'WIN' : `loss:${b.reason}`;
  return {
    idx: index + 1,
    id: spec.id,
    size: `${spec.width}x${spec.height}`,
    monsters: monsterSummary(spec),
    par,
    manhattan: check.manhattan,
    beeline: beelineResult,
    nearest: check.nearestMonsterDist === Infinity ? '-' : String(check.nearestMonsterDist),
    mergeReq: check.mergeRequired,
    score: difficulty.score,
    mechanic,
  };
}

function fmtRow(cols, widths) {
  return cols.map((c, i) => String(c).padEnd(widths[i])).join('  ');
}

function printTable(title, rows) {
  const header = ['#', 'id', 'size', 'monsters', 'par', 'manh', 'beeline', 'near', 'mergeReq', 'score', 'mechanic'];
  const body = rows.map((r) => [
    String(r.idx),
    r.id,
    r.size,
    r.monsters,
    String(r.par),
    String(r.manhattan),
    r.beeline,
    r.nearest,
    String(r.mergeReq),
    String(r.score),
    r.mechanic,
  ]);
  const all = [header, ...body];
  const widths = header.map((_, c) => Math.max(...all.map((row) => row[c].length)));
  console.log(`\n${title}:\n`);
  console.log(fmtRow(header, widths));
  console.log(widths.map((w) => '-'.repeat(w)).join('  '));
  for (const row of body) console.log(fmtRow(row, widths));
  console.log('');
}

/** Assert the curriculum invariants across the whole pack; throw on violation. */
function assertPackInvariants(rows) {
  for (const r of rows) {
    const idx0 = r.idx - 1;
    if (idx0 >= 2 && r.beeline === 'WIN') {
      throw new Error(`level #${r.idx} (${r.id}) is trivial: the beeline player WINS`);
    }
    if (idx0 <= 5 && r.mergeReq) {
      throw new Error(`level #${r.idx} (${r.id}) REQUIRES a merge but must not (index <= 5)`);
    }
  }
}

// ---- main ------------------------------------------------------------------
async function main() {
  const mode = process.argv[2] ?? 'generate';

  // `reindex` only rewrites src/levels/index.ts from the files already on disk
  // (numeric play order). Pure fs — no engine/vite needed.
  if (mode === 'reindex') {
    rewriteIndex();
    const files = existingLevelFiles();
    console.log(`reindexed ${files.length} level(s): ${files[0]} … ${files[files.length - 1]}`);
    return;
  }

  const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
  try {
    const eng = await server.ssrLoadModule('/src/engine/index.ts');
    const gen = await server.ssrLoadModule('/src/engine/generator.ts');

    if (mode === 'generate') {
      await runGenerate(eng, gen);
    } else if (mode === 'extend') {
      const n = parseInt(process.argv[3] ?? '0', 10);
      if (!Number.isInteger(n) || n <= 0) {
        throw new Error('extend mode requires a positive count, e.g. `extend 50`');
      }
      await runExtend(eng, gen, n);
    } else {
      throw new Error(`unknown mode "${mode}" (use "generate" or "extend")`);
    }
  } finally {
    await server.close();
  }
}

async function runGenerate(eng, gen) {
  // Full (re)generation replaces the pack: remove prior level files so stale
  // slugs don't linger and duplicate numbers in the index.
  for (const f of existingLevelFiles()) rmSync(join(LEVELS_DIR, f));

  const rng = mulberry32(BASE_SEED);
  const existingSignatures = new Set();
  const rows = [];
  let index = 0;
  let prevDiff = -Infinity;

  // --- Levels 1-9: hand-authored teaching puzzles ---
  for (const base of CURRICULUM) {
    const num = String(index + 1).padStart(2, '0');
    const { par, difficulty, check } = finalize(eng, gen, base, index);
    const spec = { ...base };
    delete spec.mechanic;
    const finalSpec = { ...spec, par };
    existingSignatures.add(signature(finalSpec));
    writeSpec(num, finalSpec);
    rows.push(rowFor(index, finalSpec, par, difficulty, check, base.mechanic));
    prevDiff = Math.max(prevDiff, difficulty.score);
    index++;
  }

  // --- Levels 10-12: generated combinations (curriculum-filtered) ---
  for (const slot of GEN_SLOTS) {
    const num = String(index + 1).padStart(2, '0');
    const id = `${num}-${slugify(slot.name)}`;
    const opts = optsFromSlot(slot, id);

    const cand = drawCurriculumRising(eng, gen, opts, index, rng, prevDiff, existingSignatures);
    if (!cand) throw new Error(`failed to generate a curriculum-passing level for slot ${num} (${slot.name})`);

    const spec = { ...cand.spec, id, name: slot.name };
    const { par, difficulty, check } = finalize(eng, gen, spec, index);
    const finalSpec = { ...spec, par };
    existingSignatures.add(signature(finalSpec));
    writeSpec(num, finalSpec);
    rows.push(rowFor(index, finalSpec, par, difficulty, check, slot.mechanic));
    prevDiff = Math.max(prevDiff, difficulty.score);
    index++;
  }

  rewriteIndex();
  printTable('Curriculum pack (beeline-verified non-trivial, enemies close)', rows);
  assertPackInvariants(rows);
}

async function runExtend(eng, gen, count) {
  const files = existingLevelFiles();
  if (files.length === 0) throw new Error('no existing pack to extend; run `generate` first');

  const existingSignatures = new Set();
  let maxNum = 0;
  for (const f of files) {
    const spec = JSON.parse(readFileSync(join(LEVELS_DIR, f), 'utf8'));
    existingSignatures.add(signature(spec));
    const m = f.match(/^(\d+)-/);
    if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
  }

  const seed = (BASE_SEED ^ Math.imul(files.length, 0x9e3779b1)) >>> 0;
  const rng = mulberry32(seed);

  // Quiet the solver's per-cap-hit warning; cap-hits are EXPECTED and handled
  // (a capped search is treated as unsolvable and the candidate is rejected).
  const realWarn = console.warn;
  console.warn = () => {};

  const rows = [];
  let produced = 0;
  const t0 = Date.now();
  let curPyramid = 0;
  const perPyramid = new Map(); // pyramid -> { min, max, count }

  try {
    while (produced < count) {
      const levelIndex = maxNum + produced; // 0-based play index of the new level
      const num = String(maxNum + 1 + produced).padStart(2, '0');
      const name = `Trial ${maxNum + 1 + produced}`;
      const id = `${num}-${slugify(name)}`;
      const plan = tierPlan(levelIndex);

      if (plan.pyramid !== curPyramid) {
        curPyramid = plan.pyramid;
        realWarn(
          `  pyramid ${String(curPyramid).padStart(2)} (tier ${curPyramid}) — ` +
            `board ${plan.size}x${plan.size}, ${plan.monsters.length} monsters, ` +
            `target≈${plan.center.toFixed(1)} …`,
        );
      }

      const cand = drawTierLevel(eng, gen, levelIndex, plan, id, name, rng, existingSignatures);
      if (!cand) {
        throw new Error(
          `extend: could not fill level ${num} (pyramid ${plan.pyramid}); ` +
            `board too constrained for any curriculum-passing level`,
        );
      }

      const spec = { ...cand.spec, id, name };
      const { par, difficulty, check } = finalize(eng, gen, spec, levelIndex);
      const finalSpec = { ...spec, par };
      existingSignatures.add(signature(finalSpec));
      writeSpec(num, finalSpec);
      rows.push(rowFor(levelIndex, finalSpec, par, difficulty, check, `pyramid ${plan.pyramid}`));

      const agg = perPyramid.get(plan.pyramid) ?? { min: Infinity, max: -Infinity, count: 0 };
      agg.min = Math.min(agg.min, difficulty.score);
      agg.max = Math.max(agg.max, difficulty.score);
      agg.count++;
      perPyramid.set(plan.pyramid, agg);

      produced++;
      if (produced % 10 === 0) {
        const secs = ((Date.now() - t0) / 1000).toFixed(0);
        realWarn(`    … ${produced}/${count} levels (${secs}s elapsed)`);
      }
    }
  } finally {
    console.warn = realWarn;
  }

  rewriteIndex();
  printTable(`Appended ${count} level(s)`, rows);
  assertPackInvariants(rows);

  // Per-pyramid difficulty ramp summary.
  console.log('Per-pyramid difficulty ranges (proving a gentle rising ramp):\n');
  for (const [pyr, agg] of [...perPyramid.entries()].sort((a, b) => a[0] - b[0])) {
    console.log(
      `  pyramid ${String(pyr).padStart(2)}: ${agg.count} levels, ` +
        `score ${agg.min.toFixed(2)} – ${agg.max.toFixed(2)}`,
    );
  }
  console.log(`\nGeneration completed in ${((Date.now() - t0) / 1000).toFixed(1)}s.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
