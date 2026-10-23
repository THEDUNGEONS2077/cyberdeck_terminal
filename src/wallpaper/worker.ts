/**
 * src/wallpaper/worker.ts: the wallpaper's own thread.
 *
 * Layer: wallpaper (a dedicated worker; no DOM, no stores). The host
 * (host.ts) hands over the page's canvas as an OffscreenCanvas, and the
 * wallpaper runs here, start to finish: its fonts, its sprite sheets, the
 * pre-warm and every frame (optimization pass 2, 2026-10-22). The page's
 * main thread is left to the dashboard: it starts while the rain fills,
 * and a frame of rain no longer costs the page a frame of work.
 *
 * Messages in (ToWorker): init (the canvas, the app's font, the options,
 * the size), then resize, start, stop, still, glow, probe, destroy.
 * Messages out (FromWorker): ready (the first full frame is drawn: the host
 * fades the canvas in), measure (the wallpaper's performance measures, for
 * the page's timeline), and probe answers (for the browser tests).
 */
import type { GlowLevel } from '@/lib/layout';

import { findWallpaper } from './registry';
import type { WallpaperInstance, WallpaperPalette } from './types';

/** What the host sends. */
export type ToWorker =
  | {
      type: 'init';
      id: string;
      canvas: OffscreenCanvas;
      /** The app's font file (JetBrains Mono Regular): the page's @font-face doesn't reach a worker. */
      fontUrl: string;
      palette: WallpaperPalette;
      glow: GlowLevel;
      still: boolean;
      size: { w: number; h: number; dpr: number };
    }
  | { type: 'resize'; w: number; h: number; dpr: number }
  | { type: 'start' }
  | { type: 'stop' }
  | { type: 'still'; still: boolean }
  | { type: 'glow'; glow: GlowLevel }
  | { type: 'palette'; palette: WallpaperPalette }
  | { type: 'probe'; id: number; what: 'pixels' }
  | { type: 'probe'; id: number; what: 'frames'; ms: number }
  | { type: 'destroy' };

/** What the worker sends back. */
export type FromWorker =
  | { type: 'ready' }
  | { type: 'measure'; name: string; start: number; duration: number; origin: number }
  | { type: 'probe'; id: number; result: PixelsProbe | FramesProbe };

/** How much of the canvas is lit (alpha above a faint residue), and a fingerprint of it (changes when the rain moves). */
export interface PixelsProbe {
  lit: number;
  sig: number;
}

/** The gaps between animation frames over a while, and the time spent drawing in them (ms). */
export interface FramesProbe {
  gaps: number[];
  busy: number;
}

/** The parts of the worker's global scope used here (the DOM typings describe a window). */
interface WorkerScope {
  postMessage(message: FromWorker): void;
  onmessage: ((event: MessageEvent<ToWorker>) => void) | null;
  fonts: FontFaceSet;
  requestAnimationFrame(callback: FrameRequestCallback): number;
  close(): void;
}
const scope = self as unknown as WorkerScope;

// Time spent in animation-frame callbacks (the wallpaper's drawing), for the
// frames probe: every callback the wallpaper asks for is timed.
let busy = 0;
const nativeFrame = scope.requestAnimationFrame.bind(scope);
scope.requestAnimationFrame = (callback) =>
  nativeFrame((t) => {
    const start = performance.now();
    try {
      callback(t);
    } finally {
      busy += performance.now() - start;
    }
  });

// The wallpaper's performance measures (rain-atlas, rain-prewarm) go to the
// page's timeline, where e2e/motion.mjs reads them.
new PerformanceObserver((list) => {
  for (const e of list.getEntries()) scope.postMessage({ type: 'measure', name: e.name, start: e.startTime, duration: e.duration, origin: performance.timeOrigin });
}).observe({ type: 'measure' });

let canvas: OffscreenCanvas | null = null;
let instance: WallpaperInstance | null = null;

/** Answers a pixels probe from the canvas as it is now. */
function pixels(): PixelsProbe {
  if (!canvas?.width || !canvas.height) return { lit: 0, sig: 0 };
  const data = (canvas.getContext('2d') as OffscreenCanvasRenderingContext2D).getImageData(0, 0, canvas.width, canvas.height).data;
  let lit = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i]! > 40) lit++;
  // A fingerprint from a sample of pixels (every 997th): enough to tell two moments apart.
  let sig = 0;
  for (let i = 3; i < data.length; i += 4 * 997) sig = (sig * 31 + data[i]! + data[i - 2]!) >>> 0;
  return { lit: lit / (data.length / 4), sig };
}

/** Records frame gaps and drawing time for `ms`, then answers. */
function frames(id: number, ms: number): void {
  const gaps: number[] = [];
  const busyAtStart = busy;
  const end = performance.now() + ms;
  let prev = 0;
  // The native callback: the probe's own timing isn't counted as drawing.
  const record = (t: number) => {
    if (prev) gaps.push(t - prev);
    prev = t;
    if (performance.now() < end) nativeFrame(record);
    else scope.postMessage({ type: 'probe', id, result: { gaps, busy: busy - busyAtStart } });
  };
  nativeFrame(record);
}

scope.onmessage = ({ data: m }) => {
  switch (m.type) {
    case 'init': {
      // The app's font, for the glyphs (the engine waits for it through the font set).
      try {
        scope.fonts.add(new FontFace('JetBrains Mono', `url("${m.fontUrl}")`));
      } catch {
        // Drawn with the fallback fonts instead.
      }
      canvas = m.canvas;
      instance = findWallpaper(m.id).create(m.canvas, { palette: m.palette, glow: m.glow, still: m.still, onReady: () => scope.postMessage({ type: 'ready' }) });
      instance.resize(m.size.w, m.size.h, m.size.dpr);
      break;
    }
    case 'resize':
      instance?.resize(m.w, m.h, m.dpr);
      break;
    case 'start':
      instance?.start();
      break;
    case 'stop':
      instance?.stop();
      break;
    case 'still':
      instance?.setStill(m.still);
      break;
    case 'glow':
      instance?.setGlow(m.glow);
      break;
    case 'palette':
      instance?.setPalette(m.palette);
      break;
    case 'probe':
      if (m.what === 'pixels') scope.postMessage({ type: 'probe', id: m.id, result: pixels() });
      else frames(m.id, m.ms);
      break;
    case 'destroy':
      instance?.destroy();
      scope.close();
      break;
  }
};
