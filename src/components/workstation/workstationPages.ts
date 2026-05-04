import type { WorkstationPageId } from '../../store/uiStore';

export interface WorkstationPageDefinition {
  id: WorkstationPageId;
  label: string;
  detail: string;
}

export const workstationPages: WorkstationPageDefinition[] = [
  { id: 'program', label: 'Program', detail: 'Banks and presets' },
  { id: 'sample', label: 'Sample', detail: 'Sample layer' },
  { id: 'synth', label: 'Synth', detail: 'Oscillators' },
  { id: 'filterAmp', label: 'Filter/Amp', detail: 'Filter and envelopes' },
  { id: 'modulation', label: 'Mod', detail: 'LFO matrix' },
  { id: 'waveVector', label: 'Wave/Vector', detail: 'Sequence and vector' },
  { id: 'effects', label: 'Effects', detail: 'Insert and master FX' },
  { id: 'global', label: 'Global', detail: 'System settings' },
];

export function workstationPagePanelId(pageId: WorkstationPageId): string {
  return `workstation-panel-${pageId}`;
}

export function workstationPageTabId(pageId: WorkstationPageId): string {
  return `workstation-tab-${pageId}`;
}
