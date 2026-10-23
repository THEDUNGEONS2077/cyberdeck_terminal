/**
 * src/wallpaper/host.ts: runs the wallpaper on the page's one canvas,
 * from the first moment of loading.
 *
 * Layer: wallpaper (DOM + canvas; no React, no stores). The canvas and its
 * light layers are plain HTML in index.html, and main.tsx starts the
 * wallpaper here before anything else loads (storage, React, the app), so
 * the rain begins as early as possible. React only tells the host when the
 * chosen wallpaper or its glow changes (app/App.tsx).
 *
 * Where the wallpaper runs (optimization pass 2, 2026-10-22): in a worker
 * of its own (worker.ts), drawing on the canvas through an OffscreenCanvas.
 * Its fonts, sprite sheets, pre-warm and frames all happen off the page's
 * main thread, so the dashboard starts while the rain is still filling,
 * and a frame of rain no longer costs the page a frame of work (drawn on
 * the page, every frame re-ran the page's paint steps, more with every
 * bookmark on it). If a worker can't start, or fails, the same wallpaper
 * runs on the page instead, on a fresh canvas.
 *
 * The host:
 *   - creates the chosen wallpaper (registry.ts), and swaps it on a fresh
 *     canvas when the choice changes (a canvas handed to a worker, or one
 *     that drew 2D, can't be handed to another wallpaper);
 *   - sizes the canvas to the screen (or the window, where that's bigger),
 *     not to the window: resizing the window or going fullscreen doesn't
 *     touch it, the window just shows more or less of it. Only a new
 *     screen size, zoom or pixel ratio resizes it (debounced 150 ms);
 *   - marks the canvas `data-ready` once its first full frame is drawn
 *     (app.css fades it in);
 *   - stops the animation while the page is hidden (another tab in front);
 *   - follows Reduce Motion: a still frame instead of animation;
 *   - copies the wallpaper's performance measures into the page's
 *     timeline, and gives the browser tests a probe (window.__cyberdeckRain).
 *
 * Which wallpaper to start with, its palette and how strongly it glows, are
 * remembered in localStorage (hints only, written by the app whenever the
 * layout's choices change), because the layout itself is read later, from
 * IndexedDB.
 */
import fontUrl from '@/assets/fonts/JetBrainsMono-Regular.woff2?url';
import { DEFAULT_RAIN_GLOW, DEFAULT_WALLPAPER_ID, GLOW_LEVELS, type GlowLevel } from '@/lib/layout';
import { DEFAULT_PALETTE, findPalette, PALETTE_TOKENS, type PaletteColors, type PaletteId } from '@/lib/palettes';

import { knownWallpaperId } from './catalog';
import { measurePixels } from './probe';
import type { WallpaperInstance, WallpaperPalette } from './types';
import type { FramesProbe, FromWorker, PixelsProbe, ToWorker } from './worker';
// The worker's code, inlined into this chunk (it starts from a Blob URL): no extra request
// before the rain can start, on a first visit (a network round trip) or from the service worker.
import WallpaperWorker from './worker.ts?worker&inline';

/** Waits this long after the last resize before resizing the canvas. */
const RESIZE_DEBOUNCE_MS = 150;

/** The localStorage keys of the start-up hints: this app's own prefix (quest_log_desktop shares the origin). */
const HINT_KEY = 'cyberdeck_terminal:wallpaper';
const GLOW_KEY = 'cyberdeck_terminal:glow';
const COLORS_KEY = 'cyberdeck_terminal:wallpaper-palette';

/** A canvas size: CSS px, and the device pixel ratio. */
interface Size {
  w: number;
  h: number;
  dpr: number;
}

/** What the browser tests can ask the running wallpaper (e2e/walk.mjs, motion.mjs, perf.mjs). */
interface Probe {
  /** How much of the canvas is lit, and a fingerprint of it. */
  pixels(): Promise<PixelsProbe>;
  /** Frame gaps and drawing time over `ms` (drawing time only in a worker; NaN on the page). */
  frames(ms: number): Promise<FramesProbe>;
}

/** A wallpaper running on a canvas. */
interface Running {
  id: string;
  canvas: HTMLCanvasElement;
  instance: WallpaperInstance;
  probe: Probe;
  /** Where it runs. */
  mode: 'worker' | 'page';
}

/** The running wallpaper. */
let current: Running | null = null;
/** The canvas's size now. */
let size: Size | null = null;

/** Reads a start-up hint (null when there is none, or storage is blocked). */
function readHint(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Remembers a start-up hint (best effort: without it, the next start uses the default, then switches once the layout loads). */
function saveHint(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage blocked.
  }
}

/** The glow wallpapers are drawn with: the last visit's, until the layout says otherwise. */
let glow: GlowLevel = GLOW_LEVELS.find((g) => g === readHint(GLOW_KEY)) ?? DEFAULT_RAIN_GLOW;

/**
 * The wallpaper's own palette (lib/palettes.ts), chosen apart from the
 * dashboard's (user request, 2026-10-23): the last visit's, until the
 * layout says otherwise.
 */
