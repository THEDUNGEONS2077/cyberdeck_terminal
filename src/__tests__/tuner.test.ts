/**
 * src/__tests__/tuner.test.ts: how sharp NEURAL NET draws
 * (wallpaper/neural-net/tuner.ts): it climbs while frames stay smooth, steps
 * back once they don't and stays there, ignores single hitches and the
 * frames right after a change, and never goes past the top allowed.
 */
import { describe, expect, it } from 'vitest';

import { SETTLE_MS, START_LEVEL, SUPERSAMPLE_LEVELS, TUNE_WINDOW_MS, newTuner, restartWindow, tune, type Tuner } from '@/wallpaper/neural-net/tuner';

const TOP = SUPERSAMPLE_LEVELS.length - 1;

/**
 * Runs frames for `ms` at `gap(level)` ms apart (the gap may depend on the
 * level, as a slower GPU's would), from `start`; returns the time it ends.
 */
function run(t: Tuner, start: number, ms: number, gap: (level: number) => number, top = TOP): number {
  let now = start;
  while (now < start + ms) {
    const g = gap(t.level);
    now += g;
    tune(t, g, now, top);
  }
  return now;
}

describe('NEURAL NET’s sharpness tuner', () => {
  it('starts at 2× and climbs to the top while frames stay smooth', () => {
    const t = newTuner(0);
    expect(SUPERSAMPLE_LEVELS[t.level]).toBe(2);
    run(t, 0, 20_000, () => 16.7);
    expect(t.level).toBe(TOP);
    expect(t.locked).toBe(false);
  });

  it('steps back from the first level that slows the frames, and stays there', () => {
    const t = newTuner(0);
    // 3× and above: every frame late (a 60 Hz screen dropping to 30).
    const gap = (level: number) => (SUPERSAMPLE_LEVELS[level]! >= 3 ? 33.3 : 16.7);
    run(t, 0, 30_000, gap);
    expect(SUPERSAMPLE_LEVELS[t.level]).toBe(2);
    expect(t.locked).toBe(true);
  });

  it('a hitch now and then isn’t a slowdown', () => {
    const t = newTuner(0);
    let i = 0;
    // One frame in twenty takes 50 ms (a garbage collection, another tab).
    run(t, 0, 20_000, () => (++i % 20 === 0 ? 50 : 16.7));
    expect(t.level).toBe(TOP);
  });

  it('goes down below 2× if even that is slow', () => {
    const t = newTuner(0);
    // Smooth for a first window (to learn the screen's pace), then slow at every level from 1.5× up.
    run(t, 0, TUNE_WINDOW_MS + SETTLE_MS + 50, () => 16.7);
    t.level = START_LEVEL;
    t.locked = false;
    run(t, 10_000, 10_000, (level) => (SUPERSAMPLE_LEVELS[level]! >= 1.5 ? 40 : 16.7));
    expect(t.level).toBeLessThan(START_LEVEL);
  });

  it('never climbs past the top a screen size allows, and drops to it when the screen grows', () => {
    const t = newTuner(0);
    run(t, 0, 20_000, () => 16.7, 3);
    expect(t.level).toBe(3);
    run(t, 20_000, 5_000, () => 16.7, 2);
    expect(t.level).toBe(2);
  });

  it('ignores the frames just after a change or a pause', () => {
    const t = newTuner(0);
    restartWindow(t, 1000);
    expect(tune(t, 500, 1000 + SETTLE_MS - 1, TOP)).toBeNull();
    expect(t.gaps).toHaveLength(0);
  });
});
