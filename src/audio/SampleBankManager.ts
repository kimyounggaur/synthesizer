import type { SampleBankManifest, SamplePresetDefinition, SampleZone } from '../types/soundfont';
import { clamp, midiNoteToFrequency } from '../utils/audioMath';

const generatedUrlPrefix = 'generated://';

function isSampleBankManifest(value: unknown): value is SampleBankManifest {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as SampleBankManifest;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.author === 'string' &&
    typeof candidate.license === 'string' &&
    Array.isArray(candidate.presets)
  );
}

function seededRandom(seed: number): () => number {
  let state = seed || 1;
  return () => {
    state = Math.imul(1664525, state) + 1013904223;
    return ((state >>> 0) / 4294967295) * 2 - 1;
  };
}

function seedFromString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

function manifestUrlForBank(bankId: string): string {
  return `${import.meta.env.BASE_URL}soundfonts/${bankId}/manifest.json`;
}

function sampleUrlForZone(bankId: string, zone: SampleZone): string {
  if (zone.url.startsWith(generatedUrlPrefix) || zone.url.startsWith('data:') || /^https?:\/\//i.test(zone.url)) {
    return zone.url;
  }

  return `${import.meta.env.BASE_URL}soundfonts/${bankId}/${zone.url}`;
}

export class SampleBankManager {
  private readonly context: AudioContext;
  private readonly banks = new Map<string, SampleBankManifest>();
  private readonly bufferCache = new Map<string, Promise<AudioBuffer>>();

  constructor(context: AudioContext) {
    this.context = context;
  }

  async loadBank(bankId: string): Promise<SampleBankManifest> {
    const cached = this.banks.get(bankId);
    if (cached) {
      return cached;
    }

    const manifestUrl = manifestUrlForBank(bankId);
    const response = await fetch(manifestUrl);
    if (!response.ok) {
      throw new Error(`Sample bank manifest failed to load: ${manifestUrl}`);
    }

    const manifest = (await response.json()) as unknown;
    if (!isSampleBankManifest(manifest)) {
      throw new Error(`Sample bank manifest is invalid: ${manifestUrl}`);
    }

    this.banks.set(bankId, manifest);
    return manifest;
  }

  getBank(bankId: string): SampleBankManifest | null {
    return this.banks.get(bankId) ?? null;
  }

  getPreset(bankId: string | null, presetId: string | null): SamplePresetDefinition | null {
    if (!bankId || !presetId) {
      return null;
    }

    return this.banks.get(bankId)?.presets.find((preset) => preset.id === presetId) ?? null;
  }

  findZone(preset: SamplePresetDefinition, note: number, velocity: number): SampleZone | null {
    const normalizedVelocity = clamp(velocity, 0, 1);
    const matchingZones = preset.zones.filter((zone) => {
      const lowVelocity = zone.lowVelocity ?? 0;
      const highVelocity = zone.highVelocity ?? 1;
      return note >= zone.lowNote && note <= zone.highNote && normalizedVelocity >= lowVelocity && normalizedVelocity <= highVelocity;
    });

    const candidates = matchingZones.length > 0 ? matchingZones : preset.zones;
    return (
      candidates
        .slice()
        .sort((a, b) => Math.abs(note - a.rootNote) - Math.abs(note - b.rootNote) || (b.highNote - b.lowNote) - (a.highNote - a.lowNote))[0] ?? null
    );
  }

  async getBufferForZone(bankId: string, zone: SampleZone): Promise<AudioBuffer> {
    const cacheKey = `${bankId}:${zone.id}:${zone.url}`;
    const cached = this.bufferCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const sampleUrl = sampleUrlForZone(bankId, zone);
    const bufferPromise = sampleUrl.startsWith(generatedUrlPrefix)
      ? this.createGeneratedBuffer(sampleUrl)
      : this.fetchAudioBuffer(sampleUrl).catch(() => {
          console.warn(`[SampleBankManager] Sample failed, using fallback buffer: ${sampleUrl}`);
          return this.createFallbackBuffer(zone);
        });

    this.bufferCache.set(cacheKey, bufferPromise);
    return bufferPromise;
  }

  async preloadPreset(bankId: string, presetId: string): Promise<void> {
    await this.loadBank(bankId);
    const preset = this.getPreset(bankId, presetId);
    if (!preset) {
      return;
    }

    await Promise.all(preset.zones.map((zone) => this.getBufferForZone(bankId, zone)));
  }

