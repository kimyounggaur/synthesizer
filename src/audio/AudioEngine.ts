import { Voice } from './Voice';
import type { MeterSnapshot, SynthEngineState } from '../types/synth';
import { clamp } from '../utils/audioMath';
import { EffectsChain } from './EffectsChain';
import { SamplerVoice } from './SamplerVoice';
import { sampleBankManager } from '../samples/sampleBankLibrary';

type WindowWithWebkitAudio = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

type EngineVoice = Voice | SamplerVoice;

export class AudioEngine {
  private readonly context: AudioContext;
  private readonly masterGain: GainNode;
  private readonly compressor: DynamicsCompressorNode;
  private readonly analyser: AnalyserNode;
  private readonly voices = new Map<number, EngineVoice[]>();
  private readonly noteTokens = new Map<number, number>();
  private state: SynthEngineState;
  private maxPolyphony: number;
  private analyserBuffer: Float32Array<ArrayBuffer>;
  private effectsChain: EffectsChain | null = null;
  private voiceSerial = 0;
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
    this.voices.forEach((voiceStack) => voiceStack.forEach((voice) => voice.updateState(state)));
    const sampleKey = `${state.sampleLayer.bankId ?? ''}:${state.sampleLayer.presetId ?? ''}`;
    if (state.sampleLayer.enabled && state.sampleLayer.preload && sampleKey !== this.preloadedSampleKey) {
      this.preloadedSampleKey = sampleKey;
      void sampleBankManager.preloadPreset(this.context, state.sampleLayer.bankId, state.sampleLayer.presetId).catch((error) => {
        console.warn(error);
      });
    }
  }

  async noteOn(note: number, velocity = 1): Promise<void> {
    await this.resume();

    const existing = this.voices.get(note);
    if (existing) {
      existing.forEach((voice) => voice.stopImmediately());
      this.voices.delete(note);
    }

    const token = this.nextNoteToken(note);
    this.trimPolyphony();

    let voiceStack: EngineVoice[];
    try {
      voiceStack = await this.createVoiceStack(note, velocity);
    } catch (error) {
      console.warn(error);
      return;
    }
    if (this.noteTokens.get(note) !== token) {
      voiceStack.forEach((voice) => voice.stopImmediately());
      return;
    }

    if (voiceStack.length === 0) {
      return;
    }

    this.voices.set(note, voiceStack);
    voiceStack.forEach((voice) => {
      voice.connect(this.masterGain);
      voice.start();
    });
  }

  noteOff(note: number): void {
    const voiceStack = this.voices.get(note);
    if (!voiceStack) {
      this.nextNoteToken(note);
      return;
    }
    voiceStack.forEach((voice) => voice.noteOff());
  }

  setMasterVolume(value: number): void {
    this.masterGain.gain.setTargetAtTime(clamp(value, 0, 1), this.context.currentTime, 0.02);
  }

  panic(): void {
    this.voiceSerial += 1;
    this.noteTokens.clear();
    this.voices.forEach((voiceStack) => voiceStack.forEach((voice) => voice.stopImmediately()));
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
    void this.context.close();
  }

  private trimPolyphony(): void {
    while (this.voices.size >= this.maxPolyphony) {
      const oldest = this.voices.keys().next().value as number | undefined;
      if (oldest === undefined) {
        return;
      }
      const voiceStack = this.voices.get(oldest);
      voiceStack?.forEach((voice) => voice.stopImmediately());
      this.voices.delete(oldest);
    }
  }

  private async createVoiceStack(note: number, velocity: number): Promise<EngineVoice[]> {
    const voiceStack: EngineVoice[] = [];
    const mode = this.state.engineMode;

    if (mode === 'synth' || mode === 'hybrid') {
      voiceStack.push(new Voice(this.context, note, velocity, this.state, (endedVoice) => this.removeVoice(endedVoice)));
    }

    if ((mode === 'sample' || mode === 'hybrid') && this.state.sampleLayer.enabled) {
      const preset = sampleBankManager.getPreset(this.state.sampleLayer.bankId, this.state.sampleLayer.presetId);
      if (preset) {
        const zone = sampleBankManager.selectZone(preset, note, velocity);
        if (zone) {
          const buffer = await sampleBankManager.getZoneBuffer(this.context, zone, sampleBankManager.getBaseUrl(this.state.sampleLayer.bankId));
          voiceStack.push(new SamplerVoice(this.context, note, velocity, this.state, { buffer, preset, zone }, (endedVoice) => this.removeVoice(endedVoice)));
        }
      }
    }

    return voiceStack;
  }

  private removeVoice(voice: EngineVoice): void {
    const voiceStack = this.voices.get(voice.note);
    if (!voiceStack) {
      return;
    }

    const nextStack = voiceStack.filter((item) => item !== voice);
    if (nextStack.length > 0) {
      this.voices.set(voice.note, nextStack);
      return;
    }
    this.voices.delete(voice.note);
  }

  private nextNoteToken(note: number): number {
    this.voiceSerial += 1;
    this.noteTokens.set(note, this.voiceSerial);
    return this.voiceSerial;
  }

  private voiceCount(): number {
    let count = 0;
    this.voices.forEach((voiceStack) => {
      count += voiceStack.length;
    });
    return count;
  }
}
