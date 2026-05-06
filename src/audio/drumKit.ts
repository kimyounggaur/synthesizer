export type DrumSoundId =
  | 'kick'
  | 'snare'
  | 'closedHat'
  | 'openHat'
  | 'clap'
  | 'lowTom'
  | 'midTom'
  | 'highTom'
  | 'rim'
  | 'cowbell'
  | 'crash'
  | 'ride'
  | 'shaker'
  | 'tambourine'
  | 'click'
  | 'subDrop';

export interface DrumPadDefinition {
  id: number;
  sound: DrumSoundId;
  name: string;
  keyCode: string;
  keyLabel: string;
  rowTone: 'blue' | 'pink' | 'violet' | 'cream';
}

export const drumPadMap: DrumPadDefinition[] = [
  { id: 13, sound: 'crash', name: 'Crash', keyCode: 'Numpad3', keyLabel: 'N3', rowTone: 'blue' },
  { id: 14, sound: 'ride', name: 'Ride', keyCode: 'Numpad4', keyLabel: 'N4', rowTone: 'blue' },
  { id: 15, sound: 'shaker', name: 'Shaker', keyCode: 'Numpad5', keyLabel: 'N5', rowTone: 'blue' },
  { id: 16, sound: 'tambourine', name: 'Tamb', keyCode: 'Numpad6', keyLabel: 'N6', rowTone: 'blue' },
  { id: 9, sound: 'rim', name: 'Rim', keyCode: 'Digit9', keyLabel: '9', rowTone: 'pink' },
  { id: 10, sound: 'cowbell', name: 'Cowbell', keyCode: 'Digit0', keyLabel: '0', rowTone: 'pink' },
  { id: 11, sound: 'click', name: 'Click', keyCode: 'Numpad1', keyLabel: 'N1', rowTone: 'pink' },
  { id: 12, sound: 'subDrop', name: 'Sub Drop', keyCode: 'Numpad2', keyLabel: 'N2', rowTone: 'pink' },
  { id: 5, sound: 'clap', name: 'Clap', keyCode: 'Digit5', keyLabel: '5', rowTone: 'violet' },
  { id: 6, sound: 'lowTom', name: 'Low Tom', keyCode: 'Digit6', keyLabel: '6', rowTone: 'violet' },
  { id: 7, sound: 'midTom', name: 'Mid Tom', keyCode: 'Digit7', keyLabel: '7', rowTone: 'violet' },
  { id: 8, sound: 'highTom', name: 'High Tom', keyCode: 'Digit8', keyLabel: '8', rowTone: 'violet' },
  { id: 1, sound: 'kick', name: 'Kick', keyCode: 'Digit1', keyLabel: '1', rowTone: 'cream' },
  { id: 2, sound: 'snare', name: 'Snare', keyCode: 'Digit2', keyLabel: '2', rowTone: 'cream' },
  { id: 3, sound: 'closedHat', name: 'Closed Hat', keyCode: 'Digit3', keyLabel: '3', rowTone: 'cream' },
  { id: 4, sound: 'openHat', name: 'Open Hat', keyCode: 'Digit4', keyLabel: '4', rowTone: 'cream' },
];
