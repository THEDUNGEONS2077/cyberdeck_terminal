/**
 * src/__tests__/prism.test.ts: PRISM's rules (wallpaper/prism): the field
 * (the same for a seed, blocks never cutting through each other, the lights
 * and tubes in view), the cube's faces (outward, far ones first), the
 * blocks' order back to front, and its colours from every palette.
 */
import { describe, expect, it } from 'vitest';

import { PALETTES } from '@/lib/palettes';
import { BOX, VIEW, breath, buildField, cameraAt, sortBackToFront } from '@/wallpaper/prism/field';
import { cubeVertices, prismTones } from '@/wallpaper/prism/engine';
import { FIELD, LIGHTS, TUBES } from '@/wallpaper/prism/params';

/** A seeded random source (mulberry32), so a field can be made twice. */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('prism', () => {
  it('makes the same field from the same seed', () => {
    expect(buildField(seeded(7))).toEqual(buildField(seeded(7)));
  });

  it('keeps every block inside the field, and no two overlapping', () => {
    for (const seed of [1, 2, 3]) {
      const f = buildField(seeded(seed));
      expect(f.count).toBeGreaterThan(100);
      const half = FIELD.cells / 2;
      const b = f.boxes;
      for (let i = 0; i < f.count; i++) {
        const o = i * BOX;
        expect(b[o]!).toBeGreaterThanOrEqual(-half);
        expect(b[o]! + b[o + 3]!).toBeLessThanOrEqual(half);
        expect(b[o + 4]!).toBeGreaterThan(0);
        for (let j = i + 1; j < f.count; j++) {
          const p = j * BOX;
          // Overlapping on all three axes would be two blocks cutting through each other.
          const apart = [0, 1, 2].some((k) => b[o + k]! + b[o + 3 + k]! <= b[p + k]! + 1e-4 || b[p + k]! + b[p + 3 + k]! <= b[o + k]! + 1e-4);
          expect(apart).toBe(true);
        }
      }
    }
  });

  it('puts the lights and the tubes in the part the camera sees', () => {
    const f = buildField(seeded(11));
    expect(f.lights).toHaveLength(LIGHTS.magenta + LIGHTS.blue + TUBES.runs);
    for (const l of f.lights) expect(Math.max(Math.abs(l.x), Math.abs(l.z))).toBeLessThanOrEqual(VIEW + 0.5);
    expect(f.tubes).toHaveLength(TUBES.runs * 2);
    for (const t of f.tubes) {
      const mid = [(t.a[0] + t.b[0]) / 2, (t.a[2] + t.b[2]) / 2];
      expect(Math.max(Math.abs(mid[0]!), Math.abs(mid[1]!))).toBeLessThanOrEqual(VIEW + 1);
    }
    // Lights breathe a little, around their strength.
    expect(breath(f.lights[0]!, 0)).toBeGreaterThan(0.7);
    expect(breath(f.lights[0]!, 3)).toBeLessThan(1.3);
  });

  it('winds every cube face outward, the far faces (−x, −y, −z) first', () => {
    const v = cubeVertices();
    expect(v.length).toBe(36 * 6);
    for (let t = 0; t < 12; t++) {
      const p = (k: number) => [0, 1, 2].map((i) => v[(t * 3 + k) * 6 + i]!);
      const n = [3, 4, 5].map((i) => v[t * 3 * 6 + i]!);
      const [a, b, c] = [p(0), p(1), p(2)];
      const e1 = b.map((x, i) => x - a[i]!);
      const e2 = c.map((x, i) => x - a[i]!);
      const cross = [e1[1]! * e2[2]! - e1[2]! * e2[1]!, e1[2]! * e2[0]! - e1[0]! * e2[2]!, e1[0]! * e2[1]! - e1[1]! * e2[0]!];
      expect(cross[0]! * n[0]! + cross[1]! * n[1]! + cross[2]! * n[2]!).toBeGreaterThan(0);
      // The first half of the faces face away from the camera's corner.
      expect(n.reduce((s, x) => s + x, 0)).toBe(t < 6 ? -1 : 1);
    }
  });

  it('orders the blocks back to front, and keeps them so as the camera sways', () => {
    const f = buildField(seeded(5));
    const order = Uint16Array.from({ length: f.count }, (_, i) => i);
    const depth = new Float32Array(f.count);
    for (const t of [0, 13, 40]) {
      const cam = cameraAt(t, 16 / 9, 1);
      sortBackToFront(f, cam, order, depth);
      for (let i = 1; i < f.count; i++) expect(depth[order[i - 1]!]!).toBeGreaterThanOrEqual(depth[order[i]!]!);
    }
  });

  it('makes its colours from every palette, the neon the brightest', () => {
    for (const p of PALETTES) {
      const c = p.colors;
      const t = prismTones({ bg: c.bg, line: c.line, dim: c.textDim, text: c.text, accent: c.accent, bright: c.textBright, cool: c.cool });
      const lum = (x: readonly number[]) => 0.2126 * x[0]! + 0.7152 * x[1]! + 0.0722 * x[2]!;
      expect(lum(t.neon)).toBeGreaterThan(lum(t.edge));
      expect(lum(t.navy)).toBeLessThan(0.12);
    }
  });
});
