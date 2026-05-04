import type { WorkstationPageId } from '../../store/uiStore';

export interface WorkstationPageDefinition {
  id: WorkstationPageId;
  label: string;
  detail: string;
}

export const workstationPages: WorkstationPageDefinition[] = [
  { id: 'program', label: 'Set List', detail: 'Program bank' },
  { id: 'sample', label: 'Sample', detail: 'Layer bank' },
  { id: 'synth', label: 'Tone Edit', detail: 'Osc / mix' },
  { id: 'filterAmp', label: 'Filter/Amp', detail: 'EG / VCF' },
  { id: 'modulation', label: 'Control', detail: 'LFO routing' },
  { id: 'waveVector', label: 'Wave Seq', detail: 'Vector lane' },
  { id: 'effects', label: 'IFX / MFX', detail: 'FX chain' },
  { id: 'global', label: 'Global', detail: 'System' },
];

export function workstationPagePanelId(pageId: WorkstationPageId): string {
  return `workstation-panel-${pageId}`;
}

export function workstationPageTabId(pageId: WorkstationPageId): string {
  return `workstation-tab-${pageId}`;
}
