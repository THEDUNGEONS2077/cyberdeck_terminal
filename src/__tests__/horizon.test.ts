/**
 * src/__tests__/horizon.test.ts: HORIZON's land (wallpaper/horizon/land.ts):
 * the same land for the same seed, every point inside its bounds, the
 * triangles joining each row to the next (the last to the first, so the
 * land repeats without a seam), and the colours from a palette (SYNTH,
 * made for it, gives the reference's pink and teal). The shaders are
 * checked drawing in the browser walk (e2e/walk.mjs).
 */
import { describe, expect, it } from 'vitest';

import { findPalette } from '@/lib/palettes';
import { at, buildLand, horizonTones, landMesh, VERTEX } from '@/wallpaper/horizon/land';
import { COLS, HALF_WIDTH, HEIGHT, JITTER, ROWS } from '@/wallpaper/horizon/params';

/** A seeded 0–1 random source (Park–Miller), as the other wallpapers' tests use. */
const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

describe('horizon', () => {
  it('makes the same land for the same seed, and another for another', () => {
    const a = buildLand(seeded(7));
    expect(Array.from(buildLand(seeded(7)).y)).toEqual(Array.from(a.y));
    expect(Array.from(buildLand(seeded(8)).y)).not.toEqual(Array.from(a.y));
  });

  it('keeps every point in its bounds: across, in depth, in height (below the camera)', () => {
    const land = buildLand(seeded(3));
    const step = (2 * HALF_WIDTH) / (COLS - 1);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const i = at(r, c);
        expect(Math.abs(land.x[i]! - (-HALF_WIDTH + c * step))).toBeLessThanOrEqual(JITTER.x * step + 1e-6);
        expect(Math.abs(land.dz[i]!)).toBeLessThanOrEqual(JITTER.z + 1e-6);
        expect(land.y[i]!).toBeGreaterThanOrEqual(0);
        expect(land.y[i]!).toBeLessThanOrEqual(HEIGHT.peak[1]);
      }
    }
    // Some peaks, mostly low land.
    const peaks = Array.from(land.y).filter((y) => y > HEIGHT.low[1]).length / land.y.length;
    expect(peaks).toBeGreaterThan(0.05);
    expect(peaks).toBeLessThan(0.3);
  });

  it('cuts the land into triangles joining each row to the next, the last to the first', () => {
    const land = buildLand(seeded(5));
    const mesh = landMesh(land);
    expect(mesh.length).toBe(ROWS * (COLS - 1) * 2 * 3 * VERTEX);
    // Every triangle has corners 0, 1, 2, and spans its strip's two rows.
    for (let t = 0; t < mesh.length / (3 * VERTEX); t += 997) {
      const v = (k: number, f: number) => mesh[(t * 3 + k) * VERTEX + f]!;
      expect([v(0, 5), v(1, 5), v(2, 5)]).toEqual([0, 1, 2]);
      expect(new Set([v(0, 2), v(1, 2), v(2, 2)]).size).toBe(1);
      expect(new Set([v(0, 3), v(1, 3), v(2, 3)])).toEqual(new Set([0, 1]));
    }
    // The last strip's far row is the first row: the same points, so the land repeats without a seam.
    const last = (ROWS - 1) * (COLS - 1) * 6;
    for (let k = 0; k < 6; k++) {
      const o = (last + k) * VERTEX;
      if (mesh[o + 3] !== 1) continue;
      const xs = Array.from({ length: COLS }, (_, c) => land.x[at(0, c)]);
      expect(xs).toContain(mesh[o]);
    }
  });

  it('takes its colours from the palette: SYNTH’s pink glow and teal edges', () => {
    const t = horizonTones({ ...findPalette('synth').colors, dim: '', bright: findPalette('synth').colors.textBright });
    // The glow is the accent (pink: red over blue); the edges the cool colour (teal: green and blue over red).
    expect(t.glow[0]).toBeGreaterThan(t.glow[2]);
    expect(t.line[1]).toBeGreaterThan(t.line[0]);
    expect(t.line[2]).toBeGreaterThan(t.line[0]);
    // The sky is darker than the glow everywhere.
    expect(Math.max(...t.skyLow)).toBeLessThan(Math.max(...t.glow));
  });
});
