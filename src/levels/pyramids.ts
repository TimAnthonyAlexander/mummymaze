/**
 * Pyramid grouping — a CONFIG layer over the flat `LEVELS` registry.
 *
 * The 20 levels are organised into themed pyramids of 10, each laid out as rows
 * `[4, 3, 2, 1]` from base to apex (the climb rises with difficulty). This file
 * NEVER edits the level JSON; it only references level ids and provides display
 * overrides + the progression order that unlocking follows.
 *
 * Pyramid 1 ("The Antechamber") = the teaching curriculum, levels 1–10 in the
 * order they were authored. Pyramid 2 ("The Deep Tomb") = levels 11–20, ordered
 * base→apex by rising `par` so the easiest sits at the base and the hardest at
 * the apex.
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

/**
 * Nicer, theme-consistent display names for the auto-generated "Trial NN"
 * levels. Levels with hand-authored names (1–12) fall through to their JSON
 * name via `displayName`.
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

// Pyramid 1: levels 1–10, authoring order (base 1–4, then 5–7, 8–9, apex 10).
const PYRAMID_1_IDS = LEVELS.slice(0, 10).map((l) => l.id);

// Pyramid 2: levels 11–20 sorted base→apex by rising par (tiebreak: play order).
const PYRAMID_2_IDS = LEVELS.slice(10, 20)
  .map((l) => l.id)
  .sort((a, b) => parOf(a) - parOf(b) || registryIndex(a) - registryIndex(b));

export const PYRAMIDS: readonly Pyramid[] = [
  { id: 'pyramid-1', name: 'The Antechamber', rows: toRows(PYRAMID_1_IDS) },
  { id: 'pyramid-2', name: 'The Deep Tomb', rows: toRows(PYRAMID_2_IDS) },
];

/** Flat play order: pyramid-1 base→apex, then pyramid-2 base→apex. */
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
  return DISPLAY_OVERRIDES[levelId] ?? getLevel(levelId)?.name ?? levelId;
}

/** 1-based position of a level within its pyramid (base-left → apex), else 0. */
export function levelNumberInPyramid(levelId: string): number {
  const pyramid = getPyramidOfLevel(levelId);
  if (!pyramid) return 0;
  return pyramidLevelIds(pyramid).indexOf(levelId) + 1;
}
