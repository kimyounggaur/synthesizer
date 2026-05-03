import { useEffect, useMemo, useRef } from 'react';
import { useSynthStore } from '../store/synthStore';

interface KeyboardProps {
  onNoteOn: (note: number, velocity: number) => void;
  onNoteOff: (note: number) => void;
}

const chromaticNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const visibleKeyCount = 37;
const computerMap = new Map<string, number>([
  ['a', 0],
  ['w', 1],
  ['s', 2],
  ['e', 3],
  ['d', 4],
  ['f', 5],
  ['t', 6],
  ['g', 7],
  ['y', 8],
  ['h', 9],
  ['u', 10],
  ['j', 11],
  ['k', 12],
]);

function isBlack(note: number): boolean {
  return [1, 3, 6, 8, 10].includes(note % 12);
}

function noteName(note: number): string {
  const octave = Math.floor(note / 12) - 1;
  return `${chromaticNames[note % 12]}${octave}`;
}

export function Keyboard({ onNoteOn, onNoteOff }: KeyboardProps) {
  const keyboardOctave = useSynthStore((state) => state.keyboardOctave);
  const defaultVelocity = useSynthStore((state) => state.defaultVelocity);
  const activeNotes = useSynthStore((state) => state.activeNotes);
  const setKeyboardOctave = useSynthStore((state) => state.setKeyboardOctave);
  const setDefaultVelocity = useSynthStore((state) => state.setDefaultVelocity);
  const heldKeys = useRef(new Map<string, number>());

  const notes = useMemo(() => {
    const base = (keyboardOctave + 1) * 12;
    return Array.from({ length: visibleKeyCount }, (_, index) => base + index);
  }, [keyboardOctave]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (event.repeat) {
        return;
      }

      if (key === 'z') {
        setKeyboardOctave(keyboardOctave - 1);
        return;
      }

      if (key === 'x') {
        setKeyboardOctave(keyboardOctave + 1);
        return;
      }

      const offset = computerMap.get(key);
      if (offset === undefined) {
        return;
      }

      const note = (keyboardOctave + 1) * 12 + offset;
      heldKeys.current.set(key, note);
      onNoteOn(note, defaultVelocity);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const note = heldKeys.current.get(key);
      if (note === undefined) {
        return;
      }
      heldKeys.current.delete(key);
      onNoteOff(note);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [defaultVelocity, keyboardOctave, onNoteOff, onNoteOn, setKeyboardOctave]);

  return (
    <section className="panel grid gap-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="panel-title">Keyboard</h2>
        <div className="flex flex-wrap items-center gap-3">
          <button className="soft-button h-9 px-3" onClick={() => setKeyboardOctave(keyboardOctave - 1)}>
            Oct -
          </button>
          <div className="lcd px-3 py-2 font-mono text-sm">OCT {keyboardOctave}</div>
          <button className="soft-button h-9 px-3" onClick={() => setKeyboardOctave(keyboardOctave + 1)}>
            Oct +
          </button>
          <label className="grid w-36 gap-1">
            <span className="control-label">Velocity</span>
            <input
              className="range"
              type="range"
              min={0.05}
              max={1}
              step={0.01}
              value={defaultVelocity}
              onChange={(event) => setDefaultVelocity(Number(event.target.value))}
            />
          </label>
        </div>
      </div>

      <div className="flex min-h-44 overflow-x-auto rounded-md border border-slate-700 bg-black/40 p-2">
        {notes.map((note) => {
          const black = isBlack(note);
          const active = activeNotes[note] !== undefined;
          const velocity = activeNotes[note] ?? 0;
          return (
            <button
              key={note}
              className={`keyboard-key relative mr-1 flex shrink-0 items-end justify-center px-1 pb-3 font-mono text-[0.68rem] ${
                black
                  ? 'h-28 w-8 bg-slate-950 text-slate-400 shadow-inner'
                  : 'h-40 w-11 bg-slate-200 text-slate-950'
              }`}
              style={{
                filter: active ? `brightness(${1.1 + velocity * 0.45})` : undefined,
                background: active ? `linear-gradient(180deg, rgba(255,95,24,${0.42 + velocity * 0.34}), ${black ? '#ff5a15' : '#fffefe'})` : undefined,
              }}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                onNoteOn(note, defaultVelocity);
              }}
              onPointerUp={(event) => {
                event.currentTarget.releasePointerCapture(event.pointerId);
                onNoteOff(note);
              }}
              onPointerCancel={() => onNoteOff(note)}
              onPointerLeave={(event) => {
                if (event.buttons > 0) {
                  onNoteOff(note);
                }
              }}
            >
              {noteName(note)}
            </button>
          );
        })}
      </div>
    </section>
  );
}
