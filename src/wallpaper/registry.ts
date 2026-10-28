/**
 * src/wallpaper/registry.ts: every wallpaper's engine.
 *
 * Layer: wallpaper. Loaded by the wallpaper's worker (worker.ts), and by
 * the page only if a worker can't run (host.ts). To add a wallpaper: write
 * it in its own folder (implementing `Wallpaper`, types.ts), add it to
 * WALLPAPERS here and its name card to catalog.ts.
 */
import { knownWallpaperId } from './catalog';
import { dataFlow } from './data-flow/engine';
import { horizon } from './horizon/engine';
import { sunset } from './sunset/engine';
import { matrixRain } from './matrix-rain/engine';
import { megacity } from './megacity/engine';
import { neuralNet } from './neural-net/engine';
import { prism } from './prism/engine';
import { velocity } from './velocity/engine';
import type { Wallpaper } from './types';

/** All wallpaper engines. */
export const WALLPAPERS: readonly Wallpaper[] = [matrixRain, neuralNet, velocity, dataFlow, megacity, horizon, sunset, prism];

/** The wallpaper with `id`; the default one if it's unknown (a layout from a newer build, say). */
export function findWallpaper(id: string): Wallpaper {
  const known = knownWallpaperId(id);
  return WALLPAPERS.find((w) => w.id === known) ?? WALLPAPERS[0]!;
}
