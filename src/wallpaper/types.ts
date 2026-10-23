/**
 * src/wallpaper/types.ts: the contract every animated wallpaper follows.
 *
 * Layer: wallpaper (canvas drawing; no React, no stores). A wallpaper is
 * a factory that takes over a canvas; host.ts owns the canvas element (and
 * its CSS size) and tells the wallpaper when its size changes and when to
 * run. Wallpapers run in a worker (worker.ts) on an OffscreenCanvas, or on
 * the page if a worker can't start, so they may only use what both have:
 * no DOM. Adding a wallpaper = a folder implementing `Wallpaper` + one line
 * in registry.ts.
 */
import type { GlowLevel } from '@/lib/layout';

/** The theme colours a wallpaper draws with, read from theme.css tokens at mount. */
export interface WallpaperPalette {
  /** --bg */
  bg: string;
  /** --line: the darkest decoration green. */
  line: string;
  /** --text-dim */
  dim: string;
  /** --text */
  text: string;
  /** --accent */
  accent: string;
  /** --text-bright: the palest tint of the accent, nearly white. */
  bright: string;
  /** --cool: a second, contrasting hue (two-tone wallpapers). */
  cool: string;
}

/** What a wallpaper is created with. */
export interface WallpaperOptions {
  palette: WallpaperPalette;
  /** How strongly it glows (SYSTEM ▸ WALLPAPER ▸ GLOW); a wallpaper without a glow ignores it. */
  glow: GlowLevel;
  /** Draw one still frame and don't animate (Reduce Motion). */
  still: boolean;
  /** Called once, when the first full frame is on the canvas (the host fades the canvas in then). */
  onReady?: () => void;
}

/** A running wallpaper on one canvas. */
export interface WallpaperInstance {
  /**
   * The canvas's CSS size, device pixel ratio or zoom changed (also called
   * once right after create). The wallpaper sizes the canvas's pixels (CSS
   * size × pixel ratio, capped as it likes); the host has already set its
   * CSS size. `zoom` is the wallpaper's ZOOM (lib/layout.ts ZOOM_STEPS, 1 =
   * as designed): most wallpapers lay out with zoomedSize; one whose layout
   * is shares of the screen scales its sizes by it instead.
   */
  resize(width: number, height: number, dpr: number, zoom: number): void;
  /** Starts (or resumes) animating. */
  start(): void;
  /** Stops animating; the last frame stays on the canvas. */
  stop(): void;
  /** The glow level changed. */
  setGlow(glow: GlowLevel): void;
  /** The colour palette changed (SYSTEM ▸ APPEARANCE ▸ PALETTE). */
  setPalette(palette: WallpaperPalette): void;
  /** Switches between animating and a still frame (Reduce Motion changed). */
  setStill(still: boolean): void;
  /** Stops for good and releases everything. */
  destroy(): void;
}

/**
 * The size a wallpaper lays itself out at, zoomed: a `width` × `height`
 * CSS px canvas at pixel ratio `dpr`, as if the screen were 1/zoom as big,
 * drawn zoom times as large (browser zoom, for the wallpaper alone). The
 * ratio is capped first (`maxDpr`, the engine's limit on canvas pixels),
 * then zoomed, so the canvas keeps the same pixels at any zoom: zoomed in,
 * the wallpaper is as sharp as ever, not scaled up.
 */
export function zoomedSize(width: number, height: number, dpr: number, zoom: number, maxDpr: number): { w: number; h: number; dpr: number } {
  const z = zoom > 0 && Number.isFinite(zoom) ? zoom : 1;
  return { w: width / z, h: height / z, dpr: Math.min(maxDpr, Math.max(1, dpr)) * z };
}

/** A wallpaper's engine (its name card, with the label, is in catalog.ts). */
export interface Wallpaper {
  /** Stored in the layout document; never change an id once released. */
  id: string;
  /**
   * Takes over `canvas`. May finish setting up asynchronously (fonts);
   * calls made before then are remembered and applied.
   */
  create(canvas: HTMLCanvasElement | OffscreenCanvas, options: WallpaperOptions): WallpaperInstance;
}
