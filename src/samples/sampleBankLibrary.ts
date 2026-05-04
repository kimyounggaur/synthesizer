import { SampleBankManager } from '../audio/SampleBankManager';
import type { SampleBankManifest } from '../types/soundfont';
import demoSampleBankJson from './demoSampleBank.json';

export const builtInSampleBanks: SampleBankManifest[] = [demoSampleBankJson as SampleBankManifest];

export const sampleBankManager = new SampleBankManager();
const publicSampleBankManifestPaths = ['soundfonts/demo-lite/manifest.json'];
let publicSampleBanksPromise: Promise<void> | null = null;

for (const bank of builtInSampleBanks) {
  sampleBankManager.registerManifest(bank);
}

function publicAssetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
}

export function loadPublicSampleBanks(): Promise<void> {
  if (!publicSampleBanksPromise) {
    publicSampleBanksPromise = Promise.all(publicSampleBankManifestPaths.map((path) => sampleBankManager.loadManifest(publicAssetUrl(path)))).then(() => undefined);
  }

  return publicSampleBanksPromise;
}
