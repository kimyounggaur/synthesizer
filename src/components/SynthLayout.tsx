import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioEngine } from '../audio/AudioEngine';
import type { DrumSoundId } from '../audio/drumKit';
import type { MeterSnapshot } from '../types/synth';
import { selectEngineState, useSynthStore } from '../store/synthStore';
import { useUiStore } from '../store/uiStore';
import { Keyboard } from './Keyboard';
import { DrumPadPanel } from './DrumPadPanel';
import { MidiPanel } from './MidiPanel';
import { WorkstationLcd } from './workstation/WorkstationLcd';
import { WorkstationParameterRack } from './workstation/WorkstationParameterRack';
import { WorkstationPerformanceStrip } from './workstation/WorkstationPerformanceStrip';
import { WorkstationShell } from './workstation/WorkstationShell';
import { WorkstationTabs } from './workstation/WorkstationTabs';
import { WorkstationTopBar } from './workstation/WorkstationTopBar';
import { EffectsPage } from './workstation/pages/EffectsPage';
import { FilterAmpPage } from './workstation/pages/FilterAmpPage';
import { GlobalPage } from './workstation/pages/GlobalPage';
import { ModulationPage } from './workstation/pages/ModulationPage';
import { ProgramPage } from './workstation/pages/ProgramPage';
import { SamplePage } from './workstation/pages/SamplePage';
import { SynthPage } from './workstation/pages/SynthPage';
import { WaveVectorPage } from './workstation/pages/WaveVectorPage';

const silentMeter: MeterSnapshot = { peak: 0, rms: 0, clipping: false, audioState: 'unavailable', activeVoices: 0 };

export function SynthLayout() {
  const engineRef = useRef<AudioEngine | null>(null);
  const testToneTimerRef = useRef<number | null>(null);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [meter, setMeter] = useState<MeterSnapshot>(silentMeter);
  const activeWorkstationPage = useUiStore((state) => state.activeWorkstationPage);
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

  const handleDrumPadTrigger = useCallback((sound: DrumSoundId, velocity: number) => {
    void engineRef.current?.playDrum(sound, velocity);
  }, []);

  const renderPage = () => {
    if (activeWorkstationPage === 'program') {
      return <ProgramPage />;
    }
    if (activeWorkstationPage === 'sample') {
      return <SamplePage />;
    }
    if (activeWorkstationPage === 'synth') {
      return <SynthPage />;
    }
    if (activeWorkstationPage === 'filterAmp') {
      return <FilterAmpPage />;
    }
    if (activeWorkstationPage === 'modulation') {
      return <ModulationPage />;
    }
    if (activeWorkstationPage === 'waveVector') {
      return <WaveVectorPage />;
    }
    if (activeWorkstationPage === 'effects') {
      return <EffectsPage />;
    }
    return <GlobalPage onPanic={handlePanic} />;
  };

  return (
    <WorkstationShell
      topBar={<WorkstationTopBar onPanic={handlePanic} onTestTone={handleTestTone} meter={meter} drumPads={<DrumPadPanel onTrigger={handleDrumPadTrigger} />} />}
      tabs={<WorkstationTabs />}
      lcd={<WorkstationLcd activePageId={activeWorkstationPage}>{renderPage()}</WorkstationLcd>}
      parameterRack={<WorkstationParameterRack meter={meter} onPanic={handlePanic} onTestTone={handleTestTone} />}
      performanceStrip={<WorkstationPerformanceStrip onPanic={handlePanic} onTestTone={handleTestTone} midiPanel={<MidiPanel onNoteOn={handleNoteOn} onNoteOff={handleNoteOff} onPanic={handlePanic} />} />}
      keybed={<Keyboard onNoteOn={handleNoteOn} onNoteOff={handleNoteOff} />}
      engineError={engineError}
    />
  );
}
