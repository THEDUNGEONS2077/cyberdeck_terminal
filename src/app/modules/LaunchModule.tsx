/**
 * src/app/modules/LaunchModule.tsx: the QUICK LAUNCH module: big tiles for
 * the sites you open most, and its SETTINGS (add, order, remove tiles).
 *
 * Layer: UI. A tile opens in a new tab like every link here. The first
 * nine tiles across your QUICK LAUNCH modules have keys 1–9 (shown on the
 * tile; app/useShortcuts.ts). Tiles are added here (+ TILE) or from a
 * bookmark's ⋯ menu in edit mode (PIN TO QUICK LAUNCH), and ordered with
 * the ↑ / ↓ buttons: a keyboard way, as every arrangement has.
 */
import { type FormEvent, useId, useState } from 'react';

import { LAUNCH_KEYS, type LaunchSettings, MAX_TILES, addTile, cleanUrl, moveTile, removeTile } from '@/lib/launch';
import { modulesOf, setSettings } from '@/lib/modules';
import { hostOf } from '@/lib/bookmarks';
import { editStore } from '@/store/edit';
import { uiStore } from '@/store/ui';

import { SiteIcon } from '../deck/Items';
import { useLayout } from '../hooks';
import type { ModuleProps } from './catalog';

/** How many keyed tiles come before module `id`'s (keys run on across QUICK LAUNCH modules). */
function useKeyOffset(id: string): number {
  return useLayout((s) => {
    let before = 0;
    for (const m of modulesOf(s.layout.modules, 'launch')) {
      if (m.id === id) return before;
      before += m.settings.tiles.length;
    }
    return before;
  });
}

/** The tiles. */
export function Panel({ module }: ModuleProps) {
  const offset = useKeyOffset(module.id);
  if (module.kind !== 'launch') return null;
  const { tiles } = module.settings;
  if (!tiles.length) return <p className="small dim">NO TILES YET · IN EDIT MODE: ⋯ ▸ SETTINGS ▸ + TILE, OR A BOOKMARK’S ⋯ ▸ PIN TO QUICK LAUNCH.</p>;
  return (
    <ul className="launch-tiles">
      {tiles.map((t, i) => {
        const key = offset + i + 1;
        return (
          <li key={t.url}>
            <a className="launch-tile" href={t.url} target="_blank" rel="noopener noreferrer" title={t.url} draggable={false}>
              <SiteIcon url={t.url} />
              <span className="launch-title">{t.title}</span>
              <span className="link-host">{hostOf(t.url)}</span>
              {key <= LAUNCH_KEYS && (
                <kbd className="launch-key" aria-label={`key ${key}`}>
                  {key}
                </kbd>
              )}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

/** SETTINGS: the tiles in order (↑ ↓ ✕), and + TILE. */
export function Settings({ module }: ModuleProps) {
  const titleId = useId();
  const urlId = useId();
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  if (module.kind !== 'launch') return null;
  const { settings } = module;
  const save = (next: LaunchSettings) => editStore.getState().apply((s) => ({ ...s, modules: setSettings(s.modules, module.id, 'launch', next) }));
  const clean = cleanUrl(url);
  const full = settings.tiles.length >= MAX_TILES;
  const pinned = !!clean && settings.tiles.some((t) => t.url === clean);
  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!clean || pinned || full) return;
    save(addTile(settings, clean, title));
    uiStore.getState().announce(`ADDED ${(title.trim() || hostOf(clean)).toUpperCase()}`);
    setTitle('');
    setUrl('');
  };
  return (
    <div className="settings-group">
      <span className="setting-label">TILES · {settings.tiles.length} OF {MAX_TILES}</span>
      {settings.tiles.length === 0 ? (
        <p className="small dim">NONE YET.</p>
      ) : (
        <ol className="tile-list">
          {settings.tiles.map((t, i) => (
            <li key={t.url} className="tile-list-row">
              <span className="tile-list-title">{t.title}</span>
              <span className="link-host">{hostOf(t.url)}</span>
              <span className="tile-list-actions">
                <button type="button" className="text-btn small-btn" disabled={i === 0} aria-label={`Move ${t.title} earlier`} onClick={() => save(moveTile(settings, t.url, -1))}>
                  ↑
                </button>
                <button type="button" className="text-btn small-btn" disabled={i === settings.tiles.length - 1} aria-label={`Move ${t.title} later`} onClick={() => save(moveTile(settings, t.url, 1))}>
                  ↓
                </button>
                <button type="button" className="text-btn small-btn danger" aria-label={`Remove ${t.title}`} onClick={() => save(removeTile(settings, t.url))}>
                  ✕
                </button>
              </span>
            </li>
          ))}
        </ol>
      )}
      <form className="tile-add" onSubmit={add}>
        <label className="setting-label" htmlFor={urlId}>
          + TILE · ADDRESS
        </label>
        <input id={urlId} className="module-input boxed" type="text" inputMode="url" placeholder="github.com" spellCheck={false} autoComplete="off" value={url} onChange={(e) => setUrl(e.target.value)} />
        <label className="setting-label" htmlFor={titleId}>
          TITLE (OPTIONAL)
        </label>
        <input id={titleId} className="module-input boxed" type="text" placeholder={clean ? hostOf(clean) : 'GitHub'} autoComplete="off" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className="button-row">
          <button type="submit" className="text-btn small-btn primary" disabled={!clean || pinned || full}>
            + TILE
          </button>
          {pinned && <span className="small dim">ALREADY A TILE.</span>}
          {full && <span className="small dim">FULL: REMOVE ONE FIRST.</span>}
        </div>
      </form>
    </div>
  );
}
