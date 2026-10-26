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
 *     screen size, zoom or pixel ratio resizes it (debounced 150 ms); with
 *     Chrome's zoom cancelled (src/scale.ts), sized as at 100%, so a
 *     wallpaper looks the same at any Chrome zoom;
 *   - marks the canvas `data-ready` once its first full frame is drawn
 *     (app.css fades it in);
 *   - stops the animation while the page is hidden (another tab in front);
 *   - follows Reduce Motion: a still frame instead of animation;
 *   - copies the wallpaper's performance measures into the page's
 *     timeline, and gives the browser tests a probe (window.__cyberdeckRain);
 *   - decides how sharp it's drawn (lib/sharpness.ts, 0.14.0): at the
 *     screen's own pixel ratio, unless the guard (watching its first
 *     seconds in the worker) found its frames too slow, then at its safe cap
 *     (catalog.ts). The verdicts are a start-up hint, per wallpaper;
 *   - answers SYSTEM's COPY DIAGNOSTICS (wallpaperReport).
 *
 * Which wallpaper to start with, its palette, how strongly it glows and
 * each wallpaper's zoom are remembered in localStorage (hints only, written
 * by the app whenever the layout's choices change), because the layout
 * itself is read later, from IndexedDB.
 */
import fontUrl from '@/assets/fonts/JetBrainsMono-Regular.woff2?url';
import { DEFAULT_RAIN_GLOW, DEFAULT_WALLPAPER_ID, GLOW_LEVELS, type GlowLevel, normalizeZooms, zoomOf } from '@/lib/layout';
import { DEFAULT_PALETTE, findPalette, PALETTE_TOKENS, type PaletteColors, type PaletteId } from '@/lib/palettes';

import { GUARD_BUDGET_MS, GUARD_SETTLE_MS, GUARD_WATCH_MS, type Sharpness, drawnDpr, guardVerdict, normalizeSharpness, wantsGuard } from '@/lib/sharpness';

import { cancelledZoomNow, onBrowserZoom } from '@/scale';

import { knownWallpaperId, safeDprOf } from './catalog';
import { measurePixels } from './probe';
import type { WallpaperInstance, WallpaperPalette } from './types';
import type { FramesProbe, FromWorker, PixelsProbe, StatsProbe, ToWorker } from './worker';
// The worker's code, inlined into this chunk (it starts from a Blob URL): no extra request
// before the rain can start, on a first visit (a network round trip) or from the service worker.
import WallpaperWorker from './worker.ts?worker&inline';

/** Waits this long after the last resize before resizing the canvas. */
const RESIZE_DEBOUNCE_MS = 150;

/** The localStorage keys of the start-up hints: this app's own prefix (quest_log_desktop shares the origin). */
const HINT_KEY = 'cyberdeck_terminal:wallpaper';
const GLOW_KEY = 'cyberdeck_terminal:glow';
const COLORS_KEY = 'cyberdeck_terminal:wallpaper-palette';
const ZOOM_KEY = 'cyberdeck_terminal:zoom';
/** The sharpness guard's verdicts, per wallpaper (lib/sharpness.ts). */
const SHARP_KEY = 'cyberdeck_terminal:sharp';
/** The browser tests' knob: the guard's budget (ms) instead of GUARD_BUDGET_MS (e2e/walk.mjs makes it 0 to see it step back). */
const BUDGET_KEY = 'cyberdeck_terminal:sharp-budget';

/** A canvas size: CSS px, and the device pixel ratio. */
interface Size {
  w: number;
  h: number;
  dpr: number;
  /** The Chrome zoom cancelled (src/scale.ts cancelledZoomNow; 1 when none): w, h and dpr are as at 100%, the canvas's CSS size is w ÷ this. */
  undo: number;
}

