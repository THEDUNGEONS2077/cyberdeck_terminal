/**
 * src/__tests__/appearance.test.ts: colour palettes and the wallpapers'
 * pure parts.
 *
 * Every palette must keep the design system's rule (DESIGN.md): every text
 * colour passes WCAG AA on every background it's drawn on. The neural net's
 * links and colours, VELOCITY's colours and DATA FLOW's board are checked
 * without a canvas.
 */
import { describe, expect, it } from 'vitest';

import { defaultLayout } from '@/lib/layout';
import { migrateLayout } from '@/lib/migrations';
import { contrast, DEFAULT_PALETTE, findPalette, PALETTE_IDS, PALETTE_TOKENS, PALETTES } from '@/lib/palettes';
import { type Board, buildBoard, DIRS, pointAt, traceLength } from '@/wallpaper/data-flow/board';
import { flowTones } from '@/wallpaper/data-flow/engine';
import { COVERAGE, MAIN_CHIP, PITCH } from '@/wallpaper/data-flow/params';
import { diagonal, linkNodes, rgb, shade } from '@/wallpaper/neural-net/engine';
import { tones } from '@/wallpaper/velocity/engine';

describe('palettes', () => {
  it('have unique ids, every colour, and the default first', () => {
    expect(new Set(PALETTE_IDS).size).toBe(PALETTES.length);
    expect(PALETTES[0]!.id).toBe(DEFAULT_PALETTE);
    for (const p of PALETTES) {
      expect(Object.keys(p.colors).sort()).toEqual(Object.keys(PALETTE_TOKENS).sort());
      for (const c of Object.values(p.colors)) expect(c).toMatch(/^#[0-9a-f]{6}$/);
    }
    expect(findPalette('from-the-future').id).toBe(DEFAULT_PALETTE);
  });

  it.each(PALETTES.map((p) => [p.id, p] as const))('%s: every text colour passes WCAG AA where it is drawn', (_id, p) => {
    const c = p.colors;
    for (const text of [c.textDim, c.text, c.accent, c.textBright]) {
      for (const bg of [c.bg, c.surface, c.surfaceRaised]) expect(contrast(text, bg)).toBeGreaterThanOrEqual(4.5);
    }
    // Bright text on a selected thing's wash (the lit choice in a row of choices).
    expect(contrast(c.textBright, c.wash)).toBeGreaterThanOrEqual(4.5);
  });

  it('works out contrast as WCAG does', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrast('#777777', '#777777')).toBeCloseTo(1, 5);
  });

  it('is kept in layouts: a layout without one gets the default; an unknown one too', () => {
    const { prefs } = defaultLayout();
    expect(prefs.palette).toBe(DEFAULT_PALETTE);
    expect(migrateLayout({ ...defaultLayout(), prefs: { ...prefs, palette: 'blood' } }).doc.prefs.palette).toBe('blood');
    expect(migrateLayout({ ...defaultLayout(), prefs: { backupReminderDays: 7 } }).doc.prefs.palette).toBe(DEFAULT_PALETTE);
    expect(migrateLayout({ ...defaultLayout(), prefs: { ...prefs, palette: 'plaid' } }).doc.prefs.palette).toBe(DEFAULT_PALETTE);
  });

  it('keeps the wallpaper’s palette apart; a layout from before gives it the dashboard’s', () => {
    const { prefs } = defaultLayout();
    const before = migrateLayout({ ...defaultLayout(), prefs: { backupReminderDays: 14, rainGlow: 'high', palette: 'blood' } }).doc.prefs;
    expect(before.wallpaperPalette).toBe('blood');
    const apart = migrateLayout({ ...defaultLayout(), prefs: { ...prefs, palette: 'amber', wallpaperPalette: 'ice' } }).doc.prefs;
    expect([apart.palette, apart.wallpaperPalette]).toEqual(['amber', 'ice']);
  });
});

