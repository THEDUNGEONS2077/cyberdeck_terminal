/**
 * src/__tests__/appearance.test.ts: colour palettes and the wallpapers'
 * pure parts.
 *
 * Every palette must keep the design system's rule (DESIGN.md): every text
 * colour passes WCAG AA on every background it's drawn on. The neural net's
 * links and colours, VELOCITY's colours and DATA FLOW's board are checked
 * without a canvas. ZOOM's steps, how it's kept, and the size a zoomed
 * wallpaper lays itself out at, too.
 */
import { describe, expect, it } from 'vitest';

import { DEFAULT_ZOOM, defaultLayout, MAX_ZOOMS, nearestZoom, normalizeZooms, stepZoom, summarizeLayout, withZoom, ZOOM_STEPS, zoomLabel, zoomOf } from '@/lib/layout';
import { migrateLayout } from '@/lib/migrations';
import { contrast, DEFAULT_PALETTE, findPalette, PALETTE_IDS, PALETTE_TOKENS, PALETTES } from '@/lib/palettes';
import { type Board, buildBoard, DIRS, pointAt, traceLength } from '@/wallpaper/data-flow/board';
import { flowTones } from '@/wallpaper/data-flow/engine';
import { COVERAGE, MAIN_CHIP, PITCH } from '@/wallpaper/data-flow/params';
import { diagonal, linkNodes, rgb, shade } from '@/wallpaper/neural-net/engine';
import { tones } from '@/wallpaper/velocity/engine';
import { zoomedSize } from '@/wallpaper/types';
import { buildCity, cityTones, foreground, inSight, NO_TOWER, placeFigure, SHAPE, skyline, skylineRows } from '@/wallpaper/megacity/city';
import { FIGURE_OUTLINES, FIGURE_TRIANGLES, FIGURE_VERTICES } from '@/wallpaper/megacity/figure';
import { LAYERS as CITY_LAYERS, SKYLINE_WIDTH } from '@/wallpaper/megacity/params';
import { CitySim, frameRoom, GLOW, MAX_DRONES, packGlows, packSigns } from '@/wallpaper/megacity/sim';
import { memoryKV } from '@/store/kv';
import { createLayoutStore } from '@/store/layout';
import { boot } from '@/store/persist';

describe('zoom', () => {
  it('steps as a browser zooms, from 50% to 200%, with 100% among them', () => {
    expect(ZOOM_STEPS[0]).toBe(0.5);
    expect(ZOOM_STEPS[ZOOM_STEPS.length - 1]).toBe(2);
    expect(ZOOM_STEPS).toContain(DEFAULT_ZOOM);
    for (let i = 1; i < ZOOM_STEPS.length; i++) expect(ZOOM_STEPS[i]!).toBeGreaterThan(ZOOM_STEPS[i - 1]!);
    expect(stepZoom(1, 1)).toBe(1.1);
    expect(stepZoom(1, -1)).toBe(0.9);
    expect(stepZoom(2, 1)).toBe(2);
    expect(stepZoom(0.5, -1)).toBe(0.5);
    // From between steps: the nearest one.
    expect(nearestZoom(1.3)).toBe(1.25);
    expect(nearestZoom(9)).toBe(2);
    expect(nearestZoom(Number.NaN)).toBe(DEFAULT_ZOOM);
    expect(zoomLabel(1.25)).toBe('125%');
    expect(zoomLabel(0.67)).toBe('67%');
  });

  it('is kept per wallpaper in the layout, only where it isn’t 100%; an older layout has none', () => {
    expect(defaultLayout().prefs.wallpaperZoom).toEqual({});
    expect(migrateLayout({ ...defaultLayout(), prefs: { backupReminderDays: 14 } }).doc.prefs.wallpaperZoom).toEqual({});
    const odd = { 'data-flow': 1.3, 'matrix-rain': 1, velocity: 'big', '': 2, 'neural-net': 0.1 };
    expect(migrateLayout({ ...defaultLayout(), prefs: { ...defaultLayout().prefs, wallpaperZoom: odd } }).doc.prefs.wallpaperZoom).toEqual({ 'data-flow': 1.25, 'neural-net': 0.5 });
    expect(normalizeZooms([1.5])).toEqual({});
    expect(Object.keys(normalizeZooms(Object.fromEntries(Array.from({ length: 50 }, (_, i) => [`w${i}`, 1.5]))))).toHaveLength(MAX_ZOOMS);
    // Zoomed and set back: the same document as before.
    const zoomed = withZoom({}, 'data-flow', 1.5);
    expect(zoomOf(zoomed, 'data-flow')).toBe(1.5);
    expect(zoomOf(zoomed, 'velocity')).toBe(DEFAULT_ZOOM);
    expect(withZoom(zoomed, 'data-flow', 1)).toEqual({});
    expect(summarizeLayout({ ...defaultLayout(), wallpaper: 'data-flow', prefs: { ...defaultLayout().prefs, wallpaperZoom: zoomed } })).toContain('ZOOM 150%');
    expect(summarizeLayout({ ...defaultLayout(), prefs: { ...defaultLayout().prefs, wallpaperZoom: zoomed } })).not.toContain('ZOOM');
  });

  it('is set through the store a step at a time; 100% takes the entry away', async () => {
    const kv = memoryKV();
    const store = createLayoutStore(kv, await boot(kv, 0), undefined, () => 0);
    store.getState().setWallpaperZoom('velocity', 1.6);
    expect(store.getState().layout.prefs.wallpaperZoom).toEqual({ velocity: 1.5 });
    store.getState().setWallpaperZoom('velocity', DEFAULT_ZOOM);
    expect(store.getState().layout.prefs.wallpaperZoom).toEqual({});
    await store.getState().settled();
  });

  it('lays a wallpaper out for a smaller screen and draws it larger: the canvas keeps its pixels', () => {
    for (const zoom of ZOOM_STEPS) {
      const s = zoomedSize(1920, 1080, 1, zoom, 2);
      expect(Math.round(s.w * s.dpr)).toBe(1920);
      expect(Math.round(s.h * s.dpr)).toBe(1080);
      expect(s.w).toBeCloseTo(1920 / zoom);
    }
    // The ratio is capped before it's zoomed: zooming in never lowers the canvas's resolution.
    expect(zoomedSize(1280, 800, 3, 2, 2)).toEqual({ w: 640, h: 400, dpr: 4 });
    expect(zoomedSize(100, 100, 1, 0, 2)).toEqual({ w: 100, h: 100, dpr: 1 });
  });
});

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

