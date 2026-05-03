import type { SynthWaveform } from '../types/synth';
import { centsToDetune, clamp, midiNoteToFrequency, semitoneRatio } from '../utils/audioMath';

interface OscillatorModuleOptions {
  waveform: SynthWaveform;
  note: number;
  octave: number;
  semitone: number;
  fine: number;
  level: number;
}

export class OscillatorModule {
  readonly output: GainNode;
  private readonly context: AudioContext;
  private readonly oscillator: OscillatorNode;
  private note = 60;
  private octave = 0;
  private semitone = 0;
  private fine = 0;
  private pitchModCents = 0;
  private started = false;

  constructor(context: AudioContext, options: OscillatorModuleOptions) {
    this.context = context;
    this.oscillator = context.createOscillator();
    this.output = context.createGain();
    this.output.gain.value = clamp(options.level, 0, 1);
    this.applyWaveform(options.waveform);
    this.updatePitch(options.note, options.octave, options.semitone, options.fine);
    this.oscillator.connect(this.output);
  }

  connect(destination: AudioNode): void {
    this.output.connect(destination);
  }

  start(when = this.context.currentTime): void {
    if (this.started) {
      return;
    }
    this.started = true;
    this.oscillator.start(when);
  }

  stop(when = this.context.currentTime): void {
    if (!this.started) {
      return;
    }
    try {
      this.oscillator.stop(when);
    } catch {
      // OscillatorNode throws if a previous stop is already scheduled.
    }
  }

  update(options: OscillatorModuleOptions, transitionTime = 0.012): void {
    const now = this.context.currentTime;
    this.applyWaveform(options.waveform);
    this.updatePitch(options.note, options.octave, options.semitone, options.fine);
    this.output.gain.setTargetAtTime(clamp(options.level, 0, 1), now, transitionTime);
  }

  setPitchMod(cents: number): void {
    this.pitchModCents = clamp(cents, -2400, 2400);
    this.applyPitch();
  }

  disconnect(): void {
    this.output.disconnect();
    this.oscillator.disconnect();
  }

  private updatePitch(note: number, octave: number, semitone: number, fine: number): void {
    this.note = note;
    this.octave = octave;
    this.semitone = semitone;
    this.fine = fine;
    this.applyPitch();
  }

  private applyPitch(): void {
    const now = this.context.currentTime;
    const base = midiNoteToFrequency(this.note) * semitoneRatio(this.octave * 12 + this.semitone);
    this.oscillator.frequency.setTargetAtTime(base, now, 0.01);
    this.oscillator.detune.setTargetAtTime(centsToDetune(this.fine + this.pitchModCents), now, 0.01);
  }

  private applyWaveform(waveform: SynthWaveform): void {
    if (waveform === 'pulse') {
      this.oscillator.setPeriodicWave(this.createPulseWave(0.28));
      return;
    }

    if (waveform === 'wavetable') {
      this.oscillator.setPeriodicWave(this.createWavetableWave());
      return;
    }

    this.oscillator.type = waveform;
  }

  private createPulseWave(dutyCycle: number): PeriodicWave {
    const harmonics = 48;
    const real = new Float32Array(harmonics);
    const imag = new Float32Array(harmonics);

    for (let n = 1; n < harmonics; n += 1) {
      imag[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * dutyCycle);
    }

    return this.context.createPeriodicWave(real, imag, { disableNormalization: false });
  }

  private createWavetableWave(): PeriodicWave {
    const harmonics = 32;
    const real = new Float32Array(harmonics);
    const imag = new Float32Array(harmonics);

    for (let n = 1; n < harmonics; n += 1) {
      const tilt = 1 / n;
      const formant = Math.sin(n * 0.61) * 0.55 + Math.sin(n * 1.17) * 0.25;
      imag[n] = tilt * formant;
      real[n] = tilt * Math.cos(n * 0.37) * 0.18;
    }

    return this.context.createPeriodicWave(real, imag, { disableNormalization: false });
  }
}
