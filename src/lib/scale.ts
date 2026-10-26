/**
 * src/lib/scale.ts: the dashboard's own size: UI SCALE (everything), TEXT
 * SIZE (the text alone), MODULE SIZE (the modules against the rest), and
 * cancelling Chrome's zoom (user request, 2026-10-26).
 *
 * Layer: pure (no DOM; the page's figures are passed in, so tests check it).
 *
 * Why cancel the browser's zoom: Chrome keeps one zoom per site, and
 * quest_log_desktop is served from the same site, so zooming one zooms the
 * other, and a page can't set or refuse Chrome's zoom. So the dashboard
 * works out the zoom Chrome is at and draws its UI at UI SCALE ÷ that zoom:
 * whatever zoom the browser is at, the dashboard looks the size you chose.
 * UI SCALE doesn't size the wallpaper (it sizes itself: wallpaper/host.ts),
 * but cancelling Chrome's zoom applies to it too (0.17.1, the user: the
 * wallpapers should ignore Chrome's zoom as well): it draws as at 100%.
 */
import { MODULE_SCALE } from './modules';

/** UI SCALE's steps (shares of the usual size): small enough for a big screen far away, big enough for a laptop across the room. */
export const UI_SCALE_STEPS: readonly number[] = [0.5, 0.6, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 3];
/** TEXT SIZE's steps: the text on top of UI SCALE (theme.css --text-scale). */
export const TEXT_SCALE_STEPS: readonly number[] = [0.8, 0.9, 1, 1.1, 1.2, 1.35, 1.5];
/** MODULE SIZE's steps: how big the modules are drawn against NAV and the panels (70% unless chosen: 0.13.0). */
export const MODULE_SCALE_STEPS: readonly number[] = [0.5, 0.6, 0.7, 0.8, 0.9, 1];

/** The sizes until chosen. */
export const DEFAULT_UI_SCALE = 1;
export const DEFAULT_TEXT_SCALE = 1;
export const DEFAULT_MODULE_SCALE = MODULE_SCALE;

/** The step of `steps` nearest `value` (`fallback` for a value that isn't a number). */
export function nearestStep(steps: readonly number[], value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return steps.reduce((best, step) => (Math.abs(step - value) < Math.abs(best - value) ? step : best), fallback);
}

/** The next step of `steps` up (`direction` 1) or down (-1) from `value`; at either end, the end. */
export function stepOf(steps: readonly number[], value: number, direction: 1 | -1, fallback: number): number {
  const at = steps.indexOf(nearestStep(steps, value, fallback));
  return steps[Math.min(steps.length - 1, Math.max(0, at + direction))] ?? fallback;
}

/** A share as SYSTEM shows it: `125%`. */
export function percentLabel(share: number): string {
  return `${Math.round(share * 100)}%`;
}

/** Chrome's zoom levels (Ctrl + / Ctrl −, and its settings' list). */
export const BROWSER_ZOOM_LEVELS: readonly number[] = [0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5];
/** Display scales an OS sets (Windows' 100–400%, in its steps; odd custom ones fall back to the rough reading). */
const OS_SCALES: readonly number[] = [1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.5, 4];

/** The window's figures the browser's zoom is worked out from. */
export interface WindowFigures {
  /** The window's outer width (screen px: Chrome doesn't zoom it) and its page's width (CSS px: zoomed). */
  outerWidth: number;
  innerWidth: number;
  /** CSS px to device px: the OS's display scale times the browser's zoom. */
  dpr: number;
}

/**
 * The zoom Chrome is at. A page isn't told it, so it's worked out from two
 * figures that each hold it:
 *   - outer width ÷ page width is the zoom, but only roughly: an open side
 *     panel (or the window's borders) makes the page narrower, reading high;
 *   - the pixel ratio is exactly zoom × the OS's display scale, but which
 *     share is which can't be told from it alone (150% could be either).
 * So: of the zoom levels that, times some OS scale, make the pixel ratio,
 * the biggest the rough reading allows (a side panel only ever reads high).
 * Without a match (an odd OS scale), the level nearest the rough reading.
 */
export function browserZoom({ outerWidth, innerWidth, dpr }: WindowFigures): number {
  if (!(outerWidth > 0) || !(innerWidth > 0)) return 1;
  const rough = outerWidth / innerWidth;
  const ratio = Number.isFinite(dpr) && dpr > 0 ? dpr : 1;
  const fits = BROWSER_ZOOM_LEVELS.filter((level) => OS_SCALES.some((os) => Math.abs(level * os - ratio) <= ratio * 0.012));
  const allowed = fits.filter((level) => level <= rough * 1.03);
  if (allowed.length) return allowed[allowed.length - 1]!;
  if (fits.length) return fits[0]!;
  return nearestStep(BROWSER_ZOOM_LEVELS, rough, 1);
}

/** The CSS zoom the UI is drawn at: UI SCALE, divided by the browser's zoom when that's cancelled. */
export function uiZoom(uiScale: number, browser: number, cancelBrowserZoom: boolean): number {
  return cancelBrowserZoom && browser > 0 ? uiScale / browser : uiScale;
}
