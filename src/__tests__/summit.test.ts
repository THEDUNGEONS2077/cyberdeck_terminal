/**
 * src/__tests__/summit.test.ts: SUMMIT's shapes and colours (wallpaper/
 * summit/terrain.ts): each layer loops with no seam (its skyline the same a
 * loop along, its facets covering the loop's ends), stays in its band, is
 * the same for the same random numbers, and takes its colours from the
 * palette (ALPENGLOW: crimson in the sun, navy in shadow).
 */
import { describe, expect, it } from 'vitest';

import { findPalette } from '@/lib/palettes';
import { LAYERS } from '@/wallpaper/summit/params';
import { facetColour, layLayer, rgb, skyline, summitTones } from '@/wallpaper/summit/terrain';
import type { WallpaperPalette } from '@/wallpaper/types';

/** A seeded random source (Park–Miller; big seeds, as a small one's first draws are all near 0). */
const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

/** A palette as the wallpaper gets it. */
function palette(id: string): WallpaperPalette {
  const c = findPalette(id).colors;
  return { bg: c.bg, line: c.line, dim: c.textDim, text: c.text, accent: c.accent, bright: c.textBright, cool: c.cool };
}

const H = 1080;
const PERIOD = 3072;

describe('SUMMIT', () => {
  it('loops: every skyline is the same a loop along', () => {
    for (const spec of LAYERS) {
      const line = skyline(seeded(1000003), spec, H, PERIOD);
      for (let x = 0; x < PERIOD; x += 37) expect(line(x + PERIOD)).toBeCloseTo(line(x), 6);
    }
  });

  it('covers its loop end to end, the facets at the seam reaching past both ends', () => {
    for (const spec of LAYERS) {
      const { facets } = layLayer(seeded(2000003), spec, H, PERIOD);
      const xs = facets.flatMap((f) => f.x);
      expect(Math.min(...xs)).toBeLessThanOrEqual(spec.rough * PERIOD);
      expect(Math.max(...xs)).toBeGreaterThanOrEqual(PERIOD);
      // Nothing strays more than a column outside the loop.
      expect(Math.min(...xs)).toBeGreaterThan(-PERIOD * 0.1);
      expect(Math.max(...xs)).toBeLessThan(PERIOD * 1.1);
    }
  });

  it('keeps each layer in its band, its skyline within its range of heights', () => {
    for (const spec of LAYERS) {
      const shape = layLayer(seeded(3000017), spec, H, PERIOD);
      for (const f of shape.facets) for (const y of f.y) expect(y).toBeLessThanOrEqual(spec.bottom * H + 1e-6);
      // A range's ridges carry sub-peaks a facet or so above them; a cloud bank's puffs heap up to about half a billow above it.
      if (spec.kind === 'rock') expect(shape.top).toBeGreaterThanOrEqual(spec.top[0] * H - 2 * spec.facet * H);
      if (spec.kind === 'cloud') expect(shape.top).toBeGreaterThanOrEqual((spec.top[0] - spec.spacing[1] * spec.slope * 0.5) * H - spec.facet * H);
      for (const f of shape.facets) {
        expect(f.light).toBeGreaterThanOrEqual(0);
        expect(f.light).toBeLessThanOrEqual(1);
      }
    }
  });

  it('is the same for the same random numbers; snow only on the far range', () => {
    const spec = LAYERS[1]!;
    expect(layLayer(seeded(4000037), spec, H, PERIOD)).toEqual(layLayer(seeded(4000037), spec, H, PERIOD));
    LAYERS.forEach((s, i) => {
      const snowy = layLayer(seeded(5000011 + i), s, H, PERIOD).facets.some((f) => f.snow);
      expect(snowy).toBe(s.snow > 0);
    });
  });

  it('draws its clouds in greys in every palette (the user, 0.28.1)', () => {
    const clouds = LAYERS.filter((s) => s.kind === 'cloud');
    for (const id of ['phosphor', 'amber', 'ice', 'neon', 'blood', 'azure', 'synth', 'outrun', 'alpenglow']) {
      const t = summitTones(palette(id));
      for (const spec of clouds) {
        for (const light of [0, 0.3, 0.6, 1]) {
          for (const depth of [0, 0.5, 1]) {
            const [r, g, b] = rgb(rgbHex(facetColour(t, spec, { x: [0, 0, 0], y: [0, 0, 0], light, snow: false, depth })));
            expect(Math.max(r, g, b) - Math.min(r, g, b), `${id}: rgb(${r}, ${g}, ${b})`).toBeLessThanOrEqual(1);
          }
        }
      }
    }
  });

  it('takes its colours from the palette: in ALPENGLOW, crimson in the sun and navy in shadow', () => {
    const t = summitTones(palette('alpenglow'));
    const rock = LAYERS.find((s) => s.kind === 'rock' && s.haze === 0)!;
    const sun = rgb(rgbHex(facetColour(t, rock, { x: [0, 0, 0], y: [0, 0, 0], light: 1, snow: false, depth: 0 })));
    const shade = rgb(rgbHex(facetColour(t, rock, { x: [0, 0, 0], y: [0, 0, 0], light: 0, snow: false, depth: 0 })));
    expect(sun[0]).toBeGreaterThan(sun[2] * 1.5);
    expect(shade[2]).toBeGreaterThan(shade[0]);
    // The sun's side is far brighter than the shadow's.
    expect(sun[0] + sun[1] + sun[2]).toBeGreaterThan((shade[0] + shade[1] + shade[2]) * 3);
  });
});

/** `rgb(r, g, b)` → `#rrggbb`. */
function rgbHex(css: string): string {
  return `#${css.match(/\d+/g)!.map((n) => Number(n).toString(16).padStart(2, '0')).join('')}`;
}
