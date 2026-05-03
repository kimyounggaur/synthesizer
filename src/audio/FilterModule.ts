import type { FilterState } from '../types/synth';
import { clamp } from '../utils/audioMath';

export class FilterModule {
  readonly input: GainNode;
  readonly output: GainNode;
  readonly frequency: AudioParam;

  private readonly context: AudioContext;
  private readonly drive: WaveShaperNode;
  private readonly filter: BiquadFilterNode;
  private baseCutoff = 1600;

  constructor(context: AudioContext) {
    this.context = context;
    this.input = context.createGain();
    this.output = context.createGain();
    this.drive = context.createWaveShaper();
    this.filter = context.createBiquadFilter();
    this.frequency = this.filter.frequency;

    this.drive.oversample = '2x';
    this.input.connect(this.drive);
    this.drive.connect(this.filter);
    this.filter.connect(this.output);
  }

  setParams(params: FilterState, noteFrequency: number): void {
    const now = this.context.currentTime;
    const keyTrackedCutoff = params.cutoff + noteFrequency * clamp(params.keyTracking, 0, 1);
    this.baseCutoff = clamp(keyTrackedCutoff, 24, 18000);

    this.filter.type = params.type === 'ladder' ? 'lowpass' : params.type;
    this.filter.frequency.setTargetAtTime(this.baseCutoff, now, 0.02);
    this.filter.Q.setTargetAtTime(clamp(params.resonance, 0.1, 24), now, 0.02);
    this.drive.curve = this.makeDriveCurve(params.type === 'ladder' ? params.drive + 0.35 : params.drive);
  }

  getBaseCutoff(): number {
    return this.baseCutoff;
  }

  connect(destination: AudioNode): void {
    this.output.connect(destination);
  }

  disconnect(): void {
    this.input.disconnect();
    this.drive.disconnect();
    this.filter.disconnect();
    this.output.disconnect();
  }

  private makeDriveCurve(amount: number): Float32Array<ArrayBuffer> {
    const drive = clamp(amount, 0, 1) * 18 + 1;
    const samples = 512;
    const curve = new Float32Array(samples) as Float32Array<ArrayBuffer>;

    for (let i = 0; i < samples; i += 1) {
      const x = (i * 2) / (samples - 1) - 1;
      curve[i] = ((1 + drive) * x) / (1 + drive * Math.abs(x));
    }

    return curve;
  }
}
