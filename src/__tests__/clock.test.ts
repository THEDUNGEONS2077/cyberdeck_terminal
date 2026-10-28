/**
 * src/__tests__/clock.test.ts: the CLOCK module's rules (lib/clock.ts), each
 * module's own sizes (lib/modules.ts: SIZE and TEXT SIZE, 0.19.0), and the
 * schema 4 → 5 → 6 steps, with real layouts of each version.
 */
import { describe, expect, it } from 'vitest';

import { clockFace, defaultClock, nextTick, normalizeClock } from '@/lib/clock';
import { defaultLayout } from '@/lib/layout';
import { migrateLayout, ownScale } from '@/lib/migrations';
import { MODULE_OWN_STEPS, MODULE_SCALE_STEPS } from '@/lib/scale';
import { MODULE_SCALE, type ModuleInstance, moduleScaleOf, moduleTextOf, newModule, normalizeModules, normalizeSizes, setSizes } from '@/lib/modules';

const dashboard = { textScale: 1.1, moduleScale: MODULE_SCALE };

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
    // TEXT SIZE alone: the SIZE still follows the dashboard's MODULE SIZE.
    expect(moduleScaleOf({ textScale: 1.5 }, dashboard)).toBe(MODULE_SCALE);
  });

  it('replaces the dashboard size it sets, and only that one', () => {
    expect(moduleScaleOf({ scale: 1.5 }, dashboard)).toBe(1.5);
    expect(moduleTextOf({ textScale: 1.5 }, dashboard)).toBe(1.5);
    // OWN at the dashboard's own value is still OWN (0.18.0 dropped it back to following).
    expect(normalizeSizes({ scale: MODULE_SCALE })).toEqual({ scale: MODULE_SCALE });
  });

  it('snaps sizes to their steps and drops anything else; none at all is stored as none', () => {
    expect(normalizeSizes({ scale: 1.3, textScale: 9, other: 1 })).toEqual({ scale: 1.25, textScale: 1.5 });
    expect(normalizeSizes({ scale: 'x' })).toBeUndefined();
    // Every MODULE SIZE step is a SIZE step, so OWN starts at the dashboard's value exactly.
    for (const step of MODULE_SCALE_STEPS) expect(MODULE_OWN_STEPS).toContain(step);
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
      { id: 'm1', kind: 'time', place: { x: 0.9, y: 0.1, w: 320 }, settings: {}, sizes: { scale: 1, textScale: 'huge' } },
      { id: 'm2', kind: 'clock', place: { x: 0.9, y: 0.4, w: 420 }, settings: {}, sizes: 7 },
    ]);
    expect(modules[0]!.sizes).toEqual({ scale: 1 });
    expect('sizes' in modules[1]!).toBe(false);
  });
});

describe('layout schemas 5 and 6', () => {
  const time: ModuleInstance = { id: 'mtime1', kind: 'time', place: { x: 0.95, y: 0.02, w: 320 }, settings: { countdowns: [], timerMinutes: 25, toolsOpen: false } };

  it('migrates a real version-4 layout: modules keep everything and follow the dashboard', () => {
    const v4 = { ...defaultLayout(), schemaVersion: 4, prefs: { ...defaultLayout().prefs, uiScale: 1.5 }, modules: [time] };
    const { doc, migrated } = migrateLayout(v4);
    expect(migrated).toBe(true);
    expect(doc).toEqual({ ...v4, schemaVersion: 6 });
    expect('sizes' in doc.modules[0]!).toBe(false);
  });

  /** A real 0.18.0 (version-5) layout at a dashboard UI SCALE, with a module of each kind of own sizes. */
  const v5 = (uiScale: number) => ({
    ...defaultLayout(),
    schemaVersion: 5,
    prefs: { ...defaultLayout().prefs, uiScale, moduleScale: 0.7, textScale: 1.1 },
    modules: [
      // Its own UI SCALE 175%, with the dashboard's MODULE SIZE.
      { id: 'mclock1', kind: 'clock', place: { x: 0.9, y: 0.4, w: 420 }, settings: defaultClock(), sizes: { uiScale: 1.75, textScale: 1.35 } },
      // Its own MODULE SIZE alone.
      { id: 'mtime1', kind: 'time', place: { x: 0.95, y: 0.02, w: 320 }, settings: time.settings, sizes: { moduleScale: 1 } },
      // Both.
      { id: 'mclock2', kind: 'clock', place: { x: 0.5, y: 0.6, w: 420 }, settings: defaultClock(), sizes: { uiScale: 3, moduleScale: 0.9 } },
      // TEXT SIZE alone: the size still follows the dashboard.
      { id: 'mclock3', kind: 'clock', place: { x: 0.2, y: 0.6, w: 420 }, settings: defaultClock(), sizes: { textScale: 0.9 } },
    ],
  });

  it('migrates a real version-5 layout at UI SCALE 100%: the module drawn as big as before, its text kept', () => {
    const { doc, migrated } = migrateLayout(v5(1));
    expect(migrated).toBe(true);
    expect(doc.schemaVersion).toBe(6);
    // 0.7 × 1.75 / 1 = 1.225 → 1.25; 1; 0.9 × 3 = 2.7 → 2 (the largest SIZE); none.
    expect(doc.modules.map((m) => m.sizes)).toEqual([{ scale: 1.25, textScale: 1.35 }, { scale: 1 }, { scale: 2 }, { textScale: 0.9 }]);
  });

  it('migrates a real version-5 layout at UI SCALE 150%: its own UI SCALE taken against the dashboard’s', () => {
    const { doc } = migrateLayout(v5(1.5));
    // 0.7 × 1.75 / 1.5 = 0.82 → 0.8; 1; 0.9 × 3 / 1.5 = 1.8 → 1.75; none.
    expect(doc.modules.map((m) => m.sizes)).toEqual([{ scale: 0.8, textScale: 1.35 }, { scale: 1 }, { scale: 1.75 }, { textScale: 0.9 }]);
    // The rest of the layout comes through untouched.
    expect(doc.prefs).toEqual(v5(1.5).prefs);
  });

  it('turns odd 0.18.0 sizes into something sane', () => {
    expect(ownScale({ uiScale: 'big', moduleScale: -1 }, {})).toEqual({});
    expect(ownScale({ uiScale: 2 }, { uiScale: 'odd' })).toEqual({ scale: 1.5 }); // 0.7 × 2 / 1 = 1.4 → 1.5
  });
});