let colors: PaletteId = findPalette(readHint(COLORS_KEY) ?? DEFAULT_PALETTE).id;

/** The wallpaper's colours, for the engine. */
function readPalette(): WallpaperPalette {
  const c = findPalette(colors).colors;
  return { bg: c.bg, line: c.line, dim: c.textDim, text: c.text, accent: c.accent, bright: c.textBright, cool: c.cool };
}

/**
 * Puts the wallpaper's palette on its own element: the base colour tokens,
 * set on `.wallpaper` itself, so its CSS light layers (background, haze,
 * floor) use the wallpaper's colours while the dashboard keeps its own.
 */
function paintLayers(): void {
  const layer = document.querySelector<HTMLElement>('.wallpaper');
  if (!layer) return;
  const palette = findPalette(colors);
  for (const [key, token] of Object.entries(PALETTE_TOKENS) as [keyof PaletteColors, string][]) layer.style.setProperty(token, palette.colors[key]);
}

const motion = matchMedia('(prefers-reduced-motion: reduce)');

/** Is Reduce Motion on (the OS setting, unless the page overrides it with data-reduce-motion)? */
function reduceMotion(): boolean {
  const own = document.documentElement.dataset.reduceMotion;
  if (own === 'on') return true;
  if (own === 'off') return false;
  return motion.matches;
}

/** The canvas's size: the screen's, or the window's where that's bigger (zoomed out, a window across two screens). */
function wantedSize(): Size {
  return { w: Math.max(screen.width, window.innerWidth), h: Math.max(screen.height, window.innerHeight), dpr: window.devicePixelRatio || 1 };
}

/** Sets the canvas's CSS size (the wallpaper sizes its pixels to match). */
function sizeCanvas(canvas: HTMLCanvasElement, s: Size): void {
  canvas.style.width = `${s.w}px`;
  canvas.style.height = `${s.h}px`;
}

/** Resizes the canvas if the screen, zoom or pixel ratio changed its size (most window resizes don't). */
function measure(): void {
  if (!current) return;
  const next = wantedSize();
  if (size && next.w === size.w && next.h === size.h && next.dpr === size.dpr) return;
  size = next;
  sizeCanvas(current.canvas, next);
  current.instance.resize(next.w, next.h, next.dpr);
}

/** Can a wallpaper run in a worker here? */
const workers = typeof Worker !== 'undefined' && 'transferControlToOffscreen' in HTMLCanvasElement.prototype;

/** Starts wallpaper `id` in a worker, drawing on `canvas`; `onFail` if the worker can't start or fails. */
function inWorker(id: string, canvas: HTMLCanvasElement, s: Size, onFail: () => void): Omit<Running, 'id' | 'canvas'> {
  const worker = new WallpaperWorker({ name: 'wallpaper' });
  const send = (m: ToWorker, transfer: Transferable[] = []) => worker.postMessage(m, transfer);
  // Probes waiting for their answers, by id.
  const waiting = new Map<number, (result: never) => void>();
  let asked = 0;
  const ask = <T>(make: (id: number) => ToWorker) =>
    new Promise<T>((resolve) => {
      waiting.set(++asked, resolve as (result: never) => void);
      send(make(asked));
    });

  worker.onmessage = ({ data: m }: MessageEvent<FromWorker>) => {
    if (m.type === 'ready') canvas.dataset.ready = '';
    // The worker's clock starts later than the page's: shift its times onto the page's timeline.
    else if (m.type === 'measure') performance.measure(m.name, { start: m.origin + m.start - performance.timeOrigin, duration: m.duration });
    else {
      waiting.get(m.id)?.(m.result as never);
      waiting.delete(m.id);
    }
  };
  worker.onerror = (e) => {
    e.preventDefault();
    worker.terminate();
    onFail();
  };

  const offscreen = canvas.transferControlToOffscreen();
  send(
    { type: 'init', id, canvas: offscreen, fontUrl: new URL(fontUrl, document.baseURI).href, palette: readPalette(), glow, still: reduceMotion(), size: s },
    [offscreen],
  );
  return {
    mode: 'worker',
    instance: {
      resize: (w, h, dpr) => send({ type: 'resize', w, h, dpr }),
      start: () => send({ type: 'start' }),
      stop: () => send({ type: 'stop' }),
      setStill: (still) => send({ type: 'still', still }),
      setGlow: (level) => send({ type: 'glow', glow: level }),
      setPalette: (palette) => send({ type: 'palette', palette }),
      destroy: () => worker.terminate(),
    },
    probe: {
      pixels: () => ask<PixelsProbe>((pid) => ({ type: 'probe', id: pid, what: 'pixels' })),
      frames: (ms) => ask<FramesProbe>((pid) => ({ type: 'probe', id: pid, what: 'frames', ms })),
    },
  };
}

/**
 * Starts wallpaper `id` on the page itself, drawing on `canvas` (when a
 * worker can't). The engines are loaded only now (registry.ts): the page's
 * own scripts don't carry them. Calls made meanwhile wait, in order.
 */