  clearCache(): void {
    this.bufferCache.clear();
  }

  private async fetchAudioBuffer(sampleUrl: string): Promise<AudioBuffer> {
    const response = await fetch(sampleUrl);
    if (!response.ok) {
      throw new Error(`Sample failed to load: ${sampleUrl}`);
    }

    const bytes = await response.arrayBuffer();
    return this.context.decodeAudioData(bytes.slice(0));
  }

  private createFallbackBuffer(zone: SampleZone): AudioBuffer {
    const sampleRate = this.context.sampleRate;
    const seconds = 1.5;
    const buffer = this.context.createBuffer(1, Math.ceil(sampleRate * seconds), sampleRate);
    const channel = buffer.getChannelData(0);
    const baseFrequency = midiNoteToFrequency(zone.rootNote);
    const id = `${zone.id}:${zone.url}`.toLowerCase();
    const random = seededRandom(seedFromString(id));
    const peakGain = 0.25;

    for (let index = 0; index < channel.length; index += 1) {
      const time = index / sampleRate;
      const sine = Math.sin(Math.PI * 2 * baseFrequency * time);
      const trianglePhase = (baseFrequency * time) % 1;
      const triangle = 1 - 4 * Math.abs(trianglePhase - 0.5);
      let envelope = 1;

      if (id.includes('piano')) {
        envelope = Math.exp(-time * 2.2);
      } else if (id.includes('string')) {
        envelope = Math.min(1, time / 0.22) * (0.92 + Math.sin(Math.PI * 2 * 0.33 * time) * 0.035);
      } else {
        envelope = Math.exp(-time * 1.25);
      }

      const sample = (sine * 0.82 + triangle * 0.18 + random() * 0.008) * envelope * peakGain;
      channel[index] = clamp(sample, -1, 1);
    }

    return buffer;
  }

  private async createGeneratedBuffer(url: string): Promise<AudioBuffer> {
    const id = url.slice(generatedUrlPrefix.length);
    const sampleRate = this.context.sampleRate;
    const seconds = id.includes('drum') || id.includes('hit') ? 1.1 : id.includes('organ') ? 1.6 : 2.4;
    const buffer = this.context.createBuffer(1, Math.ceil(sampleRate * seconds), sampleRate);
    const channel = buffer.getChannelData(0);
    const random = seededRandom(seedFromString(id));
    const baseFrequency = id.includes('c5') ? 523.251 : id.includes('c3') ? 130.813 : 261.626;

    for (let index = 0; index < channel.length; index += 1) {
      const time = index / sampleRate;
      const attack = 1 - Math.exp(-time * 180);
      let sample = 0;

      if (id.includes('organ')) {
        const steady = Math.min(1, time / 0.08);
        sample =
          Math.sin(Math.PI * 2 * baseFrequency * time) * 0.56 +
          Math.sin(Math.PI * 2 * baseFrequency * 2 * time) * 0.26 +
          Math.sin(Math.PI * 2 * baseFrequency * 3 * time) * 0.13;
        sample *= steady * 0.72;
      } else if (id.includes('ep') || id.includes('bell')) {
        const envelope = attack * Math.exp(-time * 1.85);
        sample =
          Math.sin(Math.PI * 2 * baseFrequency * time) * 0.42 +
          Math.sin(Math.PI * 2 * baseFrequency * 2.01 * time) * 0.34 +
          Math.sin(Math.PI * 2 * baseFrequency * 3.98 * time) * 0.18;
        sample *= envelope;
      } else if (id.includes('drum') || id.includes('hit')) {
        const sweep = baseFrequency * (1 + Math.exp(-time * 18) * 5);
        const envelope = Math.exp(-time * 8.5);
        sample = Math.sin(Math.PI * 2 * sweep * time) * 0.64 * envelope + random() * 0.22 * Math.exp(-time * 18);
      } else {
        const envelope = attack * Math.exp(-time * 1.45);
        sample =
          Math.sin(Math.PI * 2 * baseFrequency * time) * 0.58 +
          Math.sin(Math.PI * 2 * baseFrequency * 2 * time) * 0.2 +
          Math.sin(Math.PI * 2 * baseFrequency * 3 * time) * 0.08 +
          random() * 0.015;
        sample *= envelope;
      }

      channel[index] = clamp(sample, -1, 1);
    }

    return buffer;
  }
}
