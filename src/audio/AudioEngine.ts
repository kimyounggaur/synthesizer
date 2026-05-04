import { Voice } from './Voice';
import type { MeterSnapshot, SynthEngineState } from '../types/synth';
import { clamp } from '../utils/audioMath';
import { EffectsChain } from './EffectsChain';
import { SamplerVoice } from './SamplerVoice';
import { SampleBankManager } from './SampleBankManager';

type WindowWithWebkitAudio = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

type ActiveVoice = Voice | SamplerVoice;

function isSynthVoice(voice: ActiveVoice): voice is Voice {
  return voice instanceof Voice;
}

export class AudioEngine {
  private readonly context: AudioContext;
  private readonly masterGain: GainNode;
  private readonly compressor: DynamicsCompressorNode;
  private readonly analyser: AnalyserNode;
  private readonly voices = new Map<number, ActiveVoice>();
  private state: SynthEngineState;
  private maxPolyphony: number;
  private analyserBuffer: Float32Array<ArrayBuffer>;
  private effectsChain: EffectsChain | null = null;
  private readonly sampleBankManager: SampleBankManager;
  private preloadedSampleKey: string | null = null;

  constructor(initialState: SynthEngineState) {
    const AudioContextCtor = window.AudioContext ?? (window as WindowWithWebkitAudio).webkitAudioContext;
    if (!AudioContextCtor) {
      throw new Error('Web Audio API is not supported in this browser.');
    }

    this.context = new AudioContextCtor();
    this.masterGain = this.context.createGain();
    this.compressor = this.context.createDynamicsCompressor();
    this.analyser = this.context.createAnalyser();
    this.sampleBankManager = new SampleBankManager(this.context);
    this.state = initialState;
    this.maxPolyphony = initialState.polyphony;

    this.masterGain.gain.value = initialState.masterVolume;
    this.compressor.threshold.value = -10;
    this.compressor.knee.value = 18;
    this.compressor.ratio.value = 12;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.18;
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.72;
    this.analyserBuffer = new Float32Array(this.analyser.fftSize) as Float32Array<ArrayBuffer>;
    this.effectsChain = new EffectsChain(this.context, initialState.effects);
    this.masterGain.connect(this.effectsChain.input);
    this.effectsChain.connect(this.compressor);
    this.compressor.connect(this.analyser);
    this.analyser.connect(this.context.destination);
  }

  async resume(): Promise<void> {
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
  }

  setState(state: SynthEngineState): void {
    this.state = state;
    this.maxPolyphony = state.polyphony;
    this.setMasterVolume(state.masterVolume);
    this.effectsChain?.update(state.effects);
    this.voices.forEach((voice) => {
      if (isSynthVoice(voice)) {
        voice.updateState(state);
      }
    });
    const sampleKey = `${state.sampleLayer.bankId ?? ''}:${state.sampleLayer.presetId ?? ''}`;
    if (state.sampleLayer.enabled && state.sampleLayer.preload && state.sampleLayer.bankId && state.sampleLayer.presetId && sampleKey !== this.preloadedSampleKey) {
      this.preloadedSampleKey = sampleKey;
      void this.sampleBankManager.preloadPreset(state.sampleLayer.bankId, state.sampleLayer.presetId).catch((error) => {
        console.warn(error);
      });
    }
  }

  async noteOn(note: number, velocity = 1): Promise<void> {
    await this.resume();

    const existing = this.voices.get(note);
    if (existing) {
      existing.stopImmediately();
      this.voices.delete(note);
    }

    this.trimPolyphony();

    if (this.state.engineMode === 'sample') {
      await this.noteOnSample(note, velocity);
      return;
    }

    if (this.state.engineMode === 'hybrid') {
      await this.noteOnHybrid(note, velocity);
      return;
    }

    this.noteOnSynth(note, velocity);
  }

  noteOff(note: number): void {
    const voice = this.voices.get(note);
    if (!voice) {
      return;
    }
    voice.noteOff();
  }

