import { useEffect, useMemo, useState } from 'react';
import { getCachedSampleBank, getCachedSamplePreset, loadPublicSampleBanks } from '../../../samples/sampleBankLibrary';
import { useSynthStore } from '../../../store/synthStore';
import type { EngineMode, SampleBankManifest, SampleCategory, SamplePresetDefinition } from '../../../types/soundfont';
import { Knob } from '../../ui/Knob';
import { LedButton } from '../../ui/LedButton';
import { MiniDisplay } from '../../ui/MiniDisplay';

type SampleFilter = SampleCategory | 'All';

interface BrowserSamplePreset {
  bankId: string;
  bankName: string;
  bankLicense: string;
  preset: SamplePresetDefinition;
}

const engineModes: EngineMode[] = ['synth', 'sample', 'hybrid'];
const sampleCategoryOrder: SampleCategory[] = [
  'Piano',
  'E-Piano',
  'Organ',
  'Strings',
  'Choir',
  'Brass',
  'Woodwind',
  'Guitar',
  'Bass',
  'Bell',
  'Mallet',
  'Drum',
  'FX',
  'Experimental',
];

function modeLabel(mode: EngineMode): string {
  return mode === 'synth' ? 'Synth' : mode === 'sample' ? 'Sample' : 'Hybrid';
}

function formatTime(value: number): string {
  return value >= 1 ? `${value.toFixed(2)}s` : `${Math.round(value * 1000)}ms`;
}

