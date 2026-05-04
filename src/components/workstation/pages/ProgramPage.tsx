import { useEffect, useMemo, useState } from 'react';
import { factoryPresets } from '../../../presets/factoryPresets';
import { sampleFactoryPresets } from '../../../presets/sampleFactoryPresets';
import { usePresetStore } from '../../../store/presetStore';
import { useSynthStore } from '../../../store/synthStore';
import type { SynthPreset } from '../../../types/synth';
import { MiniDisplay } from '../../ui/MiniDisplay';
import { PresetArtwork } from '../../PresetArtwork';
import { WorkstationBreadcrumb, WorkstationSoftKeys, WorkstationStatusBar } from '../WorkstationLCDChrome';

type ProgramBankId = 'A' | 'B' | 'C';
type ProgramCategoryFilter = SynthPreset['category'] | 'All';

interface ProgramBank {
  id: ProgramBankId;
  label: string;
  name: string;
  detail: string;
  presets: SynthPreset[];
}

const programCategories: ProgramCategoryFilter[] = ['All', 'Bass', 'Lead', 'Pad', 'Piano', 'Strings', 'Drum'];

function programNumber(index: number): string {
  return String(index + 1).padStart(3, '0');
}

function bankTitle(bank: ProgramBank): string {
  return `BANK ${bank.id}: ${bank.name}`;
}

export function ProgramPage() {
  const [selectedBankId, setSelectedBankId] = useState<ProgramBankId>('A');
  const [selectedCategory, setSelectedCategory] = useState<ProgramCategoryFilter>('All');
  const currentPreset = useSynthStore((state) => state.currentPreset);
  const loadPreset = useSynthStore((state) => state.loadPreset);
  const userPresets = usePresetStore((state) => state.userPresets);
  const loadUserPresets = usePresetStore((state) => state.loadUserPresets);

  useEffect(() => {
    loadUserPresets();
  }, [loadUserPresets]);

  const banks = useMemo<ProgramBank[]>(
    () => [
      {
        id: 'A',
        label: 'BANK A',
        name: 'SYNTH',
        detail: 'Factory synth programs',
        presets: factoryPresets,
      },
      {
        id: 'B',
        label: 'BANK B',
        name: 'SAMPLE',
        detail: 'Factory sample programs',
        presets: sampleFactoryPresets,
      },
      {
        id: 'C',
        label: 'BANK C',
        name: 'USER',
        detail: 'Saved user programs',
        presets: userPresets,
      },
    ],
    [userPresets],
  );

  const selectedBank = banks.find((bank) => bank.id === selectedBankId) ?? banks[0];
  const visiblePrograms = useMemo(
    () => selectedBank.presets.filter((preset) => selectedCategory === 'All' || preset.category === selectedCategory),
    [selectedBank.presets, selectedCategory],
  );
  const activeProgram = visiblePrograms.find((preset) => preset.id === currentPreset) ?? visiblePrograms[0] ?? selectedBank.presets[0] ?? null;

  return (
    <div className="workstation-page workstation-lcd-page program-page">
      <header className="workstation-page-header">
        <MiniDisplay eyebrow="PROGRAM" value={activeProgram?.name.toUpperCase() ?? 'NO PROGRAM'} detail={activeProgram ? `${activeProgram.category} / ${activeProgram.author}` : bankTitle(selectedBank)} tone="cyan" />
        <nav className="workstation-tabs" aria-label="Program sections">
          <span className="workstation-tab is-active">BANK</span>
          <span className="workstation-tab">CATEGORY</span>
          <span className="workstation-tab">PROGRAM LIST</span>
        </nav>
      </header>

      <WorkstationBreadcrumb items={['PROGRAM', selectedBank.label, selectedCategory === 'All' ? 'All' : selectedCategory, activeProgram?.name ?? 'No Program']} />

      <div className="program-page-layout">
        <aside className="workstation-side-buttons program-bank-buttons" aria-label="Program banks">
          {banks.map((bank) => (
            <button key={bank.id} type="button" className={selectedBankId === bank.id ? 'workstation-side-button is-active' : 'workstation-side-button'} onClick={() => setSelectedBankId(bank.id)}>
              <span>
                {bank.label}: {bank.name}
              </span>
              <strong>{bank.presets.length}</strong>
            </button>
          ))}

          <div className="program-category-grid" aria-label="Program categories">
            {programCategories.map((category) => {
              const count = category === 'All' ? selectedBank.presets.length : selectedBank.presets.filter((preset) => preset.category === category).length;
              return (
                <button key={category} type="button" className={selectedCategory === category ? 'workstation-side-button is-active' : 'workstation-side-button'} onClick={() => setSelectedCategory(category)}>
                  <span>{category === 'All' ? 'All Categories' : category}</span>
                  <strong>{count}</strong>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="workstation-lcd-frame program-list-frame">
          <div className="workstation-lcd-bezel">
            <div className="workstation-lcd-screen program-lcd-screen">
              <div className="program-list-heading">
                <MiniDisplay eyebrow={bankTitle(selectedBank)} value={`${visiblePrograms.length} PROGRAMS`} detail={selectedCategory === 'All' ? selectedBank.detail : selectedCategory} tone="mint" />
              </div>

              <div className="program-list" aria-label="Program list">
                {visiblePrograms.map((preset, index) => {
                  const active = preset.id === currentPreset;
                  return (
                    <button key={preset.id} type="button" className={active ? 'program-row is-active' : 'program-row'} onClick={() => loadPreset(preset)}>
                      <span className="program-number">{programNumber(index)}</span>
                      <span className="program-name">{preset.name}</span>
                      <span className="program-category">{preset.category}</span>
                    </button>
                  );
                })}
                {visiblePrograms.length === 0 ? <div className="effects-empty workstation-effects-empty">No programs in this category.</div> : null}
              </div>
            </div>
          </div>
        </section>

        <details className="workstation-parameter-rack program-page-rack" open>
          <summary>Program Details</summary>
          <section className="module-block module-block-cyan workstation-card">
            <MiniDisplay eyebrow="Selected Program" value={activeProgram?.name.toUpperCase() ?? 'EMPTY'} detail={activeProgram ? `${activeProgram.category} / ${activeProgram.author}` : 'Choose a bank'} tone="cyan" />
            {activeProgram ? (
              <PresetArtwork preset={activeProgram} engine={activeProgram.engine} size="thumb" />
            ) : null}
            <button type="button" className="soft-button program-load-button" disabled={!activeProgram} onClick={() => activeProgram && loadPreset(activeProgram)}>
              Load Program
            </button>
          </section>

          <section className="module-block module-block-amber workstation-card">
            <MiniDisplay eyebrow="Bank Info" value={bankTitle(selectedBank)} detail={selectedBank.detail} tone="amber" />
            <div className="program-bank-stats">
              <span>Total</span>
              <strong>{selectedBank.presets.length}</strong>
              <span>Visible</span>
              <strong>{visiblePrograms.length}</strong>
              <span>Category</span>
              <strong>{selectedCategory}</strong>
            </div>
          </section>
        </details>
      </div>

      <WorkstationSoftKeys />
      <WorkstationStatusBar message={activeProgram ? `${bankTitle(selectedBank)} / ${activeProgram.name}` : bankTitle(selectedBank)} status="READY" />
    </div>
  );
}
