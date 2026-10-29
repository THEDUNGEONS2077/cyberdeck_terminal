/**
 * src/__tests__/polish.test.ts: the 0.14.0 polish and speed pass: the
 * wallpapers' sharpness and its guard (lib/sharpness.ts), panels snapping
 * on a drop (lib/arrange.ts snapBox), and COPY DIAGNOSTICS' text
 * (lib/diagnostics.ts: every section, and never an address).
 */
import { SNAP_GAP, snapBox } from '@/lib/arrange';
import { type DiagnosticsInput, diagnosticsText } from '@/lib/diagnostics';
import { GUARD_MIN_FRAMES, SHARP_DPR, drawnDpr, guardVerdict, normalizeSharpness, percentile, summarizeFrames, wantsGuard } from '@/lib/sharpness';
import { WALLPAPER_LIST, safeDprOf } from '@/wallpaper/catalog';

describe('sharpness', () => {
  it('draws at the screen’s own ratio up to full sharpness, and at the safe cap once stepped back', () => {
    expect(drawnDpr(2.5, 2, undefined)).toBe(2.5);
    expect(drawnDpr(4, 2, 'full')).toBe(SHARP_DPR);
    expect(drawnDpr(2.5, 2, 'safe')).toBe(2);
    // Never above the screen's own, never below 1.
    expect(drawnDpr(1.25, 2, 'safe')).toBe(1.25);
    expect(drawnDpr(0.5, 2, undefined)).toBe(1);
    expect(drawnDpr(Number.NaN, 2, undefined)).toBe(1);
  });

  it('watches only where full sharpness draws more than the safe cap', () => {
    expect(wantsGuard(1.5, 2)).toBe(false);
    expect(wantsGuard(2, 2)).toBe(false);
    expect(wantsGuard(2.5, 2)).toBe(true);
    expect(wantsGuard(2, 1.5)).toBe(true);
  });

  it('keeps full sharpness when frames are quick, steps back when p95 is over budget, and waits when there are too few', () => {
    const quick = Array.from({ length: 60 }, (_, i) => (i < 58 ? 3 : 12));
    expect(guardVerdict(quick, 8)).toBe('full');
    const slow = Array.from({ length: 60 }, (_, i) => (i < 50 ? 4 : 11));
    expect(guardVerdict(slow, 8)).toBe('safe');
    expect(guardVerdict(Array(GUARD_MIN_FRAMES - 1).fill(1), 8)).toBeNull();
    // A budget of 0 (the browser tests' knob) always steps back.
    expect(guardVerdict(Array(40).fill(0.5), 0)).toBe('safe');
  });

  it('keeps each wallpaper’s safe cap as it drew before (VELOCITY 1.5, the rest 2)', () => {
    expect(WALLPAPER_LIST.map((w) => [w.id, w.safeDpr])).toEqual([
      ['matrix-rain', 2],
      ['neural-net', 2],
      ['velocity', 1.5],
      ['data-flow', 2],
      ['megacity', 2],
      ['horizon', 2],
      ['sunset', 2],
      ['prism', 2],
      ['quantum-kernel', 2],
      ['summit', 2],
    ]);
    expect(safeDprOf('unknown')).toBe(2);
  });

  it('reads stored verdicts, dropping anything else', () => {
    expect(normalizeSharpness({ 'matrix-rain': 'safe', velocity: 'full', x: 'maybe', y: 3 })).toEqual({ 'matrix-rain': 'safe', velocity: 'full' });
    expect(normalizeSharpness('junk')).toEqual({});
  });

  it('sums frames up', () => {
    expect(percentile([5, 1, 3, 2, 4], 0.5)).toBe(3);
    const s = summarizeFrames([16, 17, 16, 17], [2, 2, 4, 2]);
    expect(s.fps).toBeCloseTo(60.6, 1);
    expect(s.drawPerSecond).toBeCloseTo(151.5, 1);
    expect(s.p95Draw).toBe(4);
  });
});

describe('snapping', () => {
  const view = { w: 1920, h: 1080 };
  const nav = { left: 400, top: 136, right: 1520, bottom: 900 };

  it('settles a dropped panel against the window’s edges, 8 px in', () => {
    expect(snapBox({ left: 3, top: 14, right: 203, bottom: 114 }, [], view)).toEqual({ left: SNAP_GAP, top: SNAP_GAP });
    expect(snapBox({ left: 1650, top: 500, right: 1915, bottom: 600 }, [], view)).toEqual({ left: 1647, top: 500 });
  });

  it('lines a panel up with another’s edge, or sets it beside it with the gap', () => {
    // Beside NAV: its left 5 px past NAV's right edge + gap → flush at the gap.
    expect(snapBox({ left: 1533, top: 300, right: 1833, bottom: 400 }, [nav], view)).toEqual({ left: 1528, top: 300 });
    // Lined up with NAV's top.
    expect(snapBox({ left: 1600, top: 140, right: 1900, bottom: 240 }, [nav], view).top).toBe(136);
  });

  it('leaves an axis alone when nothing is within reach', () => {
    expect(snapBox({ left: 700, top: 500, right: 900, bottom: 600 }, [], view)).toEqual({ left: 700, top: 500 });
  });
});

describe('COPY DIAGNOSTICS', () => {
  const input: DiagnosticsInput = {
    app: { version: '0.14.0', build: 22 },
    browser: 'Google Chrome 141 · Windows',
    screen: { w: 1536, h: 864, dpr: 2.5, windowW: 1536, windowH: 730 },
    gpu: 'ANGLE (Intel, Intel(R) Arc(TM) Graphics)',
    wallpaper: {
      id: 'matrix-rain',
      label: 'MATRIX RAIN',
      mode: 'worker',
      zoom: 1.25,
      screenDpr: 2.5,
      drawnDpr: 2.5,
      safeDpr: 2,
      verdict: 'full',
      canvas: { w: 3840, h: 2160 },
      gaps: [16, 17, 16, 17],
      durations: [2, 2, 3, 2],
    },
    startup: { 'dashboard on screen': 431.6, 'wallpaper on screen': Number.NaN },
    layout: { palette: 'phosphor', wallpaperPalette: 'neon', glow: 'high', reduceMotion: false, links: 41, areas: 2, hidden: 3, modules: ['SEARCH', 'TIME'], panelsMoved: true, brandShown: false, switchPlaces: 1 },
    source: 'live (bridge 1.3.0)',
  };

  it('has every section, with the sharpness and the frames summed up', () => {
    const text = diagnosticsText(input, new Date(Date.UTC(2026, 9, 24, 13, 5)));
    expect(text.split('\n')[0]).toBe('=== cyberdeck_terminal DIAGNOSTICS ===');
    expect(text).toContain('cyberdeck_terminal 0.14.0 (build 22) · 2026-10-24 13:05 UTC');
    expect(text).toContain('screen 1536 × 864 CSS px at 2.5× (3840 × 2160 px) · window 1536 × 730');
    expect(text).toContain('sharpness: drawn at 2.5× (screen 2.5×, safe cap 2×) · guard kept (frames fast enough)');
    expect(text).toContain('MATRIX RAIN · in the worker · zoom 125%');
    expect(text).toContain('frames: 60.6 a second');
    expect(text).toContain('dashboard on screen 432 · wallpaper on screen n/a');
    expect(text).toContain('modules: SEARCH, TIME · brand panel off · panels moved');
    expect(text.endsWith('=== END ===')).toBe(true);
  });

  it('never carries an address', () => {
    expect(diagnosticsText(input, new Date())).not.toMatch(/https?:|www\.|\.com\b/);
  });
});
