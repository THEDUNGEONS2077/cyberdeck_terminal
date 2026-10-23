/**
 * src/app/useShortcuts.ts: the page's keyboard shortcuts.
 *
 * Layer: UI. One window listener, following quest_log_desktop's
 * src/app/useShortcuts.ts: keys typed into a field never trigger anything,
 * and keys with Ctrl, Alt or Meta are left to the browser (Ctrl+F still
 * finds in the page). While a dialog is open it keeps the keyboard
 * (`blocked`), and its own Esc closes it.
 *
 *   F  immersive fullscreen on / off (fullscreen.ts)
 *   S  SYSTEM panel (backups, restore, wallpaper)
 *   /  the finder: find a bookmark, or run a command (Finder.tsx)
 *   + −  zoom the wallpaper in / out a step, 0 back to 100% (zoom.ts; in
 *        fullscreen too: it's the wallpaper alone there)
 */
import { useEffect } from 'react';

import { uiStore } from '@/store/ui';

import { toggleFullscreen } from './fullscreen';
import { zoomWallpaper } from './zoom';

/** Is the key event aimed at somewhere you type? */
export function typing(e: Pick<KeyboardEvent, 'target'>): boolean {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
}

/** Does the key event carry a modifier that makes it the browser's (Ctrl, Alt, Meta)? */
export function modified(e: Pick<KeyboardEvent, 'ctrlKey' | 'altKey' | 'metaKey'>): boolean {
  return e.ctrlKey || e.altKey || e.metaKey;
}

/** What a shortcut does. */
export type Shortcut = 'fullscreen' | 'system' | 'find' | 'zoom-in' | 'zoom-out' | 'zoom-reset';

/**
 * The action for a key press, or null when the page should leave it alone.
 * Zoom takes + or = (= is + without Shift on many keyboards), − or _, and
 * 0; with Ctrl they stay the browser's own page zoom.
 */
export function shortcutFor(e: Pick<KeyboardEvent, 'key' | 'target' | 'ctrlKey' | 'altKey' | 'metaKey' | 'repeat'>): Shortcut | null {
  if (e.repeat || typing(e) || modified(e)) return null;
  switch (e.key.toLowerCase()) {
    case 'f':
      return 'fullscreen';
    case 's':
      return 'system';
    case '/':
      return 'find';
    case '+':
    case '=':
      return 'zoom-in';
    case '-':
    case '_':
      return 'zoom-out';
    case '0':
      return 'zoom-reset';
    default:
      return null;
  }
}

/** Installs the shortcuts while mounted; `blocked` while a dialog has the keyboard. */
export function useShortcuts(blocked: boolean): void {
  useEffect(() => {
    if (blocked) return;
    const onKey = (e: KeyboardEvent) => {
      const action = shortcutFor(e);
      if (!action) return;
      e.preventDefault();
      if (action === 'fullscreen') void toggleFullscreen();
      // Zoom works in fullscreen too (the wallpaper is all there is to see there).
      else if (action === 'zoom-in') zoomWallpaper('in');
      else if (action === 'zoom-out') zoomWallpaper('out');
      else if (action === 'zoom-reset') zoomWallpaper('reset');
      // SYSTEM and the finder only open outside immersive mode: there the UI is hidden.
      else if (uiStore.getState().immersive) return;
      else if (action === 'find') uiStore.getState().setFinderOpen(true);
      else uiStore.getState().setPanelOpen(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [blocked]);
}
