import type { SampleBankManifest, SamplePresetDefinition } from '../types/soundfont';
import { availableSampleBanks } from '../presets/samplePresets';

const publicSampleBankIds = availableSampleBanks.map((bank) => bank.id);
const manifestCache = new Map<string, SampleBankManifest>();
let publicSampleBanksPromise: Promise<SampleBankManifest[]> | null = null;

function manifestUrlForBank(bankId: string): string {
  return `${import.meta.env.BASE_URL}soundfonts/${bankId}/manifest.json`;
}

async function loadSampleBankManifest(bankId: string): Promise<SampleBankManifest> {
  const cached = manifestCache.get(bankId);
  if (cached) {
    return cached;
  }

  const response = await fetch(manifestUrlForBank(bankId));
  if (!response.ok) {
    throw new Error(`Sample bank manifest failed to load: ${bankId}`);
  }

  const manifest = (await response.json()) as SampleBankManifest;
  manifestCache.set(bankId, manifest);
  return manifest;
}

export function getCachedSampleBankManifests(): SampleBankManifest[] {
  return Array.from(manifestCache.values());
}

export function getCachedSampleBank(bankId: string | null): SampleBankManifest | null {
  if (!bankId) {
    return null;
  }

  return manifestCache.get(bankId) ?? null;
}

export function getCachedSamplePreset(bankId: string | null, presetId: string | null): SamplePresetDefinition | null {
  if (!bankId || !presetId) {
    return null;
  }

  return manifestCache.get(bankId)?.presets.find((preset) => preset.id === presetId) ?? null;
}

export function loadPublicSampleBanks(): Promise<SampleBankManifest[]> {
  if (!publicSampleBanksPromise) {
    publicSampleBanksPromise = Promise.all(publicSampleBankIds.map((bankId) => loadSampleBankManifest(bankId)));
  }

  return publicSampleBanksPromise;
}
