/**
 * Pyramid grouping — a CONFIG layer over the flat `LEVELS` registry.
 *
 * The levels are organised into themed pyramids of 10, each laid out as rows
 * `[4, 3, 2, 1]` from base to apex (the climb rises with difficulty). This file
 * NEVER edits the level JSON; it only references level ids and provides display
 * overrides + the progression order that unlocking follows.
 *
 * Pyramid 1 ("The Antechamber") = the teaching curriculum, in the order the
 * levels were authored. Every later pyramid takes its 10 levels and orders them
 * base→apex by rising `par`, so the easiest sits at the base and the hardest at
 * the apex. The current pack ships 170 levels → 17 pyramids of rising
 * difficulty; the grouping adapts automatically to however many levels the
 * generator ships (up to the 20 themed names below).
 */
import { LEVELS, getLevel } from './index';

/** Rows are laid out base→apex: `[4, 3, 2, 1]` level ids. */
export interface Pyramid {
  readonly id: string;
  readonly name: string;
  readonly rows: readonly (readonly string[])[];
}

/** How many tiles sit in each row, base→apex. Sums to 10. */
const ROW_SHAPE = [4, 3, 2, 1] as const;

/** Levels per pyramid. */
const PYRAMID_SIZE = ROW_SHAPE.reduce((a, b) => a + b, 0);

/**
 * Themed names for the pyramids, base tomb → deepest tomb. There are 20 to cover
 * the full 200-level pack; if fewer levels ship, only the leading names are used.
 */
const PYRAMID_NAMES: readonly string[] = [
  'The Antechamber',
  'The Deep Tomb',
  'Hall of Ashes',
  'The Scarab Crypt',
  "Serpent's Descent",
  'The Sunken Vault',
  'Chamber of Jackals',
  'The Obsidian Gate',
  'Valley of Whispers',
  'The Amber Sepulchre',
  'Throne of Dust',
  'The Cobra Sanctum',
  'Vault of the Vizier',
  'The Sunless Passage',
  'Necropolis Depths',
  'The Onyx Labyrinth',
  'Tomb of the Forgotten',
  'The Solar Barque',
  'Hall of the Two Truths',
  "The Pharaoh's Rest",
];

/**
 * Hand-picked display names for the earliest auto-generated "Trial NN" levels
 * (13–20). Levels with hand-authored names (1–12) fall through to their JSON
 * name; generated levels from 21 on get an algorithmic themed name.
 */
const DISPLAY_OVERRIDES: Readonly<Record<string, string>> = {
  '13-trial-13': "Serpent's Coil",
  '14-trial-14': 'Sunken Court',
  '15-trial-15': 'Scarab Vault',
  '16-trial-16': "Jackal's Watch",
  '17-trial-17': 'Obelisk Run',
  '18-trial-18': 'Cobra Gauntlet',
  '19-trial-19': 'Anubis Gate',
  '20-trial-20': "Pharaoh's Snare",
};

/** Adjective/noun pools for deterministic themed names of generated levels. */
const NAME_ADJ: readonly string[] = [
  'Sunken', 'Shattered', 'Whispering', 'Golden', 'Cursed', 'Hidden', 'Endless',
  'Forgotten', 'Burning', 'Silent', 'Crimson', 'Shifting', 'Ancient', 'Hollow',
  'Bygone', 'Veiled', 'Wretched', 'Sacred', 'Dusk', 'Serpent',
];
const NAME_NOUN: readonly string[] = [
  'Passage', 'Vault', 'Corridor', 'Snare', 'Gauntlet', 'Reliquary', 'Warren',
  'Descent', 'Threshold', 'Catacomb', 'Anteroom', 'Labyrinth', 'Crossing',
  'Sanctum', 'Hollow', 'Chamber', 'Spiral', 'Gate', 'Rift', 'Maze',
];

/** A stable, varied themed name for generated "Trial N" levels (N >= 21). */
function themedName(n: number): string {
  const adj = NAME_ADJ[n % NAME_ADJ.length];
  const noun = NAME_NOUN[(n * 7) % NAME_NOUN.length];
  return `${adj} ${noun}`;
}

/** True if a level is a dark/flashlight level. */
function isDark(id: string): boolean {
  return !!getLevel(id)?.dark;
}

