import type { EnvelopeState } from '../types/synth';
import { clamp } from '../utils/audioMath';

export class EnvelopeModule {
  private readonly context: AudioContext;
  private readonly target: AudioParam;

  constructor(context: AudioContext, target: AudioParam) {
    this.context = context;
    this.target = target;
  }

  triggerAttack(envelope: EnvelopeState, peakValue: number, startTime = this.context.currentTime): void {
    const attack = Math.max(0.001, envelope.attack);
    const decay = Math.max(0.001, envelope.decay);
    const sustain = clamp(envelope.sustain, 0, 1);
    const peak = Math.max(0.0001, peakValue);
    const sustainValue = Math.max(0.0001, peak * sustain);

    this.hold(startTime);
    this.target.setValueAtTime(0.0001, startTime);
    this.target.linearRampToValueAtTime(peak, startTime + attack);
    this.target.exponentialRampToValueAtTime(sustainValue, startTime + attack + decay);
  }

  triggerRelease(envelope: EnvelopeState, startTime = this.context.currentTime): number {
    const release = Math.max(0.001, envelope.release);
    this.hold(startTime);
    this.target.exponentialRampToValueAtTime(0.0001, startTime + release);
    return startTime + release;
  }

  private hold(time: number): void {
    try {
      this.target.cancelAndHoldAtTime(time);
    } catch {
      const currentValue = Math.max(0.0001, this.target.value);
      this.target.cancelScheduledValues(time);
      this.target.setValueAtTime(currentValue, time);
    }
  }
}
