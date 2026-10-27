/**
 * src/__tests__/clock.test.ts: the CLOCK module's rules (lib/clock.ts), each
 * module's own sizes (lib/modules.ts, 0.18.0), and the schema 4 → 5 step.
 */
import { describe, expect, it } from 'vitest';

import { clockFace, defaultClock, nextTick, normalizeClock } from '@/lib/clock';
import { defaultLayout } from '@/lib/layout';
import { migrateLayout } from '@/lib/migrations';
import { MODULE_SCALE, type ModuleInstance, moduleScaleOf, moduleTextOf, newModule, normalizeModules, normalizeSizes, setSizes } from '@/lib/modules';

const dashboard = { uiScale: 1.25, textScale: 1.1, moduleScale: MODULE_SCALE };

describe('CLOCK', () => {
  it('reads 24-hour time with seconds by default, and 12-hour with AM/PM', () => {
    const at = new Date(2026, 9, 27, 14, 7, 3);
    expect(clockFace(at, defaultClock())).toEqual({ time: '14:07:03', suffix: '' });
    expect(clockFace(at, { ...defaultClock(), seconds: false })).toEqual({ time: '14:07', suffix: '' });
    expect(clockFace(at, { ...defaultClock(), hour24: false })).toEqual({ time: '2:07:03', suffix: 'PM' });
    expect(clockFace(new Date(2026, 9, 27, 0, 5), { seconds: false, hour24: false, date: true })).toEqual({ time: '12:05', suffix: 'AM' });
  });

  it('ticks on the next second, or the next minute without seconds', () => {
    const at = new Date(2026, 9, 27, 14, 7, 58, 250);
    expect(nextTick(at, true)).toBe(750);
    expect(nextTick(at, false)).toBe(1750);
  });

  it('fills a malformed setting with its default, keeping the good ones', () => {
    expect(normalizeClock(null)).toEqual(defaultClock());
    expect(normalizeClock({ seconds: false, hour24: 'yes', date: false })).toEqual({ seconds: false, hour24: true, date: false });
  });

  it('is a module kind like the others: added, saved and read back', () => {
    const clock = newModule('clock', 'mclock1', []);
    expect(clock).toMatchObject({ kind: 'clock', settings: defaultClock(), place: { w: 420 } });
    expect(normalizeModules([clock])).toEqual([clock]);
  });
});

describe("a module's own sizes", () => {
  it('follows the dashboard until a size is chosen', () => {
    expect(moduleScaleOf(undefined, dashboard)).toBe(MODULE_SCALE);
    expect(moduleTextOf(undefined, dashboard)).toBe(1.1);
  });

  it('replaces the dashboard size it sets, and only that one', () => {
    expect(moduleScaleOf({ moduleScale: 1 }, dashboard)).toBe(1);
    expect(moduleTextOf({ textScale: 1.5 }, dashboard)).toBe(1.5);
    // Its own UI SCALE is drawn against the dashboard's zoom, so it looks the size it chose.
    expect(moduleScaleOf({ uiScale: 2.5 }, dashboard)).toBeCloseTo(MODULE_SCALE * 2);
    expect(moduleScaleOf({ uiScale: 1.25 }, dashboard)).toBeCloseTo(MODULE_SCALE);
  });

  it('snaps sizes to their steps and drops anything else; none at all is stored as none', () => {
    expect(normalizeSizes({ uiScale: 1.3, textScale: 9, moduleScale: 'x', other: 1 })).toEqual({ uiScale: 1.25, textScale: 1.5 });
    expect(normalizeSizes({})).toBeUndefined();
    expect(normalizeSizes('big')).toBeUndefined();
  });

  it('sets and clears one module’s sizes without touching the others', () => {
    const a = newModule('clock', 'ma', []), b = newModule('search', 'mb', [a]);
    const sized = setSizes([a, b], 'ma', { textScale: 1.35 });
    expect(sized[0]!.sizes).toEqual({ textScale: 1.35 });
    expect(sized[1]).toBe(b);
    const cleared = setSizes(sized, 'ma', {});
    expect('sizes' in cleared[0]!).toBe(false);
  });

  it('keeps sizes through a save and a read, dropping bad ones per module', () => {
    const modules = normalizeModules([
      { id: 'm1', kind: 'time', place: { x: 0.9, y: 0.1, w: 320 }, settings: {}, sizes: { moduleScale: 1, uiScale: 'huge' } },
      { id: 'm2', kind: 'clock', place: { x: 0.9, y: 0.4, w: 420 }, settings: {}, sizes: 7 },
    ]);
    expect(modules[0]!.sizes).toEqual({ moduleScale: 1 });
    expect('sizes' in modules[1]!).toBe(false);
  });
});

describe('layout schema 5', () => {
  it('migrates a real version-4 layout: modules keep everything and follow the dashboard', () => {
    const module: ModuleInstance = { id: 'mtime1', kind: 'time', place: { x: 0.95, y: 0.02, w: 320 }, settings: { countdowns: [], timerMinutes: 25, toolsOpen: false } };
    const v4 = { ...defaultLayout(), schemaVersion: 4, prefs: { ...defaultLayout().prefs, uiScale: 1.5 }, modules: [module] };
    const { doc, migrated } = migrateLayout(v4);
    expect(migrated).toBe(true);
    expect(doc).toEqual({ ...v4, schemaVersion: 5 });
    expect('sizes' in doc.modules[0]!).toBe(false);
  });
});
