/**
 * Safe, namespaced localStorage wrapper for Maze Escape progression.
 *
 * Every access is wrapped in try/catch: private-mode, quota, and JSON errors
 * degrade to an in-memory fallback and NEVER throw. The parsed blob is never
 * trusted — its shape is validated field by field, and anything unexpected
 * resets to sensible defaults (also on version mismatch).
 */

export const STORAGE_KEY = 'maze-escape:v1';

export interface Settings {
  sound: boolean;
  animations: boolean;
}

export interface SaveData {
  version: 1;
  unlockedLevelIds: string[];
  bestMoves: Record<string, number>;
  completedLevelIds: string[];
  lastPlayedLevelId?: string;
  settings: Settings;
}

/** A fresh, valid save. Returned whenever storage is missing or unusable. */
export function defaultSave(): SaveData {
  return {
    version: 1,
    unlockedLevelIds: [],
    bestMoves: {},
    completedLevelIds: [],
    settings: { sound: true, animations: true },
  };
}

/**
 * In-memory fallback. Seeds every read/write so the app keeps a coherent view
 * of progress even when the real Storage is unavailable (e.g. Safari private
 * mode, disabled cookies, quota-exceeded on write).
 */
let memoryFallback: SaveData = defaultSave();

/** Access the platform Storage, or null if it is unavailable or throws. */
function getBackend(): Storage | null {
  try {
    const s = (globalThis as unknown as { localStorage?: Storage }).localStorage;
    return s ?? null;
  } catch {
    // Accessing localStorage itself can throw (sandboxed iframes, some browsers).
    return null;
  }
}

// --- parse guards: never trust the parsed blob ---

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function toStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string');
}

function toNumberRecord(v: unknown): Record<string, number> {
  if (!isPlainObject(v)) return {};
  const out: Record<string, number> = {};
  for (const [k, val] of Object.entries(v)) {
    if (typeof val === 'number' && Number.isFinite(val)) out[k] = val;
  }
  return out;
}

function toSettings(v: unknown): Settings {
  const base = defaultSave().settings;
  if (!isPlainObject(v)) return base;
  return {
    sound: typeof v.sound === 'boolean' ? v.sound : base.sound,
    animations: typeof v.animations === 'boolean' ? v.animations : base.animations,
  };
}

/** Coerce an untrusted parsed value into a valid SaveData (or defaults). */
function parseSave(raw: unknown): SaveData {
  if (!isPlainObject(raw)) return defaultSave();
  if (raw.version !== 1) return defaultSave(); // version mismatch → reset
  const base = defaultSave();
  return {
    version: 1,
    unlockedLevelIds: toStringArray(raw.unlockedLevelIds),
    bestMoves: toNumberRecord(raw.bestMoves),
    completedLevelIds: toStringArray(raw.completedLevelIds),
    lastPlayedLevelId:
      typeof raw.lastPlayedLevelId === 'string' ? raw.lastPlayedLevelId : undefined,
    settings: toSettings(raw.settings ?? base.settings),
  };
}

/**
 * Load the save. Returns valid defaults on missing / corrupt / version-mismatch
 * data. Never throws. Falls back to the in-memory copy when Storage is unusable.
 */
export function loadSave(): SaveData {
  const backend = getBackend();
  if (!backend) return memoryFallback;
  try {
    const raw = backend.getItem(STORAGE_KEY);
    if (raw === null) return memoryFallback;
    const parsed = parseSave(JSON.parse(raw) as unknown);
    memoryFallback = parsed;
    return parsed;
  } catch {
    // Corrupt JSON, read failure, etc. — degrade to the in-memory copy.
    return memoryFallback;
  }
}

/**
 * Persist the save. Always updates the in-memory fallback first (so a failed
 * write still leaves the running session consistent), then best-effort writes
 * to Storage. Never throws.
 */
export function saveSave(data: SaveData): void {
  memoryFallback = data;
  const backend = getBackend();
  if (!backend) return;
  try {
    backend.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Quota exceeded / private mode — the in-memory copy already holds the data.
  }
}

/** Return a new save with `patch` merged over the loaded one, and persist it. */
export function updateSave(patch: Partial<SaveData>): SaveData {
  const next: SaveData = { ...loadSave(), ...patch, version: 1 };
  saveSave(next);
  return next;
}

/** Reset all persisted progress back to defaults. */
export function clearSave(): SaveData {
  const fresh = defaultSave();
  saveSave(fresh);
  return fresh;
}

/** Test-only seam: reset the in-memory fallback between cases. */
export function __resetMemoryFallback(): void {
  memoryFallback = defaultSave();
}
