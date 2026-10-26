/**
 * src/__tests__/horizon.test.ts: HORIZON's land (wallpaper/horizon/land.ts):
 * the same land for the same seed, every point inside its bounds, cells
 * that follow the layout's size (more, smaller triangles zoomed out, as the
 * other wallpapers' detail), the triangles joining each row to the next
 * (the last to the first, so the land repeats without a seam), the far wall
 * of haze, and the colours from a palette (SYNTH, made for it, gives the
 * reference's pink and teal). The shaders are checked drawing in the
 * browser walk (e2e/walk.mjs).
 */
import { describe, expect, it } from 'vitest';

import { findPalette } from '@/lib/palettes';
import { at, buildLand, cellFor, horizonTones, landMesh, stripVertices, VERTEX, WALL_VERTICES } from '@/wallpaper/horizon/land';
import { CAMERA, CELL, DEPTH, HALF_WIDTH, HEIGHT, JITTER, REFERENCE_HEIGHT, WALL } from '@/wallpaper/horizon/params';

/** A seeded 0–1 random source (Park–Miller), as the other wallpapers' tests use. */
const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

describe('horizon', () => {
  it('makes the same land for the same seed, and another for another', () => {
    const a = buildLand(seeded(7));
    expect(Array.from(buildLand(seeded(7)).y)).toEqual(Array.from(a.y));
    expect(Array.from(buildLand(seeded(8)).y)).not.toEqual(Array.from(a.y));
  });

  it('sizes its cells to the layout: 1 unit at 1080 CSS px tall, smaller for a bigger layout (zoomed out), within limits', () => {
    expect(cellFor(REFERENCE_HEIGHT)).toBe(1);
    expect(cellFor(1620)).toBeCloseTo(2 / 3, 5);
    expect(cellFor(10_000)).toBe(CELL.min);
    expect(cellFor(300)).toBe(CELL.max);
    // Zoomed out: more triangles over the same land.
    const big = buildLand(seeded(1), cellFor(2160));
    const usual = buildLand(seeded(1), cellFor(1080));
    expect(big.rows * big.cols).toBeGreaterThan(3 * usual.rows * usual.cols);
    expect(usual.rows).toBe(DEPTH);
  });

  it('keeps every point in its bounds: across, in depth, in height (below the camera)', () => {
    for (const cell of [1, 0.5]) {
      const land = buildLand(seeded(3), cell);
      const half = ((land.cols - 1) / 2) * cell;
      expect(half).toBeGreaterThanOrEqual(HALF_WIDTH);
      for (let r = 0; r < land.rows; r++) {
        for (let c = 0; c < land.cols; c++) {
          const i = at(land, r, c);
          expect(Math.abs(land.x[i]! - (-half + c * cell))).toBeLessThanOrEqual(JITTER.x * cell + 1e-6);
          expect(Math.abs(land.dz[i]!)).toBeLessThanOrEqual(JITTER.z + 1e-6);
          expect(land.y[i]!).toBeGreaterThanOrEqual(0);
          expect(land.y[i]!).toBeLessThanOrEqual(HEIGHT.peak[1] * cell + 1e-6);
        }
      }
    }
    // Some peaks, mostly low land.
    const land = buildLand(seeded(3));
    const peaks = Array.from(land.y).filter((y) => y > HEIGHT.low[1]).length / land.y.length;
    expect(peaks).toBeGreaterThan(0.05);
    expect(peaks).toBeLessThan(0.3);
  });

  it('cuts the land into triangles joining each row to the next, the last to the first', () => {
    const land = buildLand(seeded(5));
    const mesh = landMesh(land);
    const per = stripVertices(land.cols);
    expect(mesh.length).toBe((land.rows * per + WALL_VERTICES) * VERTEX);
    // Every triangle has corners 0, 1, 2, and spans its strip's two rows.
    for (let t = 0; t < (land.rows * per) / 3; t += 997) {
      const v = (k: number, f: number) => mesh[(t * 3 + k) * VERTEX + f]!;
      expect([v(0, 5), v(1, 5), v(2, 5)]).toEqual([0, 1, 2]);
      expect(new Set([v(0, 2), v(1, 2), v(2, 2)]).size).toBe(1);
      expect(new Set([v(0, 3), v(1, 3), v(2, 3)])).toEqual(new Set([0, 1]));
    }
    // The last strip's far row is the first row: the same points, so the land repeats without a seam.
    const first = Array.from({ length: land.cols }, (_, c) => land.x[at(land, 0, c)]);
    for (let k = 0; k < 6; k++) {
      const o = ((land.rows - 1) * per + k) * VERTEX;
      if (mesh[o + 3] === 1) expect(first).toContain(mesh[o]);
    }
  });

  it('ends in a wall of haze at the far end, up to the camera’s height (the horizon), with no edges', () => {
    const land = buildLand(seeded(2));
    const mesh = landMesh(land);
    for (let k = 0; k < WALL_VERTICES; k++) {
      const o = (land.rows * stripVertices(land.cols) + k) * VERTEX;
      expect([mesh[o + 2], mesh[o + 4], mesh[o + 5]]).toEqual([-1, WALL, 3]);
      expect(mesh[o + 1]! <= CAMERA.height).toBe(true);
    }
    expect(WALL).toBeLessThan(DEPTH);
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
