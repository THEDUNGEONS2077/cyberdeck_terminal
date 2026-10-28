/**
 * src/__tests__/countdown.test.ts: the COUNTDOWN module's rules
 * (lib/countdown.ts): when it ends, the days, hours, minutes and seconds
 * left, its settings read back from storage, the module kept through a save
 * and a read, and schema 7 turning a real 0.24.0 TIMER into a COUNTDOWN.
 */
import { describe, expect, it } from 'vitest';

import { countdownParts, countdownTarget, countdownText, defaultCountdown, fromTimer, normalizeCountdown, parseTime } from '@/lib/countdown';
import { defaultLayout } from '@/lib/layout';
import { migrateLayout } from '@/lib/migrations';
import { newModule, normalizeModules } from '@/lib/modules';

describe('COUNTDOWN', () => {
  it('starts with no label and no date: no end', () => {
    expect(defaultCountdown()).toEqual({ label: '', date: '', time: '00:00' });
    expect(countdownTarget(defaultCountdown())).toBeNull();
  });

  it('ends at its date and time in the browser’s own time zone', () => {
    expect(countdownTarget({ label: '', date: '2026-12-25', time: '09:30' })).toBe(new Date(2026, 11, 25, 9, 30).getTime());
    // No time chosen: the day's start.
    expect(countdownTarget({ label: '', date: '2026-12-25', time: '00:00' })).toBe(new Date(2026, 11, 25).getTime());
  });

  it('splits what’s left into days, hours, minutes and seconds, rounding up, never below 0', () => {
    const left = ((12 * 24 + 4) * 3600 + 32 * 60 + 10) * 1000;
    expect(countdownParts(left)).toEqual({ days: 12, h: 4, m: 32, s: 10 });
    expect(countdownParts(left - 400)).toEqual({ days: 12, h: 4, m: 32, s: 10 });
    expect(countdownParts(-5000)).toEqual({ days: 0, h: 0, m: 0, s: 0 });
    expect(countdownText(left)).toBe('12 DAYS 04:32:10');
    expect(countdownText(86_400_000)).toBe('1 DAY 00:00:00');
  });

  it('reads its settings back from storage; a date that isn’t real is none, a bad time is midnight', () => {
    const s = { label: '  big   launch ', date: '2026-12-25', time: '09:30' };
    expect(normalizeCountdown(JSON.parse(JSON.stringify(s)))).toEqual({ label: 'BIG LAUNCH', date: '2026-12-25', time: '09:30' });
    expect(normalizeCountdown({ label: 5, date: '2026-02-30', time: '24:00' })).toEqual(defaultCountdown());
    expect(normalizeCountdown(null)).toEqual(defaultCountdown());
    expect([parseTime('23:59'), parseTime('9:30'), parseTime('12:60')]).toEqual([{ h: 23, m: 59 }, null, null]);
  });

  it('is a module kind like the others: added, saved and read back', () => {
    const c = newModule('countdown', 'mcount1', []);
    if (c.kind !== 'countdown') throw new Error('not a COUNTDOWN');
    expect(c).toMatchObject({ kind: 'countdown', settings: defaultCountdown(), place: { w: 420 } });
    const set = { ...c, settings: { label: 'LAUNCH', date: '2027-01-01', time: '00:00' } };
    expect(normalizeModules([set])).toEqual([set]);
  });

  it('a 0.24.0 TIMER’s settings: label kept; a running one counts to the minute it would have ended', () => {
    const end = new Date(2026, 9, 28, 18, 24, 10).getTime();
    expect(fromTimer({ label: 'TEA', seconds: 300, end, left: null })).toEqual({ label: 'TEA', date: '2026-10-28', time: '18:25' });
    expect(fromTimer({ label: 'FOCUS', seconds: 1500, end: null, left: 60_000 })).toEqual({ label: 'FOCUS', date: '', time: '00:00' });
    expect(fromTimer('broken')).toEqual(defaultCountdown());
  });
});

describe('layout schema 7', () => {
  it('migrates a real version-6 layout: its TIMER becomes a COUNTDOWN in the same place, at the same size; the rest is unchanged', () => {
    const end = new Date(2026, 9, 28, 18, 24, 10).getTime();
    const clock = { id: 'mclock1', kind: 'clock', place: { x: 0.95, y: 0.02, w: 420 }, settings: { seconds: true, hour24: true, date: true } };
    const timer = { id: 'mtimer1', kind: 'timer', place: { x: 0.95, y: 0.22, w: 380 }, settings: { label: 'TEA', seconds: 300, end, left: null }, sizes: { scale: 1.25 } };
    const v6 = { ...defaultLayout(), schemaVersion: 6, modules: [clock, timer] };
    const { doc } = migrateLayout(JSON.parse(JSON.stringify(v6)));
    expect(doc).toEqual({
      ...v6,
      schemaVersion: 7,
      modules: [clock, { id: 'mtimer1', kind: 'countdown', place: { x: 0.95, y: 0.22, w: 380 }, settings: { label: 'TEA', date: '2026-10-28', time: '18:25' }, sizes: { scale: 1.25 } }],
    });
  });
});
