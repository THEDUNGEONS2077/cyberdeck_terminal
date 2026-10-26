/**
 * src/__tests__/sunset.test.ts: SUNSET's rules (wallpaper/sunset): its
 * colours from a palette (OUTRUN, made for it, gives the reference's golden
 * sun melting into pink, purple and blue sky), and the numbers that keep it
 * seamless (the grid's distance wraps after whole squares and whole waves).
 * The shaders are checked drawing in the browser walk (e2e/walk.mjs).
 */
import { describe, expect, it } from 'vitest';

import { findPalette } from '@/lib/palettes';
import { GRID, HORIZON, STRIPES, SUN, WAVE, WRAP } from '@/wallpaper/sunset/params';
import { sunsetTones } from '@/wallpaper/sunset/engine';

/** A palette as the wallpaper engines take it. */
const palette = (id: string) => {
  const c = findPalette(id).colors;
  return { bg: c.bg, line: c.line, dim: c.textDim, text: c.text, accent: c.accent, bright: c.textBright, cool: c.cool };
};

describe('sunset', () => {
  it('takes OUTRUN’s colours: a golden sun top, a pink base, purple to blue sky', () => {
    const t = sunsetTones(palette('outrun'));
    // Gold: red and green high, blue low; pink: red over green.
    expect(t.sunTop[0]).toBeGreaterThan(0.9);
    expect(t.sunTop[1]).toBeGreaterThan(0.75);
    expect(t.sunTop[2]).toBeLessThan(0.5);
    expect(t.sunBase[0]).toBeGreaterThan(t.sunBase[1]);
    // The sky: more blue on the right than the left, more red on the left.
    expect(t.skyRight[2]).toBeGreaterThan(t.skyLeft[2]);
    expect(t.skyLeft[0]).toBeGreaterThan(t.skyRight[0]);
    // The grid lines light above the ground.
    expect(Math.max(...t.warm)).toBeGreaterThan(Math.max(...t.ground) * 3);
  });

  it('makes a sunset from every palette', () => {
    for (const id of ['phosphor', 'neon', 'synth', 'outrun']) {
      const t = sunsetTones(palette(id));
      for (const c of Object.values(t)) for (const v of c) expect(v).toBeGreaterThanOrEqual(0);
    }
  });

  it('wraps the grid’s distance after whole squares, so it never jumps', () => {
    expect(WRAP % GRID.cell).toBe(0);
    // The waves are whole cycles over WRAP (the engine passes 2π·n/WRAP): whole numbers.
    expect(Number.isInteger(WAVE.along)).toBe(true);
    expect(Number.isInteger(WAVE.across)).toBe(true);
  });

  it('sets the sun on the horizon, a little above the middle, its gaps narrow first then wider', () => {
    expect(SUN.y).toBeLessThan(0.5);
    expect(SUN.y + SUN.r).toBeGreaterThan(HORIZON);
    expect(STRIPES.gap[1]).toBeGreaterThan(STRIPES.gap[0]);
  });
});
