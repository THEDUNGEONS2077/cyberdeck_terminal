/**
 * src/app/zoom.ts: zooming the wallpaper from the keyboard (+ − 0) and the
 * finder (SYSTEM ▸ APPEARANCE ▸ ZOOM does it with buttons).
 *
 * Layer: UI. The zoom is the shown wallpaper's own, kept in the layout
 * (prefs.wallpaperZoom: the zoom that wallpaper opens at from then on); it
 * steps through lib/layout.ts ZOOM_STEPS, and a toast says where it is.
 */
import { DEFAULT_ZOOM, stepZoom, zoomLabel, zoomOf } from '@/lib/layout';
import { layoutStore } from '@/store/instance';
import { uiStore } from '@/store/ui';

/** Zooms the shown wallpaper in or out a step, or back to 100%, and says so. */
export function zoomWallpaper(how: 'in' | 'out' | 'reset'): void {
  const { layout, setWallpaperZoom } = layoutStore().getState();
  const now = zoomOf(layout.prefs.wallpaperZoom, layout.wallpaper);
  const next = how === 'reset' ? DEFAULT_ZOOM : stepZoom(now, how === 'in' ? 1 : -1);
  setWallpaperZoom(layout.wallpaper, next);
  uiStore.getState().showToast(`WALLPAPER ZOOM ${zoomLabel(next)}`);
}