function formatCutoff(value: number): string {
  return value >= 1000 ? `${(value / 1000).toFixed(1)} kHz` : `${Math.round(value)} Hz`;
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function SamplePage() {
  const [query, setQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<SampleFilter>('All');
  const [selectedBankId, setSelectedBankId] = useState<string>('All');
  const [banks, setBanks] = useState<SampleBankManifest[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const engineMode = useSynthStore((state) => state.engineMode);
  const sampleLayer = useSynthStore((state) => state.sampleLayer);
  const setEngineMode = useSynthStore((state) => state.setEngineMode);
  const updateSampleLayer = useSynthStore((state) => state.updateSampleLayer);
  const selectSamplePreset = useSynthStore((state) => state.selectSamplePreset);

  useEffect(() => {
    let mounted = true;
    loadPublicSampleBanks()
      .then((manifests) => {
        if (mounted) {
          setBanks(manifests);
          setMessage(null);
        }
      })
      .catch((error) => {
        if (mounted) {
          setMessage(error instanceof Error ? error.message : 'Sample bank manifest failed to load.');
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const presets = useMemo<BrowserSamplePreset[]>(
    () =>
      banks.flatMap((bank) =>
        bank.presets.map((preset) => ({
          bankId: bank.id,
          bankName: bank.name,
          bankLicense: bank.license,
          preset,
        })),
      ),
    [banks],
  );

  const categoryCounts = useMemo(
    () =>
      sampleCategoryOrder
        .map((category) => ({
          category,
          count: presets.filter((item) => item.preset.category === category).length,
        }))
        .filter(({ count }) => count > 0),
    [presets],
  );

  const visiblePresets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return presets.filter((item) => {
      const matchesBank = selectedBankId === 'All' || item.bankId === selectedBankId;
      const matchesCategory = selectedFilter === 'All' || item.preset.category === selectedFilter;
      const searchable = `${item.preset.name} ${item.preset.category} ${item.preset.author} ${item.bankName}`.toLowerCase();
      return matchesBank && matchesCategory && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [presets, query, selectedBankId, selectedFilter]);

  const activePreset = getCachedSamplePreset(sampleLayer.bankId, sampleLayer.presetId);
  const activeBank = getCachedSampleBank(sampleLayer.bankId);

  const handlePreload = () => {
    if (!sampleLayer.bankId || !sampleLayer.presetId) {
      setMessage('Select a sample preset before preloading.');
      return;
    }
    updateSampleLayer({ preload: true });
    setMessage('Preload requested for the active sample preset.');
  };

  return (
    <div className="workstation-page workstation-lcd-page sample-page">
      <header className="workstation-page-header">
        <MiniDisplay eyebrow="SAMPLE" value={activePreset?.name.toUpperCase() ?? 'NO SAMPLE'} detail={activeBank?.name ?? `${visiblePresets.length} presets`} tone="mint" />
        <nav className="workstation-tabs" aria-label="Sample sections">
          <span className="workstation-tab is-active">BROWSER</span>
          <span className="workstation-tab">LAYER</span>
          <span className="workstation-tab">FILTER</span>
        </nav>
      </header>

      <div className="sample-page-layout">
        <aside className="workstation-side-buttons sample-page-sidebar" aria-label="Sample bank and category filters">
          <label className="compact-control workstation-select-control">
            <span className="control-label">Bank</span>
            <select className="mini-select panel-select" value={selectedBankId} onChange={(event) => setSelectedBankId(event.target.value)}>
              <option value="All">All banks</option>
              {banks.map((bank) => (
                <option key={bank.id} value={bank.id}>
                  {bank.name}
                </option>
              ))}
            </select>
          </label>

          <button type="button" className={selectedFilter === 'All' ? 'workstation-side-button is-active' : 'workstation-side-button'} onClick={() => setSelectedFilter('All')}>
            <span>All Samples</span>
            <strong>{presets.length}</strong>
          </button>
          {categoryCounts.map(({ category, count }) => (
            <button key={category} type="button" className={selectedFilter === category ? 'workstation-side-button is-active' : 'workstation-side-button'} onClick={() => setSelectedFilter(category)}>
              <span>{category}</span>
              <strong>{count}</strong>
            </button>
          ))}
        </aside>

        <section className="workstation-lcd-frame sample-page-browser">
          <div className="workstation-lcd-bezel">
            <div className="workstation-lcd-screen">
              <div className="sample-page-search">
                <MiniDisplay eyebrow="Sample Browser" value={`${visiblePresets.length} SOUNDS`} detail={selectedFilter === 'All' ? 'All categories' : selectedFilter} tone="cyan" />
                <input className="mini-input panel-input" value={query} placeholder="Search sample presets" onChange={(event) => setQuery(event.target.value)} />
              </div>

              <div className="sample-page-list" aria-label="Sample presets">
                {visiblePresets.map((item) => {
                  const active = item.bankId === sampleLayer.bankId && item.preset.id === sampleLayer.presetId;
                  return (
                    <button key={`${item.bankId}:${item.preset.id}`} type="button" className={active ? 'sample-page-row is-active' : 'sample-page-row'} onClick={() => selectSamplePreset(item.bankId, item.preset.id)}>
                      <span className="workstation-led-dot is-small" />
                      <span>
                        <strong>{item.preset.name}</strong>
                        <em>
                          {item.preset.category} / {item.bankName}
                        </em>
                      </span>
                      <small>{item.preset.zones.length} zones</small>
                    </button>
                  );
                })}
                {visiblePresets.length === 0 ? <div className="effects-empty workstation-effects-empty">No sample presets found.</div> : null}
              </div>
            </div>
          </div>
        </section>

        <aside className="workstation-parameter-rack sample-page-rack">
          <section className="module-block module-block-mint workstation-card">
            <MiniDisplay eyebrow="Layer" value={sampleLayer.enabled ? 'ON' : 'OFF'} detail={activePreset?.license ?? activeBank?.license ?? 'Select preset'} tone="mint" />
            <div className="sample-page-toggle-grid">
              <LedButton active={sampleLayer.enabled} onClick={() => updateSampleLayer({ enabled: !sampleLayer.enabled })}>
                Layer
              </LedButton>
              <LedButton active={sampleLayer.preload} onClick={handlePreload}>
                Preload
              </LedButton>
              <LedButton active={sampleLayer.oneShot} onClick={() => updateSampleLayer({ oneShot: !sampleLayer.oneShot })}>
                One Shot
              </LedButton>
            </div>
            <div className="workstation-knob-grid sample-page-knobs">
              <Knob label="Level" min={0} max={1.5} step={0.01} value={sampleLayer.level} onChange={(value) => updateSampleLayer({ level: value })} displayValue={formatPercent(sampleLayer.level)} tone="mint" />
              <Knob label="Attack" min={0.001} max={4} step={0.001} value={sampleLayer.attack} onChange={(value) => updateSampleLayer({ attack: value })} displayValue={formatTime(sampleLayer.attack)} tone="violet" />
              <Knob label="Release" min={0.001} max={6} step={0.001} value={sampleLayer.release} onChange={(value) => updateSampleLayer({ release: value })} displayValue={formatTime(sampleLayer.release)} tone="violet" />
            </div>
          </section>

          <section className="module-block module-block-amber workstation-card">
            <MiniDisplay eyebrow="Sample Filter" value={sampleLayer.filterEnabled ? 'ON' : 'OFF'} detail={formatCutoff(sampleLayer.filterCutoff)} tone="amber" />
            <LedButton active={sampleLayer.filterEnabled} onClick={() => updateSampleLayer({ filterEnabled: !sampleLayer.filterEnabled })}>
              Filter
            </LedButton>
            <div className="workstation-knob-grid sample-page-knobs">
              <Knob label="Cutoff" min={24} max={20000} step={1} value={sampleLayer.filterCutoff} onChange={(value) => updateSampleLayer({ filterCutoff: value })} displayValue={formatCutoff(sampleLayer.filterCutoff)} tone="amber" />
              <Knob label="Res" min={0.1} max={24} step={0.1} value={sampleLayer.filterResonance} onChange={(value) => updateSampleLayer({ filterResonance: value })} tone="amber" />
            </div>
          </section>

          <section className="module-block module-block-cyan workstation-card">
            <MiniDisplay eyebrow="Engine" value={modeLabel(engineMode).toUpperCase()} detail="Sample playback mode" tone="cyan" />
            <div className="sample-page-engine-grid">
              {engineModes.map((mode) => (
                <button key={mode} type="button" className={engineMode === mode ? 'performance-button is-active' : 'performance-button'} onClick={() => setEngineMode(mode)}>
                  <span className="workstation-led-dot is-small" />
                  {modeLabel(mode)}
                </button>
              ))}
            </div>
          </section>

          {message ? <div className="sample-bank-error">{message}</div> : null}
        </aside>
      </div>

      <footer className="workstation-status-bar">
        <span>{activePreset ? `${activePreset.name} loaded` : 'No sample loaded'}</span>
        <strong>{sampleLayer.preload ? 'PRELOAD READY' : 'PRELOAD OFF'}</strong>
      </footer>
    </div>
  );
}
