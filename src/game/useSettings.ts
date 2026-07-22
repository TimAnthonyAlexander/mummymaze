/**
 * Reactive view over the persisted `settings` block (sound + animations +
 * move arrows).
 *
 * Backed by a tiny module-level store so EVERY `useSettings()` mount shares one
 * reactive source of truth: the sidebar's toggle and the board's reader both see
 * the same value and re-render together (the old per-hook `useState` copies could
 * drift out of sync). Toggling writes through to storage immediately and keeps the
 * sound module's cached enable flag in sync. The animations flag is read by
 * `useAnimatedGame` straight from storage at move time.
 */
import { useSyncExternalStore } from 'react';
import { loadSave, updateSave, type Settings } from './storage';
import { setSoundEnabled } from './sound';

let current: Settings = loadSave().settings;
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot(): Settings {
  return current;
}

function setSettings(next: Settings): void {
  current = next;
  updateSave({ settings: next });
  emit();
}

export interface UseSettings {
  sound: boolean;
  animations: boolean;
  moveArrows: boolean;
  toggleSound: () => void;
  toggleAnimations: () => void;
  toggleMoveArrows: () => void;
}

const toggleSound = () => {
  const next: Settings = { ...current, sound: !current.sound };
  setSoundEnabled(next.sound);
  setSettings(next);
};

const toggleAnimations = () => {
  setSettings({ ...current, animations: !current.animations });
};

const toggleMoveArrows = () => {
  setSettings({ ...current, moveArrows: !current.moveArrows });
};

export function useSettings(): UseSettings {
  const settings = useSyncExternalStore(subscribe, getSnapshot);
  return {
    sound: settings.sound,
    animations: settings.animations,
    moveArrows: settings.moveArrows,
    toggleSound,
    toggleAnimations,
    toggleMoveArrows,
  };
}
