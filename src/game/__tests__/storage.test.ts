import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  STORAGE_KEY,
  __resetMemoryFallback,
  defaultSave,
  loadSave,
  saveSave,
  type SaveData,
} from '../storage';

/** Minimal in-memory Storage double we can swap for the real localStorage. */
function makeStorage(overrides: Partial<Storage> = {}): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    getItem: (k: string) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
    ...overrides,
  } as Storage;
}

function installStorage(storage: Storage | undefined): void {
  Object.defineProperty(globalThis, 'localStorage', {
    value: storage,
    configurable: true,
    writable: true,
  });
}

describe('storage', () => {
  beforeEach(() => {
    __resetMemoryFallback();
    installStorage(makeStorage());
  });

  afterEach(() => {
    installStorage(undefined);
    vi.restoreAllMocks();
  });

  it('returns defaults when nothing is stored', () => {
    expect(loadSave()).toEqual(defaultSave());
  });

  it('round-trips save and load', () => {
    const data: SaveData = {
      version: 1,
      bestMoves: { '01-first-steps': 7 },
      completedLevelIds: ['01-first-steps'],
      lastPlayedLevelId: '02-slow-pursuit',
      settings: { sound: false, animations: true, moveArrows: false },
    };
    saveSave(data);
    expect(loadSave()).toEqual(data);
  });

  it('returns defaults on corrupt JSON', () => {
    globalThis.localStorage.setItem(STORAGE_KEY, '{not valid json');
    expect(loadSave()).toEqual(defaultSave());
  });

  it('resets on version mismatch', () => {
    globalThis.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 99, completedLevelIds: ['x'] }),
    );
    expect(loadSave()).toEqual(defaultSave());
  });

  it('parse-guards a malformed but valid-JSON blob', () => {
    globalThis.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        bestMoves: { good: 3, bad: 'nope', nan: Number.NaN },
        completedLevelIds: ['a', 42, null], // non-strings dropped
        settings: { sound: 'yes', animations: false },
      }),
    );
    const loaded = loadSave();
    expect(loaded.completedLevelIds).toEqual(['a']);
    expect(loaded.bestMoves).toEqual({ good: 3 });
    expect(loaded.settings).toEqual({ sound: true, animations: false, moveArrows: false });
  });

  it('does not crash and falls back to memory when setItem throws (quota)', () => {
    const throwing = makeStorage({
      setItem: () => {
        throw new DOMException('QuotaExceededError');
      },
    });
    installStorage(throwing);

    const data: SaveData = {
      ...defaultSave(),
      completedLevelIds: ['01-first-steps'],
      bestMoves: { '01-first-steps': 5 },
    };

    // Must not throw despite the failing setItem...
    expect(() => saveSave(data)).not.toThrow();
    // ...and the in-memory fallback keeps the value available on read.
    expect(loadSave()).toEqual(data);
  });

  it('does not crash when localStorage is entirely unavailable', () => {
    installStorage(undefined);
    expect(() => saveSave(defaultSave())).not.toThrow();
    expect(loadSave()).toEqual(defaultSave());
  });

  it('does not crash when getItem throws', () => {
    const throwing = makeStorage({
      getItem: () => {
        throw new Error('read blocked');
      },
    });
    installStorage(throwing);
    expect(() => loadSave()).not.toThrow();
    expect(loadSave()).toEqual(defaultSave());
  });
});
