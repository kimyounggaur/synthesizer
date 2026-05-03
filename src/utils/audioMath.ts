export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function midiNoteToFrequency(note: number): number {
  return 440 * 2 ** ((note - 69) / 12);
}

export function semitoneRatio(semitones: number): number {
  return 2 ** (semitones / 12);
}

export function centsToDetune(cents: number): number {
  return cents;
}

export function normalizeVelocity(velocity: number): number {
  return clamp(velocity, 0, 1);
}

export function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function dbToGain(db: number): number {
  return 10 ** (db / 20);
}