describe('neural net', () => {
  /** A repeatable random source. */
  const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

  it('links each pair once, never longer than allowed, and lets a hub reach many', () => {
    const rng = seeded(7);
    const n = 60;
    const xs = Array.from({ length: n }, () => rng() * 1000);
    const ys = Array.from({ length: n }, () => rng() * 600);
    const want = Array.from({ length: n }, (_, i) => (i === 0 ? 9 : 3));
    const links = linkNodes(xs, ys, want, 400, seeded(3));
    const keys = links.map(([a, b]) => `${a}-${b}`);
    expect(new Set(keys).size).toBe(links.length);
    for (const [a, b] of links) {
      expect(a).toBeLessThan(b);
      expect(Math.hypot(xs[a]! - xs[b]!, ys[a]! - ys[b]!)).toBeLessThanOrEqual(400);
    }
    expect(links.filter(([a, b]) => a === 0 || b === 0).length).toBeGreaterThanOrEqual(9);
  });

  it('shades from the cool colour at the top left to the accent at the bottom right', () => {
    expect(diagonal(0, 0)).toBe(0);
    expect(diagonal(1, 1)).toBe(1);
    expect(diagonal(0, 1)).toBeGreaterThan(diagonal(1, 0));
    const palette = { bg: '#000000', line: '#111111', dim: '#222222', text: '#333333', accent: '#ff3040', bright: '#ffc8cc', cool: '#1f6894' };
    expect(shade(palette, 1).map(Math.round)).toEqual(rgb('#ff3040'));
    // The top left is the cool hue (blue over red), lifted towards white.
    const top = shade(palette, 0);
    expect(top[2]).toBeGreaterThan(top[0]);
  });
});

describe('velocity', () => {
  it('takes its light from the palette: pale from the cool hue (leaning blue), red from the accent', () => {
    const palette = { bg: '#000000', line: '#111111', dim: '#222222', text: '#333333', accent: '#ff3040', bright: '#ffc8cc', cool: '#1f6894' };
    const t = tones(palette);
    expect(t.red).toBe('255, 48, 64');
    const [r, g, b] = t.pale.split(', ').map(Number) as [number, number, number];
    expect(b).toBeGreaterThan(g);
    expect(g).toBeGreaterThan(r);
    expect(r).toBeGreaterThan(150);
  });
});

