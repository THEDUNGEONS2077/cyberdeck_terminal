/**
 * src/app/modules/SearchModule.tsx: the SEARCH module: a field that
 * searches the web with your engine, and its SETTINGS (which engine).
 *
 * Layer: UI. Enter opens the engine's results in a new tab, as every link
 * here opens (`noopener,noreferrer`); the page itself sends nothing
 * (lib/search.ts builds the address). The field is cleared once the search
 * is open, ready for the next.
 */
import { type FormEvent, useId, useState } from 'react';

import { setSettings } from '@/lib/modules';
import { ENGINES, type EngineId, type SearchSettings, engineOf, isTemplate } from '@/lib/search';
import { editStore } from '@/store/edit';

import { G } from '../glyphs';
import { openSearch } from './actions';
import type { ModuleProps } from './catalog';

/** The search field. */
export function Panel({ module }: ModuleProps) {
  const [query, setQuery] = useState('');
  if (module.kind !== 'search') return null;
  const engine = engineOf(module.settings);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (openSearch(module.settings, query)) setQuery('');
  };
  return (
    <form className="search-form" role="search" onSubmit={submit}>
      <span className="prompt" aria-hidden>
        {G.prompt}
      </span>
      <input
        className="module-input"
        type="search"
        aria-label={`Search the web with ${engine.label}`}
        placeholder={`SEARCH ${engine.label}`}
        spellCheck={false}
        autoComplete="off"
        enterKeyHint="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button type="submit" className="text-btn small-btn" disabled={!query.trim()} title="Search (Enter): opens in a new tab">
        GO <span aria-hidden>{G.external}</span>
      </button>
    </form>
  );
}

/** SETTINGS: the engine, and a custom engine's address. */
export function Settings({ module }: ModuleProps) {
  const labelId = useId();
  const fieldId = useId();
  const [custom, setCustom] = useState(module.kind === 'search' ? module.settings.custom : '');
  if (module.kind !== 'search') return null;
  const { settings } = module;
  const save = (next: SearchSettings) => editStore.getState().apply((s) => ({ ...s, modules: setSettings(s.modules, module.id, 'search', next) }));
  const usable = isTemplate(custom.trim());
  const choose = (engine: EngineId) => {
    // Custom needs a usable address first: until then the choice waits for one.
    if (engine === 'custom' && !usable) return;
    save({ ...settings, engine, custom: usable ? custom.trim() : settings.custom });
  };
  return (
    <div className="settings-group">
      <span className="setting-label" id={labelId}>
        ENGINE
      </span>
      <div className="dialog-choices" role="radiogroup" aria-labelledby={labelId}>
        {ENGINES.map((e) => (
          <label key={e.id} className="dialog-choice">
            <input type="radio" name={`engine-${module.id}`} value={e.id} checked={settings.engine === e.id} disabled={e.id === 'custom' && !usable} onChange={() => choose(e.id)} />
            <span>{e.label}</span>
            {e.template && <span className="small dim">{e.template.replace('%s', '…')}</span>}
          </label>
        ))}
      </div>
      <label className="setting-label" htmlFor={fieldId}>
        CUSTOM ENGINE · AN ADDRESS WITH %s WHERE THE WORDS GO
      </label>
      <div className="field-row">
        <input
          id={fieldId}
          className="module-input boxed"
          type="url"
          placeholder="https://search.example/?q=%s"
          spellCheck={false}
          autoComplete="off"
          value={custom}
          aria-invalid={custom.trim() !== '' && !usable}
          onChange={(e) => setCustom(e.target.value)}
        />
        <button type="button" className="text-btn small-btn primary" disabled={!usable} onClick={() => save({ engine: 'custom', custom: custom.trim() })}>
          USE IT
        </button>
      </div>
      {custom.trim() !== '' && !usable && <p className="small dim">IT NEEDS TO START WITH https:// (OR http://) AND HOLD %s.</p>}
    </div>
  );
}
