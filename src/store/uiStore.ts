import { create } from 'zustand';

export type WorkstationPageId = 'program' | 'sample' | 'synth' | 'filterAmp' | 'modulation' | 'waveVector' | 'effects' | 'global';

interface UiStore {
  activeWorkstationPage: WorkstationPageId;
  setActiveWorkstationPage: (page: WorkstationPageId) => void;
}

export const useUiStore = create<UiStore>((set) => ({
  activeWorkstationPage: 'program',
  setActiveWorkstationPage: (page) => set({ activeWorkstationPage: page }),
}));