describe('data flow', () => {
  /** A repeatable random source. */
  const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

  /** Every grid point a trace runs through, step by step (its corners joined). */
  const points = (b: Board, i: number): string[] => {
    const t = b.traces[i]!;
    const out: string[] = [`${t.pts[0]},${t.pts[1]}`];
    for (let k = 2; k < t.pts.length; k += 2) {
      const [x0, y0, x1, y1] = [t.pts[k - 2]!, t.pts[k - 1]!, t.pts[k]!, t.pts[k + 1]!];
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let s = 1; s <= n; s++) out.push(`${x0 + ((x1 - x0) / n) * s},${y0 + ((y1 - y0) / n) * s}`);
    }
    return out;
  };

  const desk = buildBoard(1920, 1080, seeded(7));
  const phone = buildBoard(384, 832, seeded(11));

  it('lays out the same board for the same seed', () => {
    expect(JSON.stringify(buildBoard(1920, 1080, seeded(7)))).toBe(JSON.stringify(desk));
  });

  it('puts the main chip a little right of the middle, and keeps chips apart', () => {
    for (const b of [desk, phone]) {
      const main = b.chips[0]!;
      expect(main.main).toBe(true);
      const sw = Math.ceil(b.w / PITCH);
      const sh = Math.ceil(b.h / PITCH);
      expect(Math.abs(main.x + main.w / 2 - sw * MAIN_CHIP.at[0])).toBeLessThanOrEqual(1);
      expect(Math.abs(main.y + main.h / 2 - sh * MAIN_CHIP.at[1])).toBeLessThanOrEqual(1);
      expect(b.chips.length).toBeGreaterThanOrEqual(3);
      for (const a of b.chips) {
        for (const c of b.chips) {
          if (a === c) continue;
          // Their rings (two points round each) never meet.
          const apart = a.x + a.w + 2 <= c.x - 1 || c.x + c.w + 2 <= a.x - 1 || a.y + a.h + 2 <= c.y - 1 || c.y + c.h + 2 <= a.y - 1;
          expect(apart).toBe(true);
        }
      }
    }
  });

  it('routes every trace at right angles and 45°, never through another or a chip', () => {
    for (const b of [desk, phone]) {
      const seen = new Map<string, number>();
      b.traces.forEach((t, i) => {
        expect(t.pts.length).toBeGreaterThanOrEqual(4);
        for (let k = 2; k < t.pts.length; k += 2) {
          const dx = t.pts[k]! - t.pts[k - 2]!;
          const dy = t.pts[k + 1]! - t.pts[k - 1]!;
          expect(dx !== 0 || dy !== 0).toBe(true);
          expect(dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy)).toBe(true);
        }
        for (const p of points(b, i)) {
          expect(seen.get(p), `trace ${i} runs through trace ${seen.get(p)}'s point ${p}`).toBeUndefined();
          seen.set(p, i);
          const [x, y] = p.split(',').map(Number) as [number, number];
          for (const c of b.chips) expect(x >= c.x && x < c.x + c.w && y >= c.y && y < c.y + c.h).toBe(false);
        }
      });
      // Every direction is one of the eight.
      expect(DIRS.length).toBe(8);
    }
  });

  it('starts a chip trace at one of its chip’s pins, and covers the screen as asked', () => {
    for (const b of [desk, phone]) {
      for (const t of b.traces) {
        if (t.start !== 'chip') continue;
        const pins = b.chips[t.chip]!.pins;
        expect(pins.some((p) => p.x === t.pts[0] && p.y === t.pts[1])).toBe(true);
      }
      const sw = Math.ceil(b.w / PITCH);
      const sh = Math.ceil(b.h / PITCH);
      const onScreen = new Set<string>();
      b.traces.forEach((_, i) => {
        for (const p of points(b, i)) {
          const [x, y] = p.split(',').map(Number) as [number, number];
          if (x >= 0 && y >= 0 && x <= sw && y <= sh) onScreen.add(p);
        }
      });
      expect(onScreen.size / ((sw + 1) * (sh + 1))).toBeGreaterThanOrEqual(COVERAGE * 0.9);
    }
    // Buses: several traces running out together.
    expect(desk.buses.filter((bus) => bus.length >= 3).length).toBeGreaterThan(3);
  });

  it('finds the point any distance along a trace, round its bends', () => {
    const t = { pts: [0, 0, 3, 0, 5, 2], len: [0, 3, 3 + 2 * Math.SQRT2], width: 1, cool: false, start: 'via', end: 'via', chip: -1, bus: -1 } as const;
    const at = [0, 0];
    const trace = { ...t, pts: [...t.pts], len: [...t.len] };
    expect(pointAt(trace, 0, at)).toEqual([0, 0]);
    expect(pointAt(trace, 2, at)).toEqual([2, 0]);
    const mid = pointAt(trace, 3 + Math.SQRT2, at);
    expect(mid[0]).toBeCloseTo(4);
    expect(mid[1]).toBeCloseTo(1);
    expect(pointAt(trace, 99, at)).toEqual([5, 2]);
    expect(traceLength(trace)).toBeCloseTo(3 + 2 * Math.SQRT2);
  });

  it('takes its colours from the palette: warm light from the accent, cool from the cool hue', () => {
    const palette = { bg: '#000000', line: '#3a1216', dim: '#d4545e', text: '#e86a72', accent: '#ff3040', bright: '#ffc8cc', cool: '#1f6894' };
    const t = flowTones(palette);
    expect(t.warmLight).toEqual([255, 48, 64]);
    expect(t.coolLight[2]).toBeGreaterThan(t.coolLight[0]);
    expect(t.warmTrace[0]).toBeGreaterThan(t.warmTrace[2]);
  });
});
