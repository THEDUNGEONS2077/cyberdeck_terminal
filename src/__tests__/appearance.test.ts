/**
 * src/__tests__/appearance.test.ts: colour palettes and the neural-net
 * wallpaper's pure parts.
 *
 * Every palette must keep the design system's rule (DESIGN.md): every text
 * colour passes WCAG AA on every background it's drawn on. The neural net's
 * links and colours are checked without a canvas.
 */
import { describe, expect, it } from 'vitest';

import { defaultLayout } from '@/lib/layout';
import { migrateLayout } from '@/lib/migrations';
import { contrast, DEFAULT_PALETTE, findPalette, PALETTE_IDS, PALETTE_TOKENS, PALETTES } from '@/lib/palettes';
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
