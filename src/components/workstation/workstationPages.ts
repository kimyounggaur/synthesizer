import type { WorkstationPageId } from '../../store/uiStore';

export interface WorkstationPageDefinition {
  id: WorkstationPageId;
  label: string;
  detail: string;
}

export const workstationPages: WorkstationPageDefinition[] = [
  { id: 'program', label: 'Program', detail: '' },
  { id: 'sample', label: 'Sample', detail: '' },
  { id: 'synth', label: 'Hybrid', detail: '' },
  { id: 'waveVector', label: 'Seq', detail: '' },
  { id: 'global', label: 'Global', detail: '' },
  { id: 'effects', label: 'Utility', detail: '' },
  { id: 'filterAmp', label: 'Browser', detail: '' },
  { id: 'modulation', label: 'Exit', detail: '' },
];

export function workstationPagePanelId(pageId: WorkstationPageId): string {
  return `workstation-panel-${pageId}`;
}

export function workstationPageTabId(pageId: WorkstationPageId): string {
  return `workstation-tab-${pageId}`;
}
