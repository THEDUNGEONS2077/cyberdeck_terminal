/**
 * src/wallpaper/neural-net/tuner.ts: how sharp NEURAL NET draws (0.23.3): as
 * sharp as the machine can keep smooth, found while it runs.
 *
 * Layer: wallpaper (pure: no canvas, no timers; the engine feeds it frame
 * gaps and the time, so tests drive it).
 *
 * The user: "increase Neural Net's sharpness as much as possible but limit
 * it to the threshold when performance starts dropping". The net is drawn
 * at SUPERSAMPLE_LEVELS[level] times the screen's pixels each way and shrunk
 * by the browser (engine.ts). It starts at 2×. After each window of frames
 * (TUNE_WINDOW_MS, the first SETTLE_MS after a change ignored, since a
 * resized canvas hitches once):
 *   - smooth: a level up, until the top (or the largest canvas allowed);
 *   - slow (the slowest tenth of gaps OVERLOAD times the smoothest the
 *     screen has shown, which is about its refresh): a level down, and no
 *     more climbing this session, so it never swings back and forth.
 * A single hitch (a tenth of a window is many frames) doesn't count.
 */

/** Pixels drawn per screen pixel, each way, lowest to highest. */
export const SUPERSAMPLE_LEVELS: readonly number[] = [1, 1.5, 2, 3, 4];
/** The level it starts at (2×, 0.23.2's fixed setting). */
export const START_LEVEL = 2;
/** How long each window of frames is (ms). */
export const TUNE_WINDOW_MS = 2000;
/** Frames ignored after a change or a restart (ms). */
export const SETTLE_MS = 600;
/** Slow: the slowest tenth of gaps this many times the smoothest seen. */
export const OVERLOAD = 1.4;

/** The tuner's state. */
export interface Tuner {
  /** The level now (an index into SUPERSAMPLE_LEVELS). */
  level: number;
  /** Set once a level was too slow: no more climbing. */
  locked: boolean;
  /** The smoothest window's median gap seen (ms): about the screen's refresh. */
  base: number;
  /** This window's gaps (ms). */
  gaps: number[];
  /** When this window (after settling) began (ms). */
  since: number;
}

/** A new tuner at START_LEVEL, its first window starting at `now`. */
export function newTuner(now: number): Tuner {
  return { level: START_LEVEL, locked: false, base: Infinity, gaps: [], since: now + SETTLE_MS };
}

/** Starts a fresh window after a pause or a change (frames for SETTLE_MS ignored). */
export function restartWindow(t: Tuner, now: number): void {
  t.gaps.length = 0;
  t.since = now + SETTLE_MS;
}

/**
 * Feeds one frame's gap (ms) at `now`. Returns the new level when it should
 * change (the caller redraws at it), else null. `top` is the highest level
 * allowed here (the largest canvas the engine allows at this screen size).
 */
export function tune(t: Tuner, gap: number, now: number, top: number): number | null {
  if (now < t.since) return null;
  t.gaps.push(gap);
  if (now - t.since < TUNE_WINDOW_MS) return null;
  const sorted = [...t.gaps].sort((a, b) => a - b);
  const median = sorted[sorted.length >> 1]!;
  const p90 = sorted[Math.floor(sorted.length * 0.9)]!;
  t.base = Math.min(t.base, median);
  restartWindow(t, now);
  // Never above the top (the screen may have grown or shrunk).
  if (t.level > top) {
    t.level = top;
    return t.level;
  }
  if (p90 > t.base * OVERLOAD) {
    if (t.level === 0) return null;
    t.level--;
    t.locked = true;
    return t.level;
  }
  if (!t.locked && t.level < top) {
    t.level++;
    return t.level;
  }
  return null;
}
