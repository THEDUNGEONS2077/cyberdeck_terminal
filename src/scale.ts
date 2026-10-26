/**
 * src/scale.ts: puts the dashboard's sizes on the page: UI SCALE, TEXT SIZE,
 * MODULE SIZE, and cancelling Chrome's zoom (lib/scale.ts says why).
 *
 * Layer: entry point helper (DOM, no React, no stores), as palette.ts: used
 * by main.tsx at the very start and by the app when the layout's sizes
 * change. It sets three variables on <html>, and app.css does the rest:
 *   --ui-zoom      the CSS zoom of #root (everything but the wallpaper);
 *   --text-scale   theme.css's text sizes;
 *   --module-scale the modules' --m.
 * Chrome's zoom is worked out again whenever it may have changed (a zoom
 * resizes the page), so the UI keeps its size as you zoom for quest_log.
 *
 * The sizes to start with are remembered in localStorage (a hint only, like
 * the palette's): the layout is read later, from IndexedDB, and without it
 * the UI would draw at 100% first and then jump.
 */
import type { LayoutPrefs } from '@/lib/layout';
import { DEFAULT_MODULE_SCALE, DEFAULT_TEXT_SCALE, DEFAULT_UI_SCALE, MODULE_SCALE_STEPS, TEXT_SCALE_STEPS, UI_SCALE_STEPS, browserZoom, nearestStep, uiZoom } from '@/lib/scale';

/** The sizes, as the layout keeps them. */
export type Sizes = Pick<LayoutPrefs, 'uiScale' | 'textScale' | 'moduleScale' | 'cancelBrowserZoom'>;

/** The localStorage key of the start-up hint: this app's own prefix (quest_log_desktop shares the origin). */
const HINT_KEY = 'cyberdeck_terminal:sizes';

/** The usual sizes. */
const DEFAULTS: Sizes = { uiScale: DEFAULT_UI_SCALE, textScale: DEFAULT_TEXT_SCALE, moduleScale: DEFAULT_MODULE_SCALE, cancelBrowserZoom: true };

/** The sizes the last visit chose (or the usual ones), each checked as the layout's are. */
export function sizesHint(): Sizes {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(HINT_KEY) ?? 'null');
    if (!raw || typeof raw !== 'object') return DEFAULTS;
    const r = raw as Record<string, unknown>;
    return {
      uiScale: nearestStep(UI_SCALE_STEPS, r.uiScale, DEFAULT_UI_SCALE),
      textScale: nearestStep(TEXT_SCALE_STEPS, r.textScale, DEFAULT_TEXT_SCALE),
      moduleScale: nearestStep(MODULE_SCALE_STEPS, r.moduleScale, DEFAULT_MODULE_SCALE),
      cancelBrowserZoom: typeof r.cancelBrowserZoom === 'boolean' ? r.cancelBrowserZoom : true,
    };
  } catch {
    return DEFAULTS;
  }
}

/** The sizes on the page now, Chrome's zoom as last worked out, and the zoom #root is drawn at. */
let current: Sizes = DEFAULTS;
let browser = 1;
let zoom = 1;
/** Who's told when Chrome's zoom (and so the UI's) changes: SYSTEM's readout. */
const listeners = new Set<() => void>();
let watching = false;

/** Works the zooms out again and sets the variables; tells the listeners if Chrome's zoom changed. */
function update(): void {
  const was = browser;
  browser = browserZoom({ outerWidth: window.outerWidth, innerWidth: window.innerWidth, dpr: window.devicePixelRatio || 1 });
  zoom = uiZoom(current.uiScale, browser, current.cancelBrowserZoom);
  const root = document.documentElement.style;
  root.setProperty('--ui-zoom', String(zoom));
  root.setProperty('--text-scale', String(current.textScale));
  root.setProperty('--module-scale', String(current.moduleScale));
  if (browser !== was) for (const listener of listeners) listener();
}

/** Puts `sizes` on the page and remembers them for the next start. */
export function applySizes(sizes: Sizes): void {
  current = { uiScale: sizes.uiScale, textScale: sizes.textScale, moduleScale: sizes.moduleScale, cancelBrowserZoom: sizes.cancelBrowserZoom };
  update();
  // A zoom resizes the page (in CSS px), so a resize is when to look again.
  if (!watching) {
    watching = true;
    window.addEventListener('resize', update);
  }
  try {
    localStorage.setItem(HINT_KEY, JSON.stringify(current));
  } catch {
    // Storage blocked: the next start draws at 100% first, then switches once the layout loads.
  }
}

/** The CSS zoom #root is drawn at: what turns a screen box (getBoundingClientRect, the pointer) into the UI's own px. */
export function uiZoomNow(): number {
  return zoom;
}

/** The zoom Chrome is at, as last worked out. */
export function browserZoomNow(): number {
  return browser;
}

/** Calls `listener` whenever Chrome's zoom changes; returns the unsubscribe (for useSyncExternalStore). */
export function onBrowserZoom(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
