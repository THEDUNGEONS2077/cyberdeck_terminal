/**
 * src/wallpaper/catalog.ts: the wallpapers by name: ids and labels only.
 *
 * Layer: wallpaper (data only). The page needs to know which wallpapers
 * exist (SYSTEM ▸ WALLPAPER lists them, the host checks ids), but not
 * their code: that runs in the wallpaper's worker (registry.ts, worker.ts),
 * so the page's own scripts stay small. Every id here has an engine in
 * registry.ts (a unit test checks).
 */
import { DEFAULT_WALLPAPER_ID } from '@/lib/layout';

/** A wallpaper's name card. */
export interface WallpaperInfo {
  /** Stored in layouts and backups: never change an id once released. */
  id: string;
  /** Shown in SYSTEM ▸ WALLPAPER. */
  label: string;
  /**
   * Its safe pixel cap: canvas px per CSS px it drew at up to 0.13 (lib/
   * sharpness.ts). On a sharper screen it draws at the screen's own ratio,
   * stepping back to this if its frames get slow.
   */
  safeDpr: number;
}

/** All wallpapers, in the order SYSTEM ▸ WALLPAPER lists them. */
export const WALLPAPER_LIST: readonly WallpaperInfo[] = [
  { id: 'matrix-rain', label: 'MATRIX RAIN', safeDpr: 2 },
  { id: 'neural-net', label: 'NEURAL NET', safeDpr: 2 },
  // A soft scene: 1.5 looked the same as 2 (and costs less fill).
  { id: 'velocity', label: 'VELOCITY', safeDpr: 1.5 },
  { id: 'data-flow', label: 'DATA FLOW', safeDpr: 2 },
  { id: 'megacity', label: 'MEGACITY', safeDpr: 2 },
];

/** Wallpaper `id`'s safe pixel cap (2 for an unknown one). */
export function safeDprOf(id: string): number {
  return WALLPAPER_LIST.find((w) => w.id === id)?.safeDpr ?? 2;
}

/** `id` if it's a wallpaper this build has, else the default's (a layout from a newer build, say). */
export function knownWallpaperId(id: string): string {
  return WALLPAPER_LIST.some((w) => w.id === id) ? id : DEFAULT_WALLPAPER_ID;
}
