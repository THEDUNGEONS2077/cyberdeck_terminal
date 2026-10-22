/**
 * src/wallpaper/WallpaperLayer.tsx: the full-screen wallpaper behind
 * everything: a canvas, plus CSS light layers (haze above, fade to black
 * below; app.css `.wallpaper`).
 *
 * Layer: UI (React), owning the canvas a wallpaper draws on. It:
 *   - creates the chosen wallpaper (registry.ts) and swaps it when the id changes;
 *   - passes on size and pixel-ratio changes, debounced (150 ms) so a
 *     window being dragged larger doesn't resize the canvas every frame;
 *   - stops the animation while the page is hidden (another tab in front);
 *   - follows Reduce Motion: a still frame instead of animation.
 */
import { useEffect, useRef } from 'react';

import { findWallpaper } from './registry';
import type { WallpaperPalette } from './types';

/** Waits this long after the last resize before telling the wallpaper. */
const RESIZE_DEBOUNCE_MS = 150;

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

/** Is Reduce Motion on (the OS setting, unless the page overrides it with data-reduce-motion)? */
function reduceMotion(query: MediaQueryList): boolean {
  const own = document.documentElement.dataset.reduceMotion;
  if (own === 'on') return true;
  if (own === 'off') return false;
  return query.matches;
}

/** The wallpaper `id`, filling the window behind the UI. */
export function WallpaperLayer({ id }: { id: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const wallpaper = findWallpaper(id).create(canvas, { palette: readPalette(), still: reduceMotion(motion) });

    // Size: now, then after each resize settles.
    const measure = () => wallpaper.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
    measure();
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(measure, RESIZE_DEBOUNCE_MS);
    };

    // Run only while the page can be seen.
    const onVisibility = () => (document.hidden ? wallpaper.stop() : wallpaper.start());
    const onMotion = () => wallpaper.setStill(reduceMotion(motion));

    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibility);
    motion.addEventListener('change', onMotion);
    if (!document.hidden) wallpaper.start();
    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      motion.removeEventListener('change', onMotion);
      wallpaper.destroy();
    };
  }, [id]);

  return (
    <div className="wallpaper" aria-hidden>
      <div className="wallpaper-haze" />
      {/* A new canvas per wallpaper: one that drew 2D can't be handed to another kind. */}
      <canvas key={id} ref={canvasRef} className="wallpaper-canvas" />
      <div className="wallpaper-floor" />
    </div>
  );
}
