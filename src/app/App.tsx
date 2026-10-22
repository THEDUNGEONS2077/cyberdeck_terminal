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
import { WallpaperLayer } from '@/wallpaper/WallpaperLayer';

import { useFullscreenSync, useIdleCursor } from './fullscreen';
import { useLayout, useUi } from './hooks';
import { Hud } from './Hud';
import { SystemPanel } from './SystemPanel';
import { Toast } from './Toast';
import { usePresence } from './usePresence';
import { useShortcuts } from './useShortcuts';

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
  const immersive = useUi((s) => s.immersive);
  const panelOpen = useUi((s) => s.panelOpen);
  const panel = usePresence(panelOpen ? true : null, PANEL_EXIT_MS);

  useFullscreenSync();
  useIdleCursor(immersive);
  useShortcuts(panelOpen);
  useBackupReminder();

  return (
    <>
      <WallpaperLayer id={wallpaper} />
      {/* The page's main landmark: everything that isn't the wallpaper. */}
      <main className="ui-layer" data-hidden={immersive || undefined} inert={immersive}>
        <Hud />
        <Toast />
      </main>
      {panel.shown && <SystemPanel leaving={panel.leaving} />}
    </>
  );
}
