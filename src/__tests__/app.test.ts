/**
 * src/__tests__/app.test.ts: the keyboard rules, the fullscreen toggle,
 * and the rain engine's pure helpers.
 */
import { toggleFullscreen } from '@/app/fullscreen';
import { shortcutFor } from '@/app/useShortcuts';
import { GLOW_LEVELS } from '@/lib/layout';
import { fadedAlpha, FADE_ALPHA, FADE_ORDER, resizeCells, spawnDrop } from '@/wallpaper/matrix-rain/engine';
import { BASE_GLYPHS, desaturate, glyphSet, KATAKANA, withAlpha } from '@/wallpaper/matrix-rain/glyphAtlas';
import { END_BIAS, FADE_INTERVAL, FADE_PHASES, GLOW, LAYERS, TRAIL_SECONDS } from '@/wallpaper/matrix-rain/params';
import { knownWallpaperId, WALLPAPER_LIST } from '@/wallpaper/catalog';
import { findWallpaper, WALLPAPERS } from '@/wallpaper/registry';

/** A key event as the shortcut rules see it. */
const key = (k: string, extra: Partial<KeyboardEvent> & { tag?: string } = {}) => ({
  key: k,
  target: { tagName: extra.tag ?? 'BODY', isContentEditable: false } as unknown as EventTarget,
  ctrlKey: false,
  altKey: false,
  metaKey: false,
  repeat: false,
  ...extra,
});

describe('shortcuts', () => {
  it('F is fullscreen and S is SYSTEM, in either case', () => {
    expect(shortcutFor(key('f'))).toBe('fullscreen');
    expect(shortcutFor(key('F'))).toBe('fullscreen');
    expect(shortcutFor(key('s'))).toBe('system');
    expect(shortcutFor(key('x'))).toBeNull();
  });

  it('leaves typing, held keys and browser shortcuts alone', () => {
    expect(shortcutFor(key('f', { tag: 'INPUT' }))).toBeNull();
    expect(shortcutFor(key('f', { tag: 'TEXTAREA' }))).toBeNull();
    expect(shortcutFor(key('f', { tag: 'SELECT' }))).toBeNull();
    expect(shortcutFor(key('f', { ctrlKey: true }))).toBeNull(); // Ctrl+F: find in page
    expect(shortcutFor(key('f', { metaKey: true }))).toBeNull();
    expect(shortcutFor(key('f', { altKey: true }))).toBeNull();
    expect(shortcutFor(key('f', { repeat: true }))).toBeNull();
  });
});

describe('toggleFullscreen', () => {
  /** A stand-in document with the Fullscreen API. */
  const fakeDoc = (inFullscreen: boolean) => {
    const doc = {
      fullscreenElement: inFullscreen ? ({} as Element) : null,
      documentElement: { requestFullscreen: vi.fn(async () => {}) },
      exitFullscreen: vi.fn(async () => {}),
    };
    return doc;
  };

  it('enters when not fullscreen, leaves when it is', async () => {
    const off = fakeDoc(false);
    await toggleFullscreen(off);
    expect(off.documentElement.requestFullscreen).toHaveBeenCalledOnce();
    const on = fakeDoc(true);
    await toggleFullscreen(on);
    expect(on.exitFullscreen).toHaveBeenCalledOnce();
  });

  it('ignores a refusal', async () => {
    const doc = fakeDoc(false);
    doc.documentElement.requestFullscreen = vi.fn(async () => {
      throw new Error('not allowed');
    });
    await expect(toggleFullscreen(doc)).resolves.toBeUndefined();
  });
});

