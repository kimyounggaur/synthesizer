import type { LfoState } from '../types/synth';

export class LFOModule {
  readonly output: GainNode;

  private readonly context: AudioContext;
  private oscillator: OscillatorNode;
  private state: LfoState;

  constructor(context: AudioContext, state: LfoState) {
    this.context = context;
    this.state = state;
    this.oscillator = this.createOscillator();
    this.output = context.createGain();
    this.output.gain.value = state.depth;
    this.oscillator.connect(this.output);
  }

  start(when = this.context.currentTime): void {
    this.oscillator.start(when);
  }

  connect(destination: AudioParam): void {
    this.output.connect(destination);
  }

  update(state: LfoState): void {
    this.state = state;
    this.oscillator.frequency.setTargetAtTime(state.rate, this.context.currentTime, 0.02);
    this.output.gain.setTargetAtTime(state.depth, this.context.currentTime, 0.02);
  }

  stop(when = this.context.currentTime): void {
    this.oscillator.stop(when);
  }

  disconnect(): void {
    this.output.disconnect();
    this.oscillator.disconnect();
  }

  private createOscillator(): OscillatorNode {
    const oscillator = this.context.createOscillator();
    oscillator.type = this.state.waveform === 'pulse' || this.state.waveform === 'wavetable' ? 'triangle' : this.state.waveform;
    oscillator.frequency.value = this.state.rate;
    return oscillator;
  }
}