  setMasterVolume(value: number): void {
    this.masterGain.gain.setTargetAtTime(clamp(value, 0, 1), this.context.currentTime, 0.02);
  }

  panic(): void {
    this.voices.forEach((voice) => voice.stopImmediately());
    this.voices.clear();
  }

  connectEffectsChain(chain: EffectsChain | null): void {
    this.effectsChain?.disconnect();
    this.effectsChain = chain;
    this.masterGain.disconnect();

    if (chain) {
      this.masterGain.connect(chain.input);
      chain.connect(this.compressor);
    } else {
      this.masterGain.connect(this.compressor);
    }
  }

  getAnalyserData(): MeterSnapshot {
    this.analyser.getFloatTimeDomainData(this.analyserBuffer);

    let sum = 0;
    let peak = 0;
    for (const sample of this.analyserBuffer) {
      const abs = Math.abs(sample);
      peak = Math.max(peak, abs);
      sum += sample * sample;
    }

    return {
      peak: clamp(peak, 0, 1.5),
      rms: clamp(Math.sqrt(sum / this.analyserBuffer.length), 0, 1),
      clipping: peak >= 0.98,
      audioState: this.context.state,
      activeVoices: this.voiceCount(),
    };
  }

  close(): void {
    this.panic();
    this.sampleBankManager.clearCache();
    void this.context.close();
  }

  private trimPolyphony(): void {
    while (this.voices.size >= this.maxPolyphony) {
      const oldest = this.voices.keys().next().value as number | undefined;
      if (oldest === undefined) {
        return;
      }
      const voice = this.voices.get(oldest);
      voice?.stopImmediately();
      this.voices.delete(oldest);
    }
  }

  private noteOnSynth(note: number, velocity: number): void {
    const voice = new Voice(this.context, note, velocity, this.state, (endedVoice) => this.removeVoice(endedVoice));
    this.voices.set(note, voice);
    voice.connect(this.masterGain);
    voice.start();
  }

  private async noteOnSample(note: number, velocity: number): Promise<void> {
    const layer = this.state.sampleLayer;

    if (!layer.enabled || !layer.bankId || !layer.presetId) {
      this.noteOnSynth(note, velocity);
      return;
    }

    try {
      await this.sampleBankManager.loadBank(layer.bankId);
      const preset = this.sampleBankManager.getPreset(layer.bankId, layer.presetId);

      if (!preset) {
        console.warn('[AudioEngine] Sample preset not found. Falling back to synth voice.');
        this.noteOnSynth(note, velocity);
        return;
      }

      const zone = this.sampleBankManager.findZone(preset, note, velocity);

      if (!zone) {
        console.warn('[AudioEngine] No sample zone matched. Falling back to synth voice.');
        this.noteOnSynth(note, velocity);
        return;
      }

      const buffer = await this.sampleBankManager.getBufferForZone(layer.bankId, zone);

      const voice = new SamplerVoice({
        context: this.context,
        note,
        velocity,
        zone,
        buffer,
        sampleLayer: layer,
        onEnded: (endedVoice) => this.removeVoice(endedVoice),
      });

      this.voices.set(note, voice);
      voice.connect(this.masterGain);
      voice.start();
    } catch (error) {
      console.warn('[AudioEngine] Sample voice failed. Falling back to synth voice.', error);
      this.noteOnSynth(note, velocity);
    }
  }

  private async noteOnHybrid(note: number, velocity: number): Promise<void> {
    // MVP: hybrid mode currently uses sample layer when available.
    // Future: create HybridVoice that contains both Voice and SamplerVoice.
    await this.noteOnSample(note, velocity);
  }

  private removeVoice(voice: ActiveVoice): void {
    if (this.voices.get(voice.note) === voice) {
      this.voices.delete(voice.note);
    }
  }

  private voiceCount(): number {
    return this.voices.size;
  }
}
