/**
 * src/wallpaper/host.ts: runs the wallpaper on the page's one canvas,
 * from the first moment of loading.
 *
 * Layer: wallpaper (DOM + canvas; no React, no stores). The canvas and its
 * light layers are plain HTML in index.html, and main.tsx starts the
 * wallpaper here before anything else loads (storage, React, the app), so
 * the rain begins as early as possible. React only tells the host when the
 * chosen wallpaper changes (app/App.tsx → showWallpaper).
 *
 * The host:
 *   - creates the chosen wallpaper (registry.ts), and swaps it on a fresh
 *     canvas when the choice changes (a canvas can't change context kinds);
 *   - passes on size and pixel-ratio changes, debounced (150 ms) so a
 *     window being dragged doesn't resize the canvas every frame, but at
 *     once when fullscreen starts or ends (one jump, no dragging);
 *   - marks the canvas `data-ready` once its first full frame is drawn
 *     (app.css fades it in);
 *   - stops the animation while the page is hidden (another tab in front);
 *   - follows Reduce Motion: a still frame instead of animation.
 *
 * Which wallpaper to start with is remembered in localStorage (a hint
 * only, written by the app whenever the layout's choice changes), because
 * the layout itself is read later, from IndexedDB.
 */
import { DEFAULT_WALLPAPER_ID } from '@/lib/layout';

import { findWallpaper } from './registry';
import type { WallpaperInstance, WallpaperPalette } from './types';

/** Waits this long after the last resize before telling the wallpaper. */
const RESIZE_DEBOUNCE_MS = 150;

/** The localStorage key of the start-up hint: this app's own prefix (quest_log_desktop shares the origin). */
const HINT_KEY = 'cyberdeck_terminal:wallpaper';

/** The running wallpaper. */
let current: { id: string; canvas: HTMLCanvasElement; instance: WallpaperInstance } | null = null;

/** The wallpaper palette, read from theme.css's tokens (so the canvas uses the same colours as the UI). */
function readPalette(): WallpaperPalette {
  const css = getComputedStyle(document.documentElement);
  const token = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return {
    bg: token('--bg', '#000000'),
    line: token('--line', '#12301a'),
    dim: token('--text-dim', '#2b903f'),
    text: token('--text', '#2fb344'),
    accent: token('--accent', '#39ff14'),
    bright: token('--text-bright', '#b6ffb0'),
  };
}

const motion = matchMedia('(prefers-reduced-motion: reduce)');

/** Is Reduce Motion on (the OS setting, unless the page overrides it with data-reduce-motion)? */
function reduceMotion(): boolean {
  const own = document.documentElement.dataset.reduceMotion;
  if (own === 'on') return true;
  if (own === 'off') return false;
  return motion.matches;
}

/** Tells the running wallpaper the window's size now. */
function measure(): void {
  current?.instance.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
}

/** The wallpaper the last visit chose (or the default). */
export function wallpaperHint(): string {
  try {
    return localStorage.getItem(HINT_KEY) || DEFAULT_WALLPAPER_ID;
  } catch {
    return DEFAULT_WALLPAPER_ID;
  }
}

/** Remembers the chosen wallpaper for the next start (best effort). */
function saveHint(id: string): void {
  try {
    localStorage.setItem(HINT_KEY, id);
  } catch {
    // Storage blocked: the next start uses the default, then switches once the layout loads.
  }
}

/**
 * Shows wallpaper `id`, starting it if nothing runs yet, or swapping to it.
 * Called by main.tsx at the very start, and by the app when the layout's
 * choice is known or changes. Does nothing if `id` is already showing.
 */
export function showWallpaper(id: string): void {
  saveHint(id);
  const wallpaper = findWallpaper(id);
  if (current?.id === wallpaper.id) return;
  // A fresh canvas for each wallpaper: one that drew 2D can't be handed to another kind.
  const old = document.getElementById('wallpaper-canvas') as HTMLCanvasElement | null;
  if (!old) return;
  const canvas = current ? (old.cloneNode(false) as HTMLCanvasElement) : old;
  if (current) {
    delete canvas.dataset.ready;
    current.instance.destroy();
    old.replaceWith(canvas);
  }
  const instance = wallpaper.create(canvas, {
    palette: readPalette(),
    still: reduceMotion(),
    onReady: () => (canvas.dataset.ready = ''),
  });
  current = { id: wallpaper.id, canvas, instance };
  measure();
  if (!document.hidden) instance.start();
}

// The window's events, installed once for whichever wallpaper is running.
let resizeTimer: ReturnType<typeof setTimeout> | undefined;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(measure, RESIZE_DEBOUNCE_MS);
});
// Entering or leaving fullscreen is one jump in size: apply it at once.
document.addEventListener('fullscreenchange', () => {
  clearTimeout(resizeTimer);
  requestAnimationFrame(measure);
});
// Run only while the page can be seen.
document.addEventListener('visibilitychange', () => (document.hidden ? current?.instance.stop() : current?.instance.start()));
motion.addEventListener('change', () => current?.instance.setStill(reduceMotion()));
