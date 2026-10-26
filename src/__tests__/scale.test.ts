/**
 * src/__tests__/scale.test.ts: the dashboard's sizes (lib/scale.ts): the
 * steps, Chrome's zoom as worked out from the window (at 100% and 150%
 * display scales, with a side panel open, in fullscreen), the zoom the UI
 * is drawn at, and the layout keeping the sizes (older layouts get the
 * usual ones; anything odd is snapped to a step). The page side (zoomed
 * #root, menus and drags in the UI's own px) is checked in e2e/walk.mjs.
 */
import { describe, expect, it } from 'vitest';

import { defaultLayout, summarizeLayout } from '@/lib/layout';
import { diagnosticsText, type DiagnosticsInput } from '@/lib/diagnostics';
import { migrateLayout } from '@/lib/migrations';
import { MODULE_SCALE } from '@/lib/modules';
import { DEFAULT_MODULE_SCALE, MODULE_SCALE_STEPS, TEXT_SCALE_STEPS, UI_SCALE_STEPS, browserZoom, nearestStep, percentLabel, stepOf, uiZoom } from '@/lib/scale';

describe('sizes', () => {
  it('steps through each size’s steps, stopping at the ends, and snaps odd values', () => {
    expect(stepOf(UI_SCALE_STEPS, 1, 1, 1)).toBe(1.1);
    expect(stepOf(UI_SCALE_STEPS, 1, -1, 1)).toBe(0.9);
    expect(stepOf(UI_SCALE_STEPS, 3, 1, 1)).toBe(3);
    expect(stepOf(UI_SCALE_STEPS, 0.5, -1, 1)).toBe(0.5);
    expect(nearestStep(UI_SCALE_STEPS, 1.3, 1)).toBe(1.25);
    expect(nearestStep(UI_SCALE_STEPS, 'big', 1)).toBe(1);
    expect(nearestStep(TEXT_SCALE_STEPS, Number.NaN, 1)).toBe(1);
    expect(percentLabel(0.67)).toBe('67%');
    // The modules' usual size is the 70% they've had since 0.13.0, and it's one of the steps.
    expect(DEFAULT_MODULE_SCALE).toBe(MODULE_SCALE);
    expect(MODULE_SCALE_STEPS).toContain(DEFAULT_MODULE_SCALE);
  });

  it('works out Chrome’s zoom on a 100% display: from the window, a side panel open or not', () => {
    // 1920 px window at 175%: the page is 1097 CSS px wide.
    expect(browserZoom({ outerWidth: 1920, innerWidth: 1097, dpr: 1.75 })).toBe(1.75);
    expect(browserZoom({ outerWidth: 1920, innerWidth: 1920, dpr: 1 })).toBe(1);
    expect(browserZoom({ outerWidth: 1920, innerWidth: 2400, dpr: 0.8 })).toBe(0.8);
    // A 360 px side panel makes the page narrower: still the right zoom.
    expect(browserZoom({ outerWidth: 1920, innerWidth: 1560, dpr: 1 })).toBe(1);
    expect(browserZoom({ outerWidth: 1920, innerWidth: (1920 - 360) / 1.75, dpr: 1.75 })).toBe(1.75);
    // Windows' invisible borders (outer a few px wider) don't matter.
    expect(browserZoom({ outerWidth: 1936, innerWidth: 1920, dpr: 1 })).toBe(1);
  });

  it('tells a 150% display at 100% zoom from a 100% display at 150% zoom', () => {
    expect(browserZoom({ outerWidth: 1280, innerWidth: 1280, dpr: 1.5 })).toBe(1);
    expect(browserZoom({ outerWidth: 1920, innerWidth: 1280, dpr: 1.5 })).toBe(1.5);
    // 125% on a 150% display (pixel ratio 1.875), and 200% on a 125% one (2.5).
    expect(browserZoom({ outerWidth: 1280, innerWidth: 1024, dpr: 1.875 })).toBe(1.25);
    expect(browserZoom({ outerWidth: 1536, innerWidth: 768, dpr: 2.5 })).toBe(2);
    // A pixel ratio with float noise.
    expect(browserZoom({ outerWidth: 1920, innerWidth: 1097, dpr: 1.7500000238 })).toBe(1.75);
  });

  it('falls back to the rough reading for an odd display scale, and to 100% without figures', () => {
    expect(browserZoom({ outerWidth: 1920, innerWidth: 1280, dpr: 1.63 })).toBe(1.5);
    expect(browserZoom({ outerWidth: 0, innerWidth: 0, dpr: 1 })).toBe(1);
  });

  it('draws the UI at UI SCALE ÷ Chrome’s zoom when that’s cancelled, at UI SCALE times it otherwise', () => {
    expect(uiZoom(1.75, 1.75, true)).toBe(1);
    expect(uiZoom(1.5, 1, true)).toBe(1.5);
    expect(uiZoom(1.25, 2, true)).toBe(0.625);
    // APPLY: Chrome zooms the page itself, so the UI's own zoom is just UI SCALE.
    expect(uiZoom(1.25, 2, false)).toBe(1.25);
  });

  it('keeps the sizes in the layout: the usual ones for an older layout, odd values snapped', () => {
    const old = migrateLayout({ ...defaultLayout(), prefs: { backupReminderDays: 14 } }).doc.prefs;
    expect([old.uiScale, old.textScale, old.moduleScale, old.cancelBrowserZoom]).toEqual([1, 1, MODULE_SCALE, true]);
    const odd = migrateLayout({ ...defaultLayout(), prefs: { uiScale: 1.3, textScale: 9, moduleScale: 'x', cancelBrowserZoom: 'yes' } }).doc.prefs;
    expect([odd.uiScale, odd.textScale, odd.moduleScale, odd.cancelBrowserZoom]).toEqual([1.25, 1.5, MODULE_SCALE, true]);
    const kept = migrateLayout({ ...defaultLayout(), prefs: { uiScale: 1.75, textScale: 1.2, moduleScale: 1, cancelBrowserZoom: false } }).doc.prefs;
    expect([kept.uiScale, kept.textScale, kept.moduleScale, kept.cancelBrowserZoom]).toEqual([1.75, 1.2, 1, false]);
    // Chosen sizes show in a snapshot's summary.
    expect(summarizeLayout({ ...defaultLayout(), prefs: kept })).toContain('UI 175% · TEXT 120% · MODULES 100%');
  });

  it('reports the sizes in COPY DIAGNOSTICS', () => {
    const input: DiagnosticsInput = {
      app: { version: '0.17.0', build: 27 },
      browser: 'Chrome',
      screen: { w: 1920, h: 1080, dpr: 1.75, windowW: 1097, windowH: 560 },
      gpu: '',
      sizes: { ui: 1.5, text: 1, modules: 0.7, browserZoom: 1.75, cancelled: true, outerW: 1920, drawnAt: 1.5 / 1.75 },
      wallpaper: null,
      startup: {},
      layout: { palette: 'phosphor', wallpaperPalette: 'phosphor', glow: 'high', reduceMotion: false, links: 0, areas: 0, placed: 0, modules: [] },
    } as unknown as DiagnosticsInput;
    expect(diagnosticsText(input, new Date(0))).toContain('sizes: UI 150% · text 100% · modules 70% · Chrome at 175% (cancelled; outer width 1920) · UI drawn at 0.857×');
  });
});
