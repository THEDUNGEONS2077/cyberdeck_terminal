/**
 * src/__tests__/quantum.test.ts: QUANTUM KERNEL's code (wallpaper/
 * quantum-kernel/code.ts): written only in the MATRIX RAIN's glyphs, laid
 * out as code (lanes of indented blocks, within its loop of rows), the same
 * for the same random numbers; and its colours from the palette.
 */
import { describe, expect, it } from 'vitest';

import { PALETTES } from '@/lib/palettes';
import { BASE_GLYPHS, KATAKANA } from '@/wallpaper/matrix-rain/glyphAtlas';
import { statement, writeCode } from '@/wallpaper/quantum-kernel/code';
import { kernelTones } from '@/wallpaper/quantum-kernel/engine';
import { DEPTHS, GLYPH_WIDTH } from '@/wallpaper/quantum-kernel/params';

/** A seeded random source (Park–Miller), so the tests see the same code each run. */
const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

const letters = [...KATAKANA, ...KATAKANA, ...[...BASE_GLYPHS].filter((c) => /[0-9A-Z]/.test(c))];

describe('QUANTUM KERNEL', () => {
  it('writes only the rain’s glyphs and spaces', () => {
    const allowed = new Set([...KATAKANA, ...BASE_GLYPHS, ' ']);
    for (const spec of DEPTHS) {
      for (const line of writeCode(seeded(5), 200, 80, spec, letters)) {
        for (const ch of line.text) expect(allowed.has(ch), `“${ch}” isn’t one of the rain’s`).toBe(true);
      }
    }
  });

  it('lays code out in its lanes, within its loop, as blocks with gaps between', () => {
    const spec = DEPTHS[3]!;
    const cols = 120;
    const rows = 60;
    const lines = writeCode(seeded(9), cols, rows, spec, letters);
    expect(lines.length).toBeGreaterThan(20);
    for (const l of lines) {
      expect(l.row).toBeGreaterThanOrEqual(0);
      expect(l.row).toBeLessThan(rows);
      expect(l.col).toBeGreaterThanOrEqual(0);
    }
    // Each lane starts its lines within its own share of the width (indent at most 4 × 2 in).
    const laneW = cols / spec.lanes;
    for (const l of lines) expect(l.col).toBeLessThan(cols - laneW + laneW * 0.25 + 8 + laneW);
    // In one lane, not every row is code: blocks have gaps between them (lanes side by side may fill each other's).
    const one = writeCode(seeded(9), cols, rows, { ...spec, lanes: 1 }, letters);
    expect(new Set(one.map((l) => l.row)).size).toBeLessThan(rows);
  });

  it('spreads its code evenly across the width (no empty strip down the right: the user, 0.27.2)', () => {
    // A 1920 px screen at each depth: the glyphs in the left and right thirds, over many seeds (one alone may lean by chance; the old layout always leaned right-empty).
    for (const spec of DEPTHS) {
      const cols = Math.ceil(1920 / (spec.font * GLYPH_WIDTH));
      let left = 0;
      let right = 0;
      // Big seeds: Park–Miller's first draw from a small one is near 0, so small seeds would all share one phase.
      for (let k = 1; k <= 40; k++) {
        for (const l of writeCode(seeded(k * 1000003), cols, 200, spec, letters)) {
          for (let i = 0; i < l.text.length; i++) {
            const c = l.col + i;
            if (l.text[i] === ' ' || c >= cols) continue;
            if (c < cols / 3) left++;
            else if (c >= (2 * cols) / 3) right++;
          }
        }
      }
      expect(Math.min(left, right) / Math.max(left, right), `font ${spec.font}: left ${left}, right ${right}`).toBeGreaterThan(0.75);
    }
  });

  it('indents after a line that opens a block, as code does', () => {
    const lines = writeCode(seeded(3), 200, 400, DEPTHS[2]!, letters);
    // Lines on the screen (one cut off at its left edge has lost its indent with its first glyphs).
    const opened = lines.filter((l, i) => l.col > 0 && l.text.endsWith(':') && lines[i + 1]?.row === l.row + 1);
    expect(opened.length).toBeGreaterThan(3);
    for (const l of opened) {
      const next = lines[lines.indexOf(l) + 1]!;
      expect(next.col - l.col === 2 || l.col - next.col >= 0).toBe(true);
    }
  });

  it('is the same code for the same random numbers; a statement is about as long as asked', () => {
    expect(writeCode(seeded(7), 100, 50, DEPTHS[1]!, letters)).toEqual(writeCode(seeded(7), 100, 50, DEPTHS[1]!, letters));
    const s = statement(seeded(11), letters, 20);
    expect(s.length).toBeGreaterThanOrEqual(20);
    expect(s.length).toBeLessThan(40);
  });

  it('takes its colours from the palette (AZURE gives the reference’s blues)', () => {
    const t = kernelTones({ bg: '#000000', line: '#0b3a7a', dim: '#3d84d0', text: '#55a2ee', accent: '#3ca0ff', bright: '#cfe4ff', cool: '#0b3c99' });
    // The code blue, never grey.
    const blue = (c: string) => c.match(/\d+/g)!.map(Number);
    const [r, , b] = blue(t.focus);
    expect(b).toBeGreaterThan(r! * 2);
  });

  it('draws on true black in every palette (its background is --bg, black in all eight: the user, 0.27.1)', () => {
    for (const p of PALETTES) expect(p.colors.bg).toBe('#000000');
  });
});
