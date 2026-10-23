/**
 * src/app/App.tsx: the page: the wallpaper at the back, the UI layer above
 * it, and the SYSTEM panel when open.
 *
 * Layer: UI. In immersive mode (F) the UI layer fades out, is made inert
 * (no focus, no clicks, hidden from screen readers) and the idle pointer
 * hides, so only the wallpaper is left.
 */
import { useEffect } from 'react';

import { hasCustomContent } from '@/lib/layout';
import { backupDue, exportAge } from '@/lib/reminder';
import { layoutStore } from '@/store/instance';
import { uiStore } from '@/store/ui';
import { applyPalette } from '@/palette';
import { setWallpaperColors, setWallpaperGlow, showWallpaper } from '@/wallpaper/host';

import { useFullscreenSync, useIdleCursor } from './fullscreen';
import { useLayout, useUi } from './hooks';
import { BookmarksDeck } from './Bookmarks';
import { Finder } from './Finder';
import { Hud } from './Hud';
import { SystemPanel } from './SystemPanel';
import { Toast } from './Toast';
import { usePresence } from './usePresence';
import { useBridge } from './useBridge';
import { useShortcuts } from './useShortcuts';

/**
 * Says changes out loud to screen readers (a move, a hide, an undo: what
 * app/arrangeDrag.ts and the deck announce), politely, without showing
 * anything. The key makes a repeated message be read again.
 */
function Announcer() {
  const announcement = useUi((s) => s.announcement);
  return (
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {announcement && <span key={announcement.key}>{announcement.text}</span>}
    </div>
  );
}

/** How long the panel takes to fade out (matches --fast in theme.css). */
const PANEL_EXIT_MS = 120;

/**
 * Once per page load: if a backup is due (lib/reminder.ts), a sticky toast
 * offers EXPORT or LATER. Skipped when another notice (damaged data) is up.
 */
function useBackupReminder(): void {
  useEffect(() => {
    const { layout, meta } = layoutStore().getState();
    const now = Date.now();
    if (uiStore.getState().toast) return;
    if (backupDue(meta, layout.prefs.backupReminderDays, hasCustomContent(layout), now)) {
      const age = exportAge(meta, now);
      uiStore.getState().showToast(age === 'NEVER' ? 'NO BACKUP OF THIS LAYOUT YET' : `LAST BACKUP ${age}`, { action: 'export', sticky: true });
    }
  }, []);
}

/** The whole page. */
export function App() {
  const wallpaper = useLayout((s) => s.layout.wallpaper);
  const glow = useLayout((s) => s.layout.prefs.rainGlow);
  const palette = useLayout((s) => s.layout.prefs.palette);
  const wallpaperPalette = useLayout((s) => s.layout.prefs.wallpaperPalette);
  const immersive = useUi((s) => s.immersive);
  const panelOpen = useUi((s) => s.panelOpen);
  const finderOpen = useUi((s) => s.finderOpen);
  const panel = usePresence(panelOpen ? true : null, PANEL_EXIT_MS);

  // The wallpaper runs outside React (wallpaper/host.ts, started by main.tsx): only its choice is passed on.
  useEffect(() => showWallpaper(wallpaper), [wallpaper]);
  useEffect(() => setWallpaperGlow(glow), [glow]);
  // The two palettes, each on its own: the dashboard's on the page, the wallpaper's on the wallpaper.
  useEffect(() => void applyPalette(palette), [palette]);
  useEffect(() => setWallpaperColors(wallpaperPalette), [wallpaperPalette]);

  // Startup timing (read by e2e/perf.mjs): the dashboard is on screen.
  useEffect(() => void performance.mark('app:ui'), []);

  useFullscreenSync();
  useIdleCursor(immersive);
  useShortcuts(panelOpen || finderOpen);
  useBackupReminder();
  useBridge();

  return (
    <>
      {/* The page's main landmark: everything that isn't the wallpaper. */}
      <main className="ui-layer" data-hidden={immersive || undefined} inert={immersive}>
        <Hud />
        <BookmarksDeck />
        <Toast />
      </main>
      {panel.shown && <SystemPanel leaving={panel.leaving} />}
      <Finder />
      <Announcer />
    </>
  );
}