/** What the browser tests can ask the running wallpaper (e2e/walk.mjs, motion.mjs, perf.mjs). */
interface Probe {
  /** How much of the canvas is lit, and a fingerprint of it. */
  pixels(): Promise<PixelsProbe>;
  /** Frame gaps and drawing time over `ms` (drawing time only in a worker; NaN on the page). */
  frames(ms: number): Promise<FramesProbe>;
  /** The frames of the last `ms`, from the worker's ring, at once (null on the page: no ring there). */
  stats(ms: number): Promise<StatsProbe | null>;
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

/** Each wallpaper's zoom (lib/layout.ts): the last visit's, until the layout says otherwise. */
let zooms: Record<string, number> = readZooms();

/** The zooms hint (a JSON map, checked as the layout's own is). */
function readZooms(): Record<string, number> {
  try {
    return normalizeZooms(JSON.parse(readHint(ZOOM_KEY) ?? '{}'));
  } catch {
    return {};
  }
}

/** Wallpaper `id`'s zoom. */
const zoomFor = (id: string) => zoomOf(zooms, id);

/** The sharpness guard's verdicts (the last visits', kept as a hint). */
let sharp: Record<string, Sharpness> = readSharp();

/** The verdicts hint (a JSON map, checked). */
function readSharp(): Record<string, Sharpness> {
  try {
    return normalizeSharpness(JSON.parse(readHint(SHARP_KEY) ?? '{}'));
  } catch {
    return {};
  }
}

/** The pixel ratio wallpaper `id` draws at on a `dpr` screen: the screen's own, or its safe cap if the guard stepped back. */
const dprFor = (id: string, dpr: number) => drawnDpr(dpr, safeDprOf(id), sharp[id]);

/** Sends the running wallpaper its size again (the ratio in force changed). */
function resend(): void {
  if (current && size) current.instance.resize(size.w, size.h, dprFor(current.id, size.dpr), zoomFor(current.id));
}

/** The guard's pending watch, if any. */
let guardTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * The sharpness guard: after the first full frame has settled, watches the
 * running wallpaper's frames for a while (in its worker's ring), then
 * keeps it at full sharpness or steps it back to its safe cap, and
 * remembers which. Only when full sharpness draws more than the safe cap,
 * in a worker (on the page there's no ring: it stays at the safe cap), and
 * not already stepped back.
 */
function guard(run: Running): void {
  clearTimeout(guardTimer);
  if (run.mode !== 'worker' || !size || !wantsGuard(size.dpr, safeDprOf(run.id)) || sharp[run.id] === 'safe') return;
  const budget = Number(readHint(BUDGET_KEY) ?? Number.NaN);
  guardTimer = setTimeout(() => {
    void run.probe.stats(GUARD_WATCH_MS).then((s) => {
      if (current !== run || !s) return;
      const verdict = guardVerdict(s.durations, Number.isFinite(budget) ? budget : GUARD_BUDGET_MS);
      // Too few frames (hidden, still): no verdict; it watches again next time.
      if (!verdict) return;
      sharp = { ...sharp, [run.id]: verdict };
      saveHint(SHARP_KEY, JSON.stringify(sharp));
      if (verdict === 'safe') resend();
    });
  }, GUARD_SETTLE_MS + GUARD_WATCH_MS);
}

/** Forgets every verdict and watches the running wallpaper again at full sharpness (SYSTEM ▸ SHARPNESS ▸ TRY AGAIN). */
export function retrySharpness(): void {
  sharp = {};
  saveHint(SHARP_KEY, '{}');
  resend();
  if (current) guard(current);
}

/** What the running wallpaper draws at, for SYSTEM: its safe cap, the ratio in force, and the guard's verdict (none yet: null). */
export function sharpnessInfo(): { id: string; screenDpr: number; drawnDpr: number; safeDpr: number; verdict: Sharpness | null } | null {
  if (!current || !size) return null;
  const safe = safeDprOf(current.id);
  // On the page it's held at the safe cap (onPage).
  const drawn = current.mode === 'page' ? Math.min(Math.max(1, size.dpr), safe) : dprFor(current.id, size.dpr);
  return { id: current.id, screenDpr: size.dpr, drawnDpr: drawn, safeDpr: safe, verdict: sharp[current.id] ?? null };
}

/** The running wallpaper's figures for COPY DIAGNOSTICS: where it runs, its sharpness, its canvas and its last few seconds of frames. */
export async function wallpaperReport(ms = 3000): Promise<{
  id: string;
  mode: 'worker' | 'page';
  zoom: number;
  sharpness: NonNullable<ReturnType<typeof sharpnessInfo>>;
  stats: StatsProbe | null;
} | null> {
  const run = current;
  const info = sharpnessInfo();
  if (!run || !info) return null;
  return { id: run.id, mode: run.mode, zoom: zoomFor(run.id), sharpness: info, stats: await run.probe.stats(ms) };
}

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

/**
 * The canvas's size: the screen's, or the window's where that's bigger
 * (zoomed out, a window across two screens). With Chrome's zoom cancelled
 * (SYSTEM ▸ CHROME ZOOM ▸ IGNORE, 0.17.1) it's worked out as at 100%: the
 * window's CSS px times the zoom (Chrome's screen size doesn't follow its
 * zoom), the pixel ratio divided by it, so every wallpaper looks the same at
 * any Chrome zoom, and only SYSTEM ▸ ZOOM zooms it.
 */
function wantedSize(): Size {
  const undo = cancelledZoomNow();
  return {
    w: Math.round(Math.max(screen.width, window.innerWidth * undo)),
    h: Math.round(Math.max(screen.height, window.innerHeight * undo)),
    dpr: (window.devicePixelRatio || 1) / undo,
    undo,
  };
}

/** Sets the canvas's CSS size, in the page's (zoomed) CSS px (the wallpaper sizes its pixels to match). */
function sizeCanvas(canvas: HTMLCanvasElement, s: Size): void {
  canvas.style.width = `${s.w / s.undo}px`;
  canvas.style.height = `${s.h / s.undo}px`;
}

/** Resizes the canvas if the screen, zoom or pixel ratio changed its size (most window resizes don't). */
function measure(): void {
  if (!current) return;
  const next = wantedSize();
  if (size && next.w === size.w && next.h === size.h && next.dpr === size.dpr && next.undo === size.undo) return;
  size = next;
  sizeCanvas(current.canvas, next);
  current.instance.resize(next.w, next.h, dprFor(current.id, next.dpr), zoomFor(current.id));
  // A new screen (another ratio): the guard watches again.
  guard(current);
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
    if (m.type === 'ready') {
      canvas.dataset.ready = '';
      performance.mark('wallpaper:ready');
      // The first full frame is on screen: the sharpness guard can start watching.
      if (current?.canvas === canvas) guard(current);
    }
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
    { type: 'init', id, canvas: offscreen, fontUrl: new URL(fontUrl, document.baseURI).href, palette: readPalette(), glow, still: reduceMotion(), size: { ...s, dpr: dprFor(id, s.dpr) }, zoom: zoomFor(id) },
    [offscreen],
  );
  return {
    mode: 'worker',
    instance: {
      resize: (w, h, dpr, zoom) => send({ type: 'resize', w, h, dpr, zoom }),
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
      stats: (ms) => ask<StatsProbe>((pid) => ({ type: 'probe', id: pid, what: 'stats', ms })),
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
    // On the page there's no guard (no frame ring): the safe cap, as before 0.14.0.
    engine.resize(s.w, s.h, Math.min(Math.max(1, s.dpr), safeDprOf(id)), zoomFor(id));
    return engine;
  });
  const later = (call: (engine: WallpaperInstance) => void) => void loading.then(call);
  return {
    mode: 'page',
    instance: {
      // On the page, never above the safe cap (no guard watches there).
      resize: (w, h, dpr, zoom) => later((e) => e.resize(w, h, Math.min(dpr, safeDprOf(id)), zoom)),
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
      stats: async () => null,
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
 * Sets every wallpaper's zoom (the app, when the layout's choice is known or
 * changes): the running one re-lays itself out if its zoom changed, and a
 * wallpaper shown later starts at its own.
 */
export function setWallpaperZooms(next: Record<string, number>): void {
  saveHint(ZOOM_KEY, JSON.stringify(next));
  const before = current ? zoomFor(current.id) : null;
  zooms = next;
  if (current && size && zoomFor(current.id) !== before) resend();
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
  pixels: () => current?.probe.pixels() ?? Promise.resolve({ lit: 0, sig: 0, w: 0, h: 0 }),
  frames: (ms: number) => current?.probe.frames(ms) ?? Promise.resolve({ gaps: [], busy: 0 }),
  mode: () => current?.mode ?? null,
  /** The running wallpaper's zoom (null when none runs). */
  zoom: () => (current ? zoomFor(current.id) : null),
  /** What it draws at, and the sharpness guard's verdict (lib/sharpness.ts). */
  sharpness: () => sharpnessInfo(),
};

// The window's events, installed once for whichever wallpaper is running.
let resizeTimer: ReturnType<typeof setTimeout> | undefined;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(measure, RESIZE_DEBOUNCE_MS);
});
// Chrome's zoom cancelled or not (SYSTEM ▸ CHROME ZOOM), or a new zoom worked out: resize at once.
onBrowserZoom(() => {
  clearTimeout(resizeTimer);
  measure();
});
// Fullscreen fits the screen-sized canvas already; check anyway (a window across two screens).
document.addEventListener('fullscreenchange', () => {
  clearTimeout(resizeTimer);
  requestAnimationFrame(measure);
});
// Run only while the page can be seen.
document.addEventListener('visibilitychange', () => (document.hidden ? current?.instance.stop() : current?.instance.start()));
motion.addEventListener('change', () => current?.instance.setStill(reduceMotion()));
