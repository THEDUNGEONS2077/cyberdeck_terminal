/**
 * src/app/modules/catalog.ts: what the page knows about each kind of
 * module: its name, its glyph, a line about it, the note in its header,
 * and its panel and SETTINGS.
 *
 * The kinds load with the app, not lazily (measured, 2026-10-24): split
 * off, they saved about 5 KB gzipped, but the bundler then cut everything
 * they share with the app (React's JSX runtime, the stores, the arrange
 * rules) into seven small files, and a first visit waited on the extra
 * requests: the dashboard appeared ~130 ms later (e2e:perf, 120 ms delay).
 *
 * Layer: UI. The rules behind each kind are in lib/ (modules.ts and the
 * kind's own file); a new kind gets an entry here, a case in
 * lib/modules.ts, and a file in this folder exporting `Panel` and `Settings`.
 */
import type { ComponentType } from 'react';

import type { ModuleInstance, ModuleKind } from '@/lib/modules';
import { engineOf } from '@/lib/search';

import * as launch from './LaunchModule';
import * as search from './SearchModule';
import * as time from './TimeModule';

/** What a module's panel and SETTINGS are given: the module (each narrows it to its own kind). */
export interface ModuleProps {
  module: ModuleInstance;
}

/** One kind of module, as the page shows it. */
export interface KindInfo {
  label: string;
  glyph: string;
  /** A line about it: the + MODULE menu's hint on hover. */
  about: string;
  /** The short note in the module's header (the engine, how many tiles), or ''. */
  note(module: ModuleInstance): string;
  /**
   * No header outside edit mode: the frame is only a thin scanlined ring
   * round the content (user request, 2026-10-24: SEARCH, QUICK LAUNCH).
   */
  bare: boolean;
  Panel: ComponentType<ModuleProps>;
  Settings: ComponentType<ModuleProps>;
}

/** Every kind of module. */
export const CATALOG: Record<ModuleKind, KindInfo> = {
  search: {
    label: 'SEARCH',
    glyph: '◎',
    about: 'Search the web with the engine you choose (opens in a new tab)',
    note: (m) => (m.kind === 'search' ? engineOf(m.settings).label : ''),
    bare: true,
    Panel: search.Panel,
    Settings: search.Settings,
  },
  launch: {
    label: 'QUICK LAUNCH',
    glyph: '»',
    about: 'Big tiles for the sites you open most; keys 1–9 open the first nine',
    note: (m) => (m.kind === 'launch' ? `${m.settings.tiles.length} TILE${m.settings.tiles.length === 1 ? '' : 'S'}` : ''),
    bare: true,
    Panel: launch.Panel,
    Settings: launch.Settings,
  },
  time: {
    label: 'TIME',
    glyph: '◔',
    about: 'A clock, this month, your countdowns, a timer and a stopwatch',
    note: () => '',
    bare: false,
    Panel: time.Panel,
    Settings: time.Settings,
  },
};
