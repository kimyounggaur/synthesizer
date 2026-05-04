import type { SampleBankManifest, SamplePresetDefinition, SampleZone } from '../types/soundfont';
import { clamp, midiNoteToFrequency } from '../utils/audioMath';

interface RegisteredSampleBank {
  manifest: SampleBankManifest;
  baseUrl: string;
}

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

export class SampleBankManager {
  private readonly banks = new Map<string, RegisteredSampleBank>();
  private readonly bufferCache = new WeakMap<AudioContext, Map<string, Promise<AudioBuffer>>>();

  registerManifest(manifest: SampleBankManifest, baseUrl = ''): void {
    this.banks.set(manifest.id, { manifest, baseUrl });
  }

  async loadManifest(manifestUrl: string): Promise<SampleBankManifest> {
    const response = await fetch(manifestUrl);
    if (!response.ok) {
      throw new Error(`Sample bank manifest failed to load: ${response.status}`);
    }

    const manifest = (await response.json()) as unknown;
    if (!isSampleBankManifest(manifest)) {
      throw new Error('Sample bank manifest is invalid.');
    }

    this.registerManifest(manifest, new URL('.', response.url).toString());
    return manifest;
  }

  getBankManifests(): SampleBankManifest[] {
    return Array.from(this.banks.values()).map((entry) => entry.manifest);
  }

  getBank(bankId: string | null): SampleBankManifest | null {
    if (!bankId) {
      return null;
    }
    return this.banks.get(bankId)?.manifest ?? null;
  }

  getPreset(bankId: string | null, presetId: string | null): SamplePresetDefinition | null {
    if (!bankId || !presetId) {
      return null;
    }
    return this.banks.get(bankId)?.manifest.presets.find((preset) => preset.id === presetId) ?? null;
  }

  getBaseUrl(bankId: string | null): string {
    if (!bankId) {
      return '';
    }
    return this.banks.get(bankId)?.baseUrl ?? '';
  }

  selectZone(preset: SamplePresetDefinition, note: number, velocity: number): SampleZone | null {
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

  async preloadPreset(context: AudioContext, bankId: string | null, presetId: string | null): Promise<void> {
    const preset = this.getPreset(bankId, presetId);
    if (!preset) {
      return;
    }

    const baseUrl = this.getBaseUrl(bankId);
    await Promise.all(preset.zones.map((zone) => this.getZoneBuffer(context, zone, baseUrl)));
  }

  async getZoneBuffer(context: AudioContext, zone: SampleZone, baseUrl = ''): Promise<AudioBuffer> {
    const resolvedUrl = this.resolveUrl(zone.url, baseUrl);
    let contextCache = this.bufferCache.get(context);
    if (!contextCache) {
      contextCache = new Map<string, Promise<AudioBuffer>>();
      this.bufferCache.set(context, contextCache);
    }

    const cached = contextCache.get(resolvedUrl);
    if (cached) {
      return cached;
    }

    const promise = resolvedUrl.startsWith(generatedUrlPrefix)
      ? this.createGeneratedBuffer(context, resolvedUrl)
      : this.fetchAudioBuffer(context, resolvedUrl).catch(() => this.createFallbackBuffer(context, zone, resolvedUrl));
    contextCache.set(resolvedUrl, promise);
    return promise;
  }

  private resolveUrl(url: string, baseUrl: string): string {
    if (url.startsWith(generatedUrlPrefix) || url.startsWith('data:') || /^https?:\/\//i.test(url)) {
      return url;
    }
    if (!baseUrl) {
      return url;
    }
    return new URL(url, baseUrl).toString();
  }

  private async fetchAudioBuffer(context: AudioContext, url: string): Promise<AudioBuffer> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Sample failed to load: ${url}`);
    }

    const bytes = await response.arrayBuffer();
    return context.decodeAudioData(bytes.slice(0));
  }

  private async createFallbackBuffer(context: AudioContext, zone: SampleZone, url: string): Promise<AudioBuffer> {
    const id = `${zone.id}:${url}`;
    const baseFrequency = midiNoteToFrequency(zone.rootNote);
    const lowerId = id.toLowerCase();
    const sampleRate = context.sampleRate;
    const seconds = lowerId.includes('string') ? 1.55 : lowerId.includes('drum') || lowerId.includes('hit') ? 1.1 : 2.2;
    const buffer = context.createBuffer(1, Math.ceil(sampleRate * seconds), sampleRate);
    const channel = buffer.getChannelData(0);
    const random = seededRandom(seedFromString(id));

    for (let index = 0; index < channel.length; index += 1) {
      const time = index / sampleRate;
      const attack = 1 - Math.exp(-time * 120);
      let sample = 0;

      if (lowerId.includes('string')) {
        const fadeIn = Math.min(1, time / 0.25);
        const slowMotion = 1 + Math.sin(Math.PI * 2 * 0.42 * time) * 0.014;
        sample =
          Math.sin(Math.PI * 2 * baseFrequency * slowMotion * time) * 0.48 +
          Math.sin(Math.PI * 2 * baseFrequency * 2.003 * time) * 0.23 +
          Math.sin(Math.PI * 2 * baseFrequency * 3.01 * time) * 0.11 +
          random() * 0.012;
        sample *= fadeIn * 0.74;
      } else if (lowerId.includes('piano')) {
        const envelope = attack * Math.exp(-time * 1.55);
        sample =
          Math.sin(Math.PI * 2 * baseFrequency * time) * 0.56 +
          Math.sin(Math.PI * 2 * baseFrequency * 2.01 * time) * 0.18 +
          Math.sin(Math.PI * 2 * baseFrequency * 3.02 * time) * 0.08 +
          random() * 0.01;
        sample *= envelope;
      } else {
        const envelope = attack * Math.exp(-time * 1.35);
        sample =
          Math.sin(Math.PI * 2 * baseFrequency * time) * 0.55 +
          Math.sin(Math.PI * 2 * baseFrequency * 2 * time) * 0.17 +
          random() * 0.014;
        sample *= envelope;
      }

      channel[index] = clamp(sample, -1, 1);
    }

    return buffer;
  }

  private async createGeneratedBuffer(context: AudioContext, url: string): Promise<AudioBuffer> {
    const id = url.slice(generatedUrlPrefix.length);
    const sampleRate = context.sampleRate;
    const seconds = id.includes('drum') || id.includes('hit') ? 1.1 : id.includes('organ') ? 1.6 : 2.4;
    const buffer = context.createBuffer(1, Math.ceil(sampleRate * seconds), sampleRate);
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
