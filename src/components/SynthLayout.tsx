import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioEngine } from '../audio/AudioEngine';
import type { MeterSnapshot } from '../types/synth';
import { selectEngineState, useSynthStore } from '../store/synthStore';
import { TopBar } from './TopBar';
import { Keyboard } from './Keyboard';
import { OscillatorPanel } from './OscillatorPanel';
import { FilterPanel } from './FilterPanel';
import { EnvelopePanel } from './EnvelopePanel';
import { PresetBrowser } from './PresetBrowser';

const silentMeter: MeterSnapshot = { peak: 0, rms: 0, clipping: false };

export function SynthLayout() {
  const engineRef = useRef<AudioEngine | null>(null);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [meter, setMeter] = useState<MeterSnapshot>(silentMeter);
  const setActiveNote = useSynthStore((state) => state.setActiveNote);
  const clearActiveNote = useSynthStore((state) => state.clearActiveNote);
  const clearActiveNotes = useSynthStore((state) => state.clearActiveNotes);

  useEffect(() => {
    try {
      const engine = new AudioEngine(selectEngineState(useSynthStore.getState()));
      engineRef.current = engine;
      const unsubscribe = useSynthStore.subscribe((state) => {
        engine.setState(selectEngineState(state));
      });

      return () => {
        unsubscribe();
        engine.close();
        engineRef.current = null;
      };
    } catch (error) {
      setEngineError(error instanceof Error ? error.message : 'Audio engine failed to start.');
      return undefined;
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setMeter(engineRef.current?.getAnalyserData() ?? silentMeter);
    }, 100);
    return () => window.clearInterval(timer);
  }, []);

  const handleNoteOn = useCallback(
    (note: number, velocity: number) => {
      setActiveNote(note, velocity);
      void engineRef.current?.noteOn(note, velocity);
    },
    [setActiveNote],
  );

  const handleNoteOff = useCallback(
    (note: number) => {
      clearActiveNote(note);
      engineRef.current?.noteOff(note);
    },
    [clearActiveNote],
  );

  const handlePanic = useCallback(() => {
    engineRef.current?.panic();
    clearActiveNotes();
  }, [clearActiveNotes]);

  return (
    <main className="synth-workbench min-h-screen p-2 text-slate-100 md:p-3">
      <div className="hardware-shell flex w-full max-w-none flex-col gap-4 p-3 md:p-4">
        <TopBar onPanic={handlePanic} meter={meter} />

        {engineError ? (
          <div className="panel border-amber-400/40 p-4 text-sm text-amber-100">{engineError}</div>
        ) : (
          <>
            <section className="main-console-grid">
              <div className="primary-module-grid">
                <OscillatorPanel />
                <FilterPanel />
                <EnvelopePanel />
              </div>
              <aside className="side-rack-grid">
                <PresetBrowser meter={meter} />
              </aside>
            </section>
            <Keyboard onNoteOn={handleNoteOn} onNoteOff={handleNoteOff} />
          </>
        )}
      </div>
    </main>
  );
}