/** Split a flat list of ids into rows following {@link ROW_SHAPE}. */
function toRows(ids: readonly string[]): string[][] {
  const rows: string[][] = [];
  let offset = 0;
  for (const size of ROW_SHAPE) {
    rows.push(ids.slice(offset, offset + size));
    offset += size;
  }
  return rows;
}

/** Play index of a level in the flat registry (used as a stable tiebreak). */
function registryIndex(id: string): number {
  return LEVELS.findIndex((l) => l.id === id);
}

/** Par of a level, or a large sentinel so unknown levels sort last. */
function parOf(id: string): number {
  return getLevel(id)?.par ?? Number.MAX_SAFE_INTEGER;
}

/** Board size (max dimension) of a level — the axis of the base→apex ramp. */
function sizeOf(id: string): number {
  const l = getLevel(id);
  return l ? Math.max(l.width, l.height) : 0;
}

/**
 * Build the pyramids by chunking the flat registry into groups of ten and
 * ordering each pyramid base→apex by BOARD SIZE: the lowest floor always has the
 * fewest squares, and boards grow with every floor up. (The generator ramps size
 * by registry position, but the floors are laid out here — so the ordering must
 * key on the size itself, else a big board can land on the base floor.) Every
 * pyramid's dark/flashlight level sorts LAST → the apex. Par then registry order
 * break ties so same-size floors still read as gently rising.
 */
function buildPyramids(): Pyramid[] {
  const pyramids: Pyramid[] = [];
  const count = Math.ceil(LEVELS.length / PYRAMID_SIZE);
  for (let p = 0; p < count; p++) {
    const chunk = LEVELS.slice(p * PYRAMID_SIZE, (p + 1) * PYRAMID_SIZE).map((l) => l.id);
    const ordered = [...chunk].sort((a, b) => {
      const da = isDark(a) ? 1 : 0;
      const db = isDark(b) ? 1 : 0;
      if (da !== db) return da - db; // dark apex last
      const sa = sizeOf(a);
      const sb = sizeOf(b);
      if (sa !== sb) return sa - sb; // fewer squares on lower floors
      return parOf(a) - parOf(b) || registryIndex(a) - registryIndex(b);
    });
    pyramids.push({
      id: `pyramid-${p + 1}`,
      name: PYRAMID_NAMES[p] ?? `Tomb ${p + 1}`,
      rows: toRows(ordered),
    });
  }
  return pyramids;
}

export const PYRAMIDS: readonly Pyramid[] = buildPyramids();

/** Flat play order: each pyramid base→apex, in pyramid order. */
export function progressionOrder(): string[] {
  return PYRAMIDS.flatMap((p) => p.rows.flat());
}

const PROGRESSION = progressionOrder();

/** The id that unlocks after clearing `levelId`, or undefined at the very end. */
export function nextInProgression(levelId: string): string | undefined {
  const i = PROGRESSION.indexOf(levelId);
  return i >= 0 && i < PROGRESSION.length - 1 ? PROGRESSION[i + 1] : undefined;
}

/** The pyramid that contains `levelId`, or undefined if it is unknown. */
export function getPyramidOfLevel(levelId: string): Pyramid | undefined {
  return PYRAMIDS.find((p) => p.rows.some((row) => row.includes(levelId)));
}

/** All level ids in a pyramid, flattened base→apex. */
export function pyramidLevelIds(pyramid: Pyramid): string[] {
  return pyramid.rows.flat();
}

/** Display name for a level: a themed override, else the JSON name, else the id. */
export function displayName(levelId: string): string {
  if (DISPLAY_OVERRIDES[levelId]) return DISPLAY_OVERRIDES[levelId];
  const trial = levelId.match(/^\d+-trial-(\d+)$/);
  if (trial) return themedName(parseInt(trial[1], 10));
  return getLevel(levelId)?.name ?? levelId;
}

/** 1-based position of a level within its pyramid (base-left → apex), else 0. */
export function levelNumberInPyramid(levelId: string): number {
  const pyramid = getPyramidOfLevel(levelId);
  if (!pyramid) return 0;
  return pyramidLevelIds(pyramid).indexOf(levelId) + 1;
}
