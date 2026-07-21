/**
 * Reactive view over the persisted `settings` block (sound + animations).
 *
 * Toggling writes through to storage immediately and keeps the sound module's
 * cached enable flag in sync. The animations flag is read by `useAnimatedGame`
 * straight from storage at move time, so no wiring is needed beyond persisting.
 */
import { useCallback, useMemo, useState } from 'react';
import { loadSave, updateSave, type Settings } from './storage';
import { setSoundEnabled } from './sound';

export interface UseSettings {
  sound: boolean;
  animations: boolean;
  toggleSound: () => void;
  toggleAnimations: () => void;
}

export function useSettings(): UseSettings {
  const [settings, setSettings] = useState<Settings>(() => loadSave().settings);

  const toggleSound = useCallback(() => {
    setSettings((prev) => {
      const next: Settings = { ...prev, sound: !prev.sound };
      updateSave({ settings: next });
      setSoundEnabled(next.sound);
      return next;
    });
  }, []);

  const toggleAnimations = useCallback(() => {
    setSettings((prev) => {
      const next: Settings = { ...prev, animations: !prev.animations };
      updateSave({ settings: next });
      return next;
    });
  }, []);

  return useMemo(
    () => ({
      sound: settings.sound,
      animations: settings.animations,
      toggleSound,
      toggleAnimations,
    }),
    [settings.sound, settings.animations, toggleSound, toggleAnimations],
  );
}
