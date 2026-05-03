import { create } from 'zustand';
import type { SynthPreset } from '../types/synth';
import { readUserPresets, writeUserPresets } from '../utils/presetStorage';

interface PresetStore {
  userPresets: SynthPreset[];
  loadUserPresets: () => void;
  saveUserPreset: (preset: SynthPreset) => void;
  deleteUserPreset: (id: string) => void;
  renameUserPreset: (id: string, name: string) => void;
  importUserPresets: (presets: SynthPreset[]) => void;
}

export const usePresetStore = create<PresetStore>((set, get) => ({
  userPresets: [],
  loadUserPresets: () => set({ userPresets: readUserPresets() }),
  saveUserPreset: (preset) => {
    const next = [preset, ...get().userPresets.filter((item) => item.id !== preset.id)];
    writeUserPresets(next);
    set({ userPresets: next });
  },
  deleteUserPreset: (id) => {
    const next = get().userPresets.filter((preset) => preset.id !== id);
    writeUserPresets(next);
    set({ userPresets: next });
  },
  renameUserPreset: (id, name) => {
    const next = get().userPresets.map((preset) => (preset.id === id ? { ...preset, name } : preset));
    writeUserPresets(next);
    set({ userPresets: next });
  },
  importUserPresets: (presets) => {
    const existing = get().userPresets;
    const next = [...presets, ...existing.filter((preset) => !presets.some((incoming) => incoming.id === preset.id))];
    writeUserPresets(next);
    set({ userPresets: next });
  },
}));