function onPage(id: string, canvas: HTMLCanvasElement, s: Size): Omit<Running, 'id' | 'canvas'> {
  const loading = import('./registry').then(({ findWallpaper }) => {
    const engine = findWallpaper(id).create(canvas, { palette: readPalette(), glow, still: reduceMotion(), onReady: () => (canvas.dataset.ready = '') });
    engine.resize(s.w, s.h, s.dpr);
    return engine;
  });
  const later = (call: (engine: WallpaperInstance) => void) => void loading.then(call);
  return {
    mode: 'page',
    instance: {
      resize: (w, h, dpr) => later((e) => e.resize(w, h, dpr)),
      start: () => later((e) => e.start()),
      stop: () => later((e) => e.stop()),
      setStill: (still) => later((e) => e.setStill(still)),
      setGlow: (level) => later((e) => e.setGlow(level)),
      setPalette: (palette) => later((e) => e.setPalette(palette)),
      destroy: () => later((e) => e.destroy()),
    },
    probe: {
      pixels: async () => measurePixels(canvas),
      frames: (ms) =>
        new Promise((resolve) => {
          const gaps: number[] = [];
          const end = performance.now() + ms;
          let prev = 0;
          const record = (t: number) => {
            if (prev) gaps.push(t - prev);
            prev = t;
            if (performance.now() < end) requestAnimationFrame(record);
            else resolve({ gaps, busy: NaN });
          };
          requestAnimationFrame(record);
        }),
    },
  };
}

/** Whether the canvas in index.html has been used yet. */
let used = false;

/** A canvas no wallpaper has used: the one in index.html at first, then a fresh copy in its place. */
function freshCanvas(): HTMLCanvasElement | null {
  const old = document.getElementById('wallpaper-canvas') as HTMLCanvasElement | null;
  if (!old || !used) {
    used = true;
    return old;
  }
  const canvas = old.cloneNode(false) as HTMLCanvasElement;
  delete canvas.dataset.ready;
  old.replaceWith(canvas);
  return canvas;
}

/** The wallpaper the last visit chose (or the default). */
export function wallpaperHint(): string {
  return readHint(HINT_KEY) || DEFAULT_WALLPAPER_ID;
}

/** Sets how strongly the wallpaper glows (the app, when the layout's choice is known or changes). */
export function setWallpaperGlow(level: GlowLevel): void {
  saveHint(GLOW_KEY, level);
  if (level === glow) return;
  glow = level;
  current?.instance.setGlow(level);
}

/** Sets the wallpaper's palette (the app, when the layout's choice is known or changes). */
export function setWallpaperColors(id: string): void {
  const next = findPalette(id).id;
  saveHint(COLORS_KEY, next);
  if (next === colors) return;
  colors = next;
  paintLayers();
  current?.instance.setPalette(readPalette());
}

/**
 * Shows wallpaper `id`, starting it if nothing runs yet, or swapping to it.
 * Called by main.tsx at the very start, and by the app when the layout's
 * choice is known or changes. Does nothing if `id` is already showing.
 */
export function showWallpaper(id: string): void {
  saveHint(HINT_KEY, id);
  const wallpaper = { id: knownWallpaperId(id) };
  if (current?.id === wallpaper.id) return;
  current?.instance.destroy();
  current = null;
  // Each wallpaper's own light layers (app.css .wallpaper[data-wallpaper]), in its palette.
  document.querySelector<HTMLElement>('.wallpaper')?.setAttribute('data-wallpaper', wallpaper.id);
  paintLayers();

  /** Runs the wallpaper on a fresh canvas, in a worker if it can. */
  const run = (worker: boolean) => {
    const canvas = freshCanvas();
    if (!canvas) return;
    size = wantedSize();
    sizeCanvas(canvas, size);
    // If the worker fails, the same wallpaper on the page (unless it was replaced meanwhile).
    const onFail = () => current?.canvas === canvas && run(false);
    current = { id: wallpaper.id, canvas, ...(worker ? inWorker(wallpaper.id, canvas, size, onFail) : onPage(wallpaper.id, canvas, size)) };
    if (!document.hidden) current.instance.start();
  };
  run(workers);
}

// For the browser tests (e2e/): ask the running wallpaper how it's doing.
(window as unknown as { __cyberdeckRain: object }).__cyberdeckRain = {
  pixels: () => current?.probe.pixels() ?? Promise.resolve({ lit: 0, sig: 0 }),
  frames: (ms: number) => current?.probe.frames(ms) ?? Promise.resolve({ gaps: [], busy: 0 }),
  mode: () => current?.mode ?? null,
};

// The window's events, installed once for whichever wallpaper is running.
let resizeTimer: ReturnType<typeof setTimeout> | undefined;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(measure, RESIZE_DEBOUNCE_MS);
});
// Fullscreen fits the screen-sized canvas already; check anyway (a window across two screens).
document.addEventListener('fullscreenchange', () => {
  clearTimeout(resizeTimer);
  requestAnimationFrame(measure);
});
// Run only while the page can be seen.
document.addEventListener('visibilitychange', () => (document.hidden ? current?.instance.stop() : current?.instance.start()));
motion.addEventListener('change', () => current?.instance.setStill(reduceMotion()));
