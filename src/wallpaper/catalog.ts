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
}

/** All wallpapers, in the order SYSTEM ▸ WALLPAPER lists them. */
export const WALLPAPER_LIST: readonly WallpaperInfo[] = [
  { id: 'matrix-rain', label: 'MATRIX RAIN' },
  { id: 'neural-net', label: 'NEURAL NET' },
  { id: 'velocity', label: 'VELOCITY' },
  { id: 'data-flow', label: 'DATA FLOW' },
  { id: 'megacity', label: 'MEGACITY' },
];

/** `id` if it's a wallpaper this build has, else the default's (a layout from a newer build, say). */
export function knownWallpaperId(id: string): string {
  return WALLPAPER_LIST.some((w) => w.id === id) ? id : DEFAULT_WALLPAPER_ID;
}
