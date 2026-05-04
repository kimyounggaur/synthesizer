import type { SampleBankManifest } from '../types/soundfont';

export async function loadSampleBankManifestForUi(bankId: string): Promise<SampleBankManifest> {
  const url = `${import.meta.env.BASE_URL}soundfonts/${bankId}/manifest.json`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to load sample bank manifest: ${bankId}`);
  }

  return response.json() as Promise<SampleBankManifest>;
}
