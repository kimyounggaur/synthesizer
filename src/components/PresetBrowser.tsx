import { useEffect, useMemo, useState } from 'react';
import { factoryPresets } from '../presets/factoryPresets';
import { usePresetStore } from '../store/presetStore';
import { selectEngineState, useSynthStore } from '../store/synthStore';
import { createUserPreset, exportPresets, parsePresetImport } from '../utils/presetStorage';

export function PresetBrowser() {
  const [query, setQuery] = useState('');
  const [importText, setImportText] = useState('');
  const loadPreset = useSynthStore((state) => state.loadPreset);
  const savePresetMarker = useSynthStore((state) => state.savePreset);
  const userPresets = usePresetStore((state) => state.userPresets);
  const loadUserPresets = usePresetStore((state) => state.loadUserPresets);
  const saveUserPreset = usePresetStore((state) => state.saveUserPreset);
  const deleteUserPreset = usePresetStore((state) => state.deleteUserPreset);
  const importUserPresets = usePresetStore((state) => state.importUserPresets);

  useEffect(() => {
    loadUserPresets();
  }, [loadUserPresets]);

  const presets = useMemo(() => {
    const all = [...factoryPresets, ...userPresets];
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return all;
    }
    return all.filter((preset) => `${preset.name} ${preset.category}`.toLowerCase().includes(normalizedQuery));
  }, [query, userPresets]);

  const handleSave = () => {
    const name = window.prompt('Preset name');
    if (!name?.trim()) {
      return;
    }
    const preset = createUserPreset(name.trim(), selectEngineState(useSynthStore.getState()));
    saveUserPreset(preset);
    savePresetMarker(preset.id);
  };

  const handleExport = async () => {
    await navigator.clipboard.writeText(exportPresets(userPresets));
  };

  const handleImport = () => {
    try {
      importUserPresets(parsePresetImport(importText));
      setImportText('');
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Preset import failed.');
    }
  };

  return (
    <section className="panel grid gap-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="panel-title">Presets</h2>
        <button className="soft-button h-9 px-3" onClick={handleSave}>
          Save
        </button>
      </div>

      <input className="mini-input" value={query} placeholder="Search" onChange={(event) => setQuery(event.target.value)} />

      <div className="grid max-h-64 gap-2 overflow-y-auto pr-1">
        {presets.map((preset) => {
          const userOwned = preset.author === 'User';
          return (
            <div key={preset.id} className="grid grid-cols-[1fr_auto] gap-2 rounded-md border border-slate-700/70 bg-black/20 p-2">
              <button className="text-left" onClick={() => loadPreset(preset)}>
                <div className="truncate text-sm font-semibold text-slate-100">{preset.name}</div>
                <div className="font-mono text-[0.68rem] uppercase tracking-wider text-slate-500">{preset.category}</div>
              </button>
              {userOwned ? (
                <button className="soft-button h-8 px-2 text-xs" onClick={() => deleteUserPreset(preset.id)}>
                  Del
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="grid gap-2 border-t border-slate-700/60 pt-3">
        <div className="grid grid-cols-2 gap-2">
          <button className="soft-button h-9 px-3" onClick={handleExport}>
            Export
          </button>
          <button className="soft-button h-9 px-3" onClick={handleImport}>
            Import
          </button>
        </div>
        <textarea
          className="mini-input min-h-20 resize-y font-mono text-xs"
          value={importText}
          placeholder="JSON"
          onChange={(event) => setImportText(event.target.value)}
        />
      </div>
    </section>
  );
}
