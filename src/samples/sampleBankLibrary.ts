import { SampleBankManager } from '../audio/SampleBankManager';
import type { SampleBankManifest } from '../types/synth';
import demoSampleBankJson from './demoSampleBank.json';

export const builtInSampleBanks: SampleBankManifest[] = [demoSampleBankJson as SampleBankManifest];

export const sampleBankManager = new SampleBankManager();

for (const bank of builtInSampleBanks) {
  sampleBankManager.registerManifest(bank);
}
