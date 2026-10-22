/**
 * src/wallpaper/types.ts: the contract every animated wallpaper follows.
 *
 * Layer: wallpaper (canvas drawing; no React, no stores). A wallpaper is
 * a factory that takes over a canvas; WallpaperLayer.tsx owns the canvas
 * and tells the wallpaper when its size changes and when to run. Adding a
 * wallpaper = a folder implementing `Wallpaper` + one line in registry.ts.
 */

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
  /** --text-bright: the palest green, nearly white. */
  bright: string;
}

/** What a wallpaper is created with. */
export interface WallpaperOptions {
  palette: WallpaperPalette;
  /** Draw one still frame and don't animate (Reduce Motion). */
  still: boolean;
  /** Called once, when the first full frame is on the canvas (WallpaperLayer fades the canvas in then). */
  onReady?: () => void;
}

/** A running wallpaper on one canvas. */
export interface WallpaperInstance {
  /**
   * The canvas's CSS size and device pixel ratio changed (also called once
   * right after create). The wallpaper sizes the canvas itself: its backing
   * store and its CSS size, so the canvas is never shown stretched.
   */
  resize(width: number, height: number, dpr: number): void;
  /** Starts (or resumes) animating. */
  start(): void;
  /** Stops animating; the last frame stays on the canvas. */
  stop(): void;
  /** Switches between animating and a still frame (Reduce Motion changed). */
  setStill(still: boolean): void;
  /** Stops for good and releases everything. */
  destroy(): void;
}

/** A wallpaper the user can choose. */
export interface Wallpaper {
  /** Stored in the layout document; never change an id once released. */
  id: string;
  /** Shown in SYSTEM ▸ WALLPAPER. */
  label: string;
  /**
   * Takes over `canvas`. May finish setting up asynchronously (fonts);
   * calls made before then are remembered and applied.
   */
  create(canvas: HTMLCanvasElement, options: WallpaperOptions): WallpaperInstance;
}
