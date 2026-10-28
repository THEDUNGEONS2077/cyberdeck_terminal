/**
 * src/__tests__/timer.test.ts: the TIMER module's rules (lib/timer.ts):
 * starting, pausing and resuming from what's left, running out, its digits,
 * a new length resetting it, and its state read back from storage (as a
 * reload finds it), plus the module itself kept through a save and a read.
 */
import { describe, expect, it } from 'vitest';

import { newModule, normalizeModules } from '@/lib/modules';
import { DEFAULT_TIMER_SECONDS, MAX_TIMER_SECONDS, defaultTimer, normalizeTimer, pauseTimer, resetTimer, splitSeconds, startTimer, timerDone, timerLeft, timerRunning, timerText, withLength } from '@/lib/timer';

const T0 = new Date(2026, 9, 28, 18, 0).getTime();

describe('TIMER', () => {
  it('starts at 25 minutes, not running', () => {
    const t = defaultTimer();
    expect(t.seconds).toBe(DEFAULT_TIMER_SECONDS);
    expect(timerLeft(t, T0)).toBe(25 * 60_000);
    expect(timerRunning(t, T0)).toBe(false);
    expect(timerText(timerLeft(t, T0))).toBe('25:00');
  });

  it('counts down once started, rounding up to whole seconds', () => {
    const t = startTimer(defaultTimer(), T0);
    expect(timerRunning(t, T0 + 1000)).toBe(true);
    expect(timerText(timerLeft(t, T0 + 400))).toBe('25:00');
    expect(timerText(timerLeft(t, T0 + 60_000))).toBe('24:00');
    expect(timerText(timerLeft(t, T0 + 61_000))).toBe('23:59');
  });

  it('pauses with what’s left, and resumes from it', () => {
    const paused = pauseTimer(startTimer(defaultTimer(), T0), T0 + 60_000);
    expect(paused.end).toBeNull();
    expect(timerLeft(paused, T0 + 999_999)).toBe(24 * 60_000);
    const resumed = startTimer(paused, T0 + 500_000);
    expect(timerLeft(resumed, T0 + 500_000 + 60_000)).toBe(23 * 60_000);
  });

  it('runs out at its end: done, 00:00, never below', () => {
    const t = startTimer(withLength(defaultTimer(), 3), T0);
    expect(timerDone(t, T0 + 2999)).toBe(false);
    expect(timerDone(t, T0 + 3000)).toBe(true);
    expect(timerLeft(t, T0 + 10_000)).toBe(0);
    expect(timerText(0)).toBe('00:00');
  });

  it('shows hours from an hour up', () => {
    expect(timerText(withLength(defaultTimer(), 3725).seconds * 1000)).toBe('1:02:05');
    expect(splitSeconds(3725)).toEqual({ h: 1, m: 2, s: 5 });
  });

  it('a new length resets it, within the limits', () => {
    const running = startTimer(defaultTimer(), T0);
    const next = withLength(running, 90);
    expect(next).toMatchObject({ seconds: 90, end: null, left: null });
    expect(withLength(running, 0).seconds).toBe(1);
    expect(withLength(running, 10 ** 9).seconds).toBe(MAX_TIMER_SECONDS);
    expect(resetTimer(running)).toMatchObject({ end: null, left: null });
  });

  it('reads its state back from storage, as a reload finds it; anything broken means not started', () => {
    const running = startTimer({ ...defaultTimer(), label: 'TEA' }, T0);
    expect(normalizeTimer(JSON.parse(JSON.stringify(running)))).toEqual(running);
    expect(normalizeTimer({ seconds: 'x', end: -5, left: 'y', label: '  focus   time ' })).toEqual({ label: 'FOCUS TIME', seconds: DEFAULT_TIMER_SECONDS, end: null, left: null });
    // Running and paused at once: the end wins; a pause can't hold more than the length.
    expect(normalizeTimer({ seconds: 60, end: T0, left: 5000 }).left).toBeNull();
    expect(normalizeTimer({ seconds: 60, end: null, left: 999_999 }).left).toBe(60_000);
    expect(normalizeTimer(null)).toEqual(defaultTimer());
  });

  it('is a module kind like the others: added, saved and read back', () => {
    const timer = newModule('timer', 'mtimer1', []);
    if (timer.kind !== 'timer') throw new Error('not a TIMER');
    expect(timer).toMatchObject({ kind: 'timer', settings: defaultTimer(), place: { w: 380 } });
    const running = { ...timer, settings: startTimer(timer.settings, T0) };
    expect(normalizeModules([running])).toEqual([running]);
  });
});
