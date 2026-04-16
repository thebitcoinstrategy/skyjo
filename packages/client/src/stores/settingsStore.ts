import { create } from 'zustand';

interface SettingsState {
  musicVolume: number;
  sfxVolume: number;
  musicEnabled: boolean;
  sfxEnabled: boolean;
  reduceAnimations: boolean;

  setMusicVolume: (v: number) => void;
  setSfxVolume: (v: number) => void;
  toggleMusic: () => void;
  toggleSfx: () => void;
  toggleReduceAnimations: () => void;
}

function loadSetting<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`skyjo_${key}`);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveSetting(key: string, value: unknown): void {
  try {
    localStorage.setItem(`skyjo_${key}`, JSON.stringify(value));
  } catch {
    // localStorage might be full or disabled
  }
}

export const useSettingsStore = create<SettingsState>((set) => ({
  musicVolume: loadSetting('musicVolume', 0.5),
  sfxVolume: loadSetting('sfxVolume', 0.7),
  musicEnabled: loadSetting('musicEnabled', false),
  sfxEnabled: loadSetting('sfxEnabled', true),
  reduceAnimations: loadSetting('reduceAnimations', false),

  setMusicVolume: (v) => {
    saveSetting('musicVolume', v);
    set({ musicVolume: v });
  },
  setSfxVolume: (v) => {
    saveSetting('sfxVolume', v);
    set({ sfxVolume: v });
  },
  toggleMusic: () =>
    set((s) => {
      const next = !s.musicEnabled;
      saveSetting('musicEnabled', next);
      return { musicEnabled: next };
    }),
  toggleSfx: () =>
    set((s) => {
      const next = !s.sfxEnabled;
      saveSetting('sfxEnabled', next);
      return { sfxEnabled: next };
    }),
  toggleReduceAnimations: () =>
    set((s) => {
      const next = !s.reduceAnimations;
      saveSetting('reduceAnimations', next);
      return { reduceAnimations: next };
    }),
}));
