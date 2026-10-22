/**
 * src/wallpaper/registry.ts: every wallpaper the user can choose.
 *
 * Layer: wallpaper. To add one: write it in its own folder (implementing
 * `Wallpaper`, types.ts) and add it to WALLPAPERS. Its id is stored in
 * saved layouts and backups, so it must never change once released.
 */
import { DEFAULT_WALLPAPER_ID } from '@/lib/layout';

import { matrixRain } from './matrix-rain/engine';
import type { Wallpaper } from './types';

/** All wallpapers, in the order SYSTEM ▸ WALLPAPER lists them. */
export const WALLPAPERS: readonly Wallpaper[] = [matrixRain];

/** The wallpaper with `id`; the default one if it's unknown (a layout from a newer build, say). */
export function findWallpaper(id: string): Wallpaper {
  return WALLPAPERS.find((w) => w.id === id) ?? WALLPAPERS.find((w) => w.id === DEFAULT_WALLPAPER_ID) ?? WALLPAPERS[0]!;
}
