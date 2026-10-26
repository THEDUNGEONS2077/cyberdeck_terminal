/**
 * src/__tests__/screen.test.ts: the wallpaper canvas's size (lib/screen.ts):
 * the screen at the page's browser zoom, so at 175% the wallpaper still
 * fits the window (it used to come out 1.75 times too big, its middle off
 * to the right and its bottom off the screen).
 */
import { describe, expect, it } from 'vitest';

import { canvasSize, pageZoom } from '@/lib/screen';

describe('the wallpaper canvas’s size', () => {
  it('is the screen’s at 100% (a maximised window is a little smaller)', () => {
    expect(canvasSize({ screenW: 1920, screenH: 1080, innerW: 1920, innerH: 960, outerW: 1936 })).toEqual({ w: 1920, h: 1080 });
    // Fullscreen: the window is the screen.
    expect(canvasSize({ screenW: 1920, screenH: 1080, innerW: 1920, innerH: 1080, outerW: 1920 })).toEqual({ w: 1920, h: 1080 });
  });

  it('is the screen at the page’s zoom: at 175%, 1.75 times fewer CSS px', () => {
    expect(pageZoom({ innerW: 1097, outerW: 1920 })).toBeCloseTo(1.75, 2);
    expect(canvasSize({ screenW: 1920, screenH: 1080, innerW: 1097, innerH: 617, outerW: 1920 })).toEqual({ w: 1097, h: 617 });
    // Zoomed and windowed: the screen at that zoom, bigger than the window.
    expect(canvasSize({ screenW: 1920, screenH: 1080, innerW: 1097, innerH: 540, outerW: 1936 })).toEqual({ w: 1097, h: 612 });
  });

  it('takes a window’s frame or side panel for what it is, not a zoom', () => {
    expect(pageZoom({ innerW: 1800, outerW: 1920 })).toBe(1);
    expect(pageZoom({ innerW: 0, outerW: 1920 })).toBe(1);
  });

  it('is never smaller than the window (zoomed out, or across two screens)', () => {
    expect(canvasSize({ screenW: 1920, screenH: 1080, innerW: 2400, innerH: 1350, outerW: 1920 })).toEqual({ w: 2400, h: 1350 });
  });
});
