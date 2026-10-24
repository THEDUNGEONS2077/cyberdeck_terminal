/**
 * src/app/modules/actions.ts: what the rest of the page does with modules:
 * search the web (the finder's last command), open a quick-launch tile by
 * its key (1–9), pin a bookmark to QUICK LAUNCH (its ⋯ menu), and the
 * finder's module commands (FOCUS SEARCH, START / STOP TIMER).
 *
 * Layer: UI. Kept apart from the kinds' own files, which load lazily: the
 * finder, the shortcuts and the ⋯ menus need these straight away, and
 * they're small.
 */
import { type LaunchTile, addTile, cleanUrl, hasTile, launchTargets } from '@/lib/launch';
import { addModule, modulesOf, newModule, newModuleId, setSettings } from '@/lib/modules';
import { type SearchSettings, defaultSearch, engineOf, searchUrl } from '@/lib/search';
import { editStore } from '@/store/edit';
import { layoutStore } from '@/store/instance';
import { uiStore } from '@/store/ui';

import { openUrl } from '../switchTab';

/** Opens a search for `query` with `settings` in a new tab; false when there's nothing to search for. */
export function openSearch(settings: SearchSettings, query: string): boolean {
  const url = searchUrl(settings, query);
  if (!url) return false;
  window.open(url, '_blank', 'noopener,noreferrer');
  uiStore.getState().announce(`SEARCHING ${engineOf(settings).label} FOR ${query.trim().toUpperCase()}`);
  return true;
}

/** The event the finder's START / STOP TIMER sends the first TIME module (TimeModule.tsx listens). */
export const TIMER_EVENT = 'cyberdeck:timer';
/** What a TIMER_EVENT carries: the module, and what to do. */
export interface TimerCommand {
  id: string;
  action: 'start' | 'stop';
}

/** START TIMER / STOP TIMER: tells the first TIME module's timer (opening its fold to start it); false if there's no TIME module. */
export function timerCommand(action: TimerCommand['action']): boolean {
  const time = modulesOf(layoutStore().getState().layout.modules, 'time')[0];
  if (!time) return false;
  window.dispatchEvent(new CustomEvent<TimerCommand>(TIMER_EVENT, { detail: { id: time.id, action } }));
  return true;
}

/** FOCUS SEARCH: the cursor into the first SEARCH module's field; false if there's none on screen. */
export function focusSearch(): boolean {
  const field = document.querySelector<HTMLInputElement>('.module[data-kind="search"] input');
  field?.focus();
  return !!field;
}

/** The engine a search from outside a SEARCH module uses: the first module's, or DuckDuckGo. */
export function defaultEngine(): SearchSettings {
  return modulesOf(layoutStore().getState().layout.modules, 'search')[0]?.settings ?? defaultSearch();
}

/** The tiles keys 1–9 open, in order. */
export function keyedTiles(): LaunchTile[] {
  return launchTargets(modulesOf(layoutStore().getState().layout.modules, 'launch').map((m) => m.settings));
}

/** Opens the tile on key `n` (1–9) in a new tab; false when there's no tile on it. */
export function openKeyedTile(n: number): boolean {
  const tile = keyedTiles()[n - 1];
  if (!tile) return false;
  openUrl(tile.url);
  uiStore.getState().announce(`OPENED ${tile.title.toUpperCase()}`);
  return true;
}

/** Is `url` pinned to any QUICK LAUNCH module? */
export function isPinned(url: string): boolean {
  // Compared as tiles keep addresses (cleaned: `https://a` is kept as `https://a/`).
  const clean = cleanUrl(url) ?? url;
  return modulesOf(layoutStore().getState().layout.modules, 'launch').some((m) => hasTile(m.settings, clean));
}

/**
 * PIN TO QUICK LAUNCH: the link becomes a tile at the end of the first
 * QUICK LAUNCH module, which is added first if there's none (undoable).
 */
export function pinToLaunch(url: string, title: string): void {
  editStore.getState().apply((s) => {
    let modules = s.modules;
    let launch = modulesOf(modules, 'launch')[0];
    if (!launch) {
      const fresh = newModule('launch', newModuleId(), modules);
      modules = addModule(modules, fresh);
      launch = modulesOf(modules, 'launch')[0];
      // The dashboard is full: nothing to pin to.
      if (!launch) return s;
    }
    return { ...s, modules: setSettings(modules, launch.id, 'launch', addTile(launch.settings, url, title)) };
  });
  uiStore.getState().announce(`PINNED ${title.toUpperCase()} TO QUICK LAUNCH`);
}