describe('matrix rain', () => {
  /** A repeatable random source. */
  const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

  it('mirrors katakana and adds them only when they can be drawn', () => {
    expect(glyphSet(false)).toHaveLength([...BASE_GLYPHS].length);
    const full = glyphSet(true);
    expect(full.filter((g) => g.mirrored)).toHaveLength([...KATAKANA].length * 2);
    expect(full.filter((g) => !g.mirrored).every((g) => BASE_GLYPHS.includes(g.char))).toBe(true);
  });

  it('spawns drops inside the layer’s ranges', () => {
    const rng = seeded(7);
    for (const p of LAYERS) {
      for (let i = 0; i < 200; i++) {
        const d = spawnDrop(p, 120, 50, rng);
        expect(d.speed).toBeGreaterThanOrEqual(p.speed[0]);
        expect(d.speed).toBeLessThan(p.speed[1]);
        expect(d.alpha).toBeGreaterThanOrEqual(p.alpha[0]);
        expect(d.end).toBeGreaterThanOrEqual(4);
        expect(d.end).toBeLessThanOrEqual(Math.ceil(120 * 1.08));
        expect(d.glyph).toBeLessThan(50);
        expect(d.y).toBe(0);
        expect(d.wait).toBeGreaterThan(0);
      }
    }
  });

  it('scattered drops start mid-fall, with no wait', () => {
    const d = spawnDrop(LAYERS[0]!, 120, 50, seeded(3), true);
    expect(d.wait).toBe(0);
    expect(d.y).toBeLessThanOrEqual(d.end);
    expect(d.drawn).toBe(Math.floor(d.y) - 1);
  });

  it(`most drops fall deep (END_BIAS ${END_BIAS})`, () => {
    const rng = seeded(11);
    const ends = Array.from({ length: 2000 }, () => spawnDrop(LAYERS[1]!, 100, 50, rng).end);
    const deep = ends.filter((e) => e >= 60).length / ends.length;
    expect(deep).toBeGreaterThan(0.7);
  });

  it('fades a glyph to about 2% over TRAIL_SECONDS, in whole fade steps', () => {
    expect(fadedAlpha(1, TRAIL_SECONDS)).toBeCloseTo(0.02, 2);
    expect(fadedAlpha(1, FADE_INTERVAL * 0.99)).toBe(1);
    // Strong enough per step that 8-bit rounding can't leave ghosts brighter than ~3%.
    expect(0.5 / FADE_ALPHA / 255).toBeLessThan(0.04);
  });

  it('fades every stripe set exactly once per cycle, never two neighbours in a row', () => {
    expect([...FADE_ORDER].sort((a, b) => a - b)).toEqual(Array.from({ length: FADE_PHASES }, (_, i) => i));
    // Consecutive phases land apart, so the fade never reads as a line sweeping down.
    FADE_ORDER.forEach((p, i) => {
      const next = FADE_ORDER[(i + 1) % FADE_PHASES]!;
      const gap = Math.min(Math.abs(next - p), FADE_PHASES - Math.abs(next - p));
      expect(gap).toBeGreaterThan(1);
    });
  });

  it('glows more at each level, in every respect', () => {
    for (let i = 1; i < GLOW_LEVELS.length; i++) {
      const [weaker, stronger] = [GLOW[GLOW_LEVELS[i - 1]!], GLOW[GLOW_LEVELS[i]!]];
      expect(stronger.alpha).toBeGreaterThan(weaker.alpha);
      expect(stronger.head).toBeGreaterThan(weaker.head);
      expect(stronger.headLayers).toBeGreaterThanOrEqual(weaker.headLayers);
      expect(stronger.body).toBeGreaterThan(weaker.body);
    }
  });

  it('keeps the glyph grid in place when the screen is resized', () => {
    const NONE = 0xffff;
    // 3 columns × 2 rows: 0 1 2 / 3 4 5.
    const cells = Uint16Array.from([0, 1, 2, 3, 4, 5]);
    expect(resizeCells(cells, 3, 2, 3, 2)).toBe(cells);
    // Narrower and taller: the left columns stay where they were, the new row is empty.
    expect([...resizeCells(cells, 3, 2, 2, 3)]).toEqual([0, 1, 3, 4, NONE, NONE]);
    // Wider: new columns are empty.
    expect([...resizeCells(cells, 3, 2, 4, 1)]).toEqual([0, 1, 2, NONE]);
    expect([...resizeCells(null, 0, 0, 2, 1)]).toEqual([NONE, NONE]);
  });

  it('turns hex tokens into canvas colours', () => {
    expect(withAlpha('#39ff14', 0.6)).toBe('rgba(57, 255, 20, 0.6)');
    expect(desaturate('#2fb344', 0)).toBe('rgb(47, 179, 68)');
    expect(desaturate('#2fb344', 1)).toMatch(/^rgb\((\d+), \1, \1\)$/);
  });
});

describe('wallpaper registry', () => {
  it('has unique ids and falls back to the default for unknown ones', () => {
    const ids = WALLPAPER_LIST.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(knownWallpaperId('matrix-rain')).toBe('matrix-rain');
    expect(knownWallpaperId('from-the-future')).toBe('matrix-rain');
    expect(findWallpaper('matrix-rain').id).toBe('matrix-rain');
    expect(findWallpaper('from-the-future').id).toBe('matrix-rain');
  });

  it('has an engine for every wallpaper the page lists, and no other', () => {
    expect(WALLPAPERS.map((w) => w.id).sort()).toEqual(WALLPAPER_LIST.map((w) => w.id).sort());
  });
});
