/**
 * src/lib/screen.ts: how big the wallpaper's canvas is, in CSS px.
 *
 * Layer: pure lib (the wallpaper host passes the browser's numbers in;
 * tested).
 *
 * The canvas is the screen's size (or the window's, where that's bigger),
 * not the window's: resizing the window or going fullscreen then never
 * touches it. But Chrome gives the screen's size unzoomed, while the page
 * is laid out in zoomed CSS px. At 175% browser zoom the canvas came out
 * 1.75 times the window, and only its top left showed: HORIZON's glow sat
 * off to the right and its hills fell off the bottom (the user, 2026-10-26).
 * So the screen is measured at the page's zoom: the window's outer width
 * (unzoomed) over its inner width (zoomed) is the zoom.
 */

/** The browser's figures the size comes from (CSS px, except `outerWidth`: unzoomed). */
export interface ScreenFigures {
  screenW: number;
  screenH: number;
  innerW: number;
  innerH: number;
  outerW: number;
}

/** Below this, outer over inner is the window's own frame and side panels, not a zoom. */
const ZOOM_FLOOR = 1.08;

/** The page's zoom (1 at 100%), from the window's outer and inner widths. */
export function pageZoom(f: Pick<ScreenFigures, 'innerW' | 'outerW'>): number {
  if (!(f.innerW > 0) || !(f.outerW > 0)) return 1;
  const z = f.outerW / f.innerW;
  return z >= ZOOM_FLOOR ? z : 1;
}

/** The canvas's size (CSS px): the screen at the page's zoom, or the window where that's bigger. */
export function canvasSize(f: ScreenFigures): { w: number; h: number } {
  const z = pageZoom(f);
  return { w: Math.max(Math.round(f.screenW / z), f.innerW), h: Math.max(Math.round(f.screenH / z), f.innerH) };
}
