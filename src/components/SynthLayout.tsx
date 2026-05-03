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
import { LFOPanel } from './LFOPanel';
import { VectorMixerPanel } from './VectorMixerPanel';
import { WaveSequencerPanel } from './WaveSequencerPanel';
import { EffectsPanel } from './EffectsPanel';

const silentMeter: MeterSnapshot = { peak: 0, rms: 0, clipping: false, audioState: 'unavailable', activeVoices: 0 };
const PANEL_LAYOUT_KEY = 'wave-vector-hybrid-synth:panel-layout';

type MovablePanelId = 'oscillators' | 'filter' | 'envelopes' | 'presets' | 'lfo' | 'vector' | 'waveSeq' | 'effects';
type MoveDirection = 'first' | 'previous' | 'next' | 'last';

const defaultPanelOrder: MovablePanelId[] = ['oscillators', 'filter', 'envelopes', 'presets', 'lfo', 'vector', 'waveSeq', 'effects'];

const panelLabels: Record<MovablePanelId, string> = {
  oscillators: 'Oscillators',
  filter: 'Filter',
  envelopes: 'Envelopes',
  presets: 'Presets',
  lfo: 'LFO',
  vector: 'Vector',
  waveSeq: 'Wave Seq',
  effects: 'Effects',
};

function readPanelOrder(): MovablePanelId[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PANEL_LAYOUT_KEY) ?? '[]') as unknown;
    if (!Array.isArray(parsed)) {
      return defaultPanelOrder;
    }
    const next = parsed.filter((value): value is MovablePanelId => defaultPanelOrder.includes(value as MovablePanelId));
    if (next.length !== defaultPanelOrder.length) {
      return defaultPanelOrder;
    }
    return next;
  } catch {
    return defaultPanelOrder;
  }
}

function movePanelOrder(order: MovablePanelId[], panelId: MovablePanelId, direction: MoveDirection): MovablePanelId[] {
  const from = order.indexOf(panelId);
  if (from < 0) {
    return order;
  }

  const to =
    direction === 'first'
      ? 0
      : direction === 'last'
        ? order.length - 1
        : direction === 'previous'
          ? Math.max(0, from - 1)
          : Math.min(order.length - 1, from + 1);

  if (from === to) {
    return order;
  }

  const next = [...order];
  const [panel] = next.splice(from, 1);
  next.splice(to, 0, panel);
  return next;
}

export function SynthLayout() {
  const engineRef = useRef<AudioEngine | null>(null);
  const testToneTimerRef = useRef<number | null>(null);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [meter, setMeter] = useState<MeterSnapshot>(silentMeter);
  const [panelOrder, setPanelOrder] = useState<MovablePanelId[]>(readPanelOrder);
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
        if (testToneTimerRef.current !== null) {
          window.clearTimeout(testToneTimerRef.current);
          testToneTimerRef.current = null;
        }
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

  useEffect(() => {
    try {
      window.localStorage.setItem(PANEL_LAYOUT_KEY, JSON.stringify(panelOrder));
    } catch {
      // Layout persistence is optional; panel movement still works without storage.
    }
  }, [panelOrder]);

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
    if (testToneTimerRef.current !== null) {
      window.clearTimeout(testToneTimerRef.current);
      testToneTimerRef.current = null;
    }
    engineRef.current?.panic();
    clearActiveNotes();
  }, [clearActiveNotes]);

  const handleTestTone = useCallback(() => {
    const note = 72;
    const velocity = 0.82;

    if (testToneTimerRef.current !== null) {
      window.clearTimeout(testToneTimerRef.current);
      clearActiveNote(note);
    }

    setActiveNote(note, velocity);
    void engineRef.current?.noteOn(note, velocity);

    testToneTimerRef.current = window.setTimeout(() => {
      engineRef.current?.noteOff(note);
      clearActiveNote(note);
      testToneTimerRef.current = null;
    }, 650);
  }, [clearActiveNote, setActiveNote]);

  const handleMovePanel = useCallback((panelId: MovablePanelId, direction: MoveDirection) => {
    setPanelOrder((order) => movePanelOrder(order, panelId, direction));
  }, []);

  const renderPanel = (panelId: MovablePanelId) => {
    if (panelId === 'oscillators') {
      return <OscillatorPanel />;
    }
    if (panelId === 'filter') {
      return <FilterPanel />;
    }
    if (panelId === 'envelopes') {
      return <EnvelopePanel />;
    }
    if (panelId === 'presets') {
      return <PresetBrowser meter={meter} />;
    }
    if (panelId === 'lfo') {
      return <LFOPanel />;
    }
    if (panelId === 'vector') {
      return <VectorMixerPanel />;
    }
    if (panelId === 'waveSeq') {
      return <WaveSequencerPanel />;
    }
    return <EffectsPanel />;
  };

  return (
    <main className="synth-workbench min-h-screen p-2 text-slate-100 md:p-3">
      <div className="hardware-shell flex w-full max-w-none flex-col gap-4 p-3 md:p-4">
        <TopBar onPanic={handlePanic} onTestTone={handleTestTone} meter={meter} />

        {engineError ? (
          <div className="panel border-amber-400/40 p-4 text-sm text-amber-100">{engineError}</div>
        ) : (
          <>
            <section className="movable-console-grid" aria-label="Movable synth panels">
              {panelOrder.map((panelId, index) => (
                <div key={panelId} className={`movable-panel-frame movable-panel-${panelId}`}>
                  <div className="panel-move-controls" aria-label={`${panelLabels[panelId]} layout controls`}>
                    <button type="button" disabled={index === 0} onClick={() => handleMovePanel(panelId, 'first')} aria-label={`${panelLabels[panelId]} move to first`}>
                      |&lt;
                    </button>
                    <button type="button" disabled={index === 0} onClick={() => handleMovePanel(panelId, 'previous')} aria-label={`${panelLabels[panelId]} move previous`}>
                      &lt;
                    </button>
                    <span>{panelLabels[panelId]}</span>
                    <button type="button" disabled={index === panelOrder.length - 1} onClick={() => handleMovePanel(panelId, 'next')} aria-label={`${panelLabels[panelId]} move next`}>
                      &gt;
                    </button>
                    <button type="button" disabled={index === panelOrder.length - 1} onClick={() => handleMovePanel(panelId, 'last')} aria-label={`${panelLabels[panelId]} move to last`}>
                      &gt;|
                    </button>
                  </div>
                  {renderPanel(panelId)}
                </div>
              ))}
            </section>
            <Keyboard onNoteOn={handleNoteOn} onNoteOff={handleNoteOff} />
          </>
        )}
      </div>
    </main>
  );
}