describe('megacity', () => {
  const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const neon = { bg: '#000000', line: '#3a1033', dim: '#cc4fb0', text: '#ea6ad0', accent: '#ff3fdc', bright: '#ffc6f2', cool: '#3a6bff' };
  const screens: [number, number][] = [
    [1920, 1080],
    [384, 832],
    [1280, 800],
  ];

  it('lays out the same city for the same seed, its layers across the whole screen', () => {
    for (const [w, h] of screens) {
      const a = buildCity(w, h, seeded(7));
      const b = buildCity(w, h, seeded(7));
      expect(JSON.stringify(a.layers)).toBe(JSON.stringify(b.layers));
      expect(a.layers).toHaveLength(CITY_LAYERS.length);
      // The farthest layer is nearly a wall: the haze shows through only in narrow gaps.
      const covered = a.tops[0]!.slice(0, Math.floor(w)).filter((t) => t < NO_TOWER).length;
      expect(covered / Math.floor(w)).toBeGreaterThan(0.85);
    }
  });

  it('puts signs and beacons only where they can be seen, signs on a tower and apart', () => {
    for (const [w, h] of screens) {
      const city = buildCity(w, h, seeded(11));
      expect(city.signs.length).toBeGreaterThan(0);
      for (const s of city.signs) {
        expect(s.x).toBeGreaterThanOrEqual(0);
        expect(s.x + s.w).toBeLessThanOrEqual(w);
        expect(inSight(city, s.layer, s.x - 1, s.x + s.w + 1, s.y + s.h + 1)).toBe(true);
        for (let c = s.x; c < s.x + s.w; c++) expect(city.tops[s.layer]![c]!).toBeLessThanOrEqual(s.y);
      }
      city.signs.forEach((s, i) => city.signs.slice(i + 1).forEach((o) => expect(s.x < o.x + o.w && o.x < s.x + s.w && s.y < o.y + o.h && o.y < s.y + s.h).toBe(false)));
      for (const b of city.beacons) expect(inSight(city, b.layer, b.x - 2, b.x + 2, b.y - 1)).toBe(true);
    }
  });

  it('packs each layer’s skyline into the texture, spires marked', () => {
    const city = buildCity(1920, 1080, seeded(3));
    const data = skyline(city);
    const rows = skylineRows(city);
    expect(data.length).toBe(SKYLINE_WIDTH * rows * CITY_LAYERS.length * 4);
    for (let l = 0; l < CITY_LAYERS.length; l++) {
      for (const c of [0, 517, 1919]) expect(data[((l * rows + Math.floor(c / SKYLINE_WIDTH)) * SKYLINE_WIDTH + (c % SKYLINE_WIDTH)) * 4]).toBe(city.tops[l]![c]);
    }
    const spire = city.layers.flat().find((t) => t.spire);
    if (spire?.spire) {
      const l = city.layers.findIndex((ts) => ts.includes(spire));
      const c = spire.spire.x;
      const i = ((l * rows + Math.floor(c / SKYLINE_WIDTH)) * SKYLINE_WIDTH + (c % SKYLINE_WIDTH)) * 4;
      if (data[i] === spire.spire.top) expect(data[i + 3]).toBeLessThan(0);
    }
  });

  it('stands the figure on her ledge, on the screen, left of the middle, the railing behind her', () => {
    for (const [w, h] of screens) {
      const f = placeFigure(w, h);
      expect(f.feet - f.height).toBeGreaterThan(0);
      expect(f.feet).toBeLessThan(h);
      expect(f.x).toBeLessThan(w / 2);
      expect(f.ledgeRight).toBeGreaterThan(f.x);
      expect(f.railRight).toBeLessThan(f.x);
    }
  });

  it('has a sound figure mesh, and draws the foreground as whole triangles', () => {
    const verts = FIGURE_VERTICES.length / 2;
    expect(Math.max(...FIGURE_TRIANGLES)).toBeLessThan(verts);
    expect(FIGURE_OUTLINES.reduce((n, [, count]) => n + count, 0)).toBe(verts);
    let area = 0;
    for (let i = 0; i < FIGURE_TRIANGLES.length; i += 3) {
      const [a, b, c] = [FIGURE_TRIANGLES[i]!, FIGURE_TRIANGLES[i + 1]!, FIGURE_TRIANGLES[i + 2]!];
      area += Math.abs((FIGURE_VERTICES[2 * b]! - FIGURE_VERTICES[2 * a]!) * (FIGURE_VERTICES[2 * c + 1]! - FIGURE_VERTICES[2 * a + 1]!) - (FIGURE_VERTICES[2 * c]! - FIGURE_VERTICES[2 * a]!) * (FIGURE_VERTICES[2 * b + 1]! - FIGURE_VERTICES[2 * a + 1]!)) / 2;
    }
    // A slim figure: about a sixth of her height squared.
    expect(area).toBeGreaterThan(0.1);
    expect(area).toBeLessThan(0.25);
    const city = buildCity(384, 832, seeded(5));
    const fg = foreground(city, cityTones(neon), 2.8125);
    expect(fg.length % (SHAPE * 3)).toBe(0);
    for (let i = 5; i < fg.length; i += SHAPE) expect(fg[i]).toBeGreaterThanOrEqual(0);
  });

  it('takes its colours from the palette: the haze the cool hue, the signs the accent; with NEON, the reference’s', () => {
    const t = cityTones(neon);
    expect(t.skyTop).toEqual(rgb('#3a6bff').map((v) => v / 255));
    expect(t.signWarm).toEqual(rgb('#ff3fdc').map((v) => v / 255));
    // Violet lower down: redder than the top, still blue.
    expect(t.skyLow[0]).toBeGreaterThan(t.skyTop[0]);
    expect(t.skyLow[2]).toBeGreaterThan(t.skyLow[1]);
    // The figure near-black blue, darker than the near towers.
    expect(t.figure[2]).toBeGreaterThan(t.figure[0]);
    expect(t.figure[2]).toBeLessThan(t.faceNear[2] + 0.05);
  });

  it('moves within its pools: signs between dark and lit, drones crossing, haze drifting, each frame packed', () => {
    for (const [w, h] of screens) {
      const city = buildCity(w, h, seeded(9));
      const sim = new CitySim(city, seeded(10));
      const room = frameRoom(city);
      const t = cityTones(neon);
      let flickered = false;
      for (let f = 0; f < 30 * 120; f++) {
        sim.advance(1 / 30);
        expect(sim.drones).toBeLessThanOrEqual(MAX_DRONES);
        for (const b of sim.signBright) {
          expect(b).toBeGreaterThanOrEqual(0);
          expect(b).toBeLessThanOrEqual(1);
          if (b < 0.5) flickered = true;
        }
        for (let b = 0; b < city.beacons.length; b++) expect(sim.beacon(b)).toBeGreaterThanOrEqual(0);
        expect(packSigns(sim, t, 'high', room.signs)).toBe(city.signs.length);
        expect(packGlows(sim, t, 'high', room.glows) * GLOW).toBeLessThanOrEqual(room.glows.length);
      }
      expect(sim.drones).toBeGreaterThan(0);
      expect(flickered).toBe(true);
    }
  });
});

