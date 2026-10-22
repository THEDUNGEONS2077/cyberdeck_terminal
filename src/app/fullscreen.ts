/**
 * src/app/fullscreen.ts: immersive mode: the browser's fullscreen with
 * every piece of UI hidden, so only the wallpaper shows.
 *
 * Layer: UI (the Fullscreen API).
 *
 * The UI store's `immersive` flag always follows the browser's own state
 * (`fullscreenchange`), never the other way round: so leaving with Esc,
 * F11 or the browser's own controls hides and shows the UI correctly too.
 */
import { useEffect } from 'react';

import { uiStore } from '@/store/ui';

/** The parts of `document` used here (injectable for tests). */
export interface FullscreenDoc {
  fullscreenElement: Element | null;
  documentElement: { requestFullscreen(): Promise<void> };
  exitFullscreen(): Promise<void>;
}

/**
 * Enters fullscreen, or leaves it if already in. Must run inside a user
 * action (a key press or click): browsers refuse fullscreen otherwise.
 * A refusal is ignored: the page simply stays as it is.
 */
export async function toggleFullscreen(doc: FullscreenDoc = document): Promise<void> {
  try {
    if (doc.fullscreenElement) await doc.exitFullscreen();
    else await doc.documentElement.requestFullscreen();
  } catch {
    // Refused (not from a user action, or blocked by the browser): nothing to do.
  }
}

/** Keeps the UI store's `immersive` in step with the browser's fullscreen state. */
export function useFullscreenSync(): void {
  useEffect(() => {
    const sync = () => uiStore.getState().setImmersive(!!document.fullscreenElement);
    sync();
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);
}

/** In immersive mode the pointer hides after this long without moving. */
export const IDLE_CURSOR_MS = 2000;

/**
 * Hides the mouse pointer while `on` and the mouse has been still for
 * IDLE_CURSOR_MS (sets `data-idle` on <html>; app.css hides the cursor).
 * Any movement brings it back.
 */
export function useIdleCursor(on: boolean): void {
  useEffect(() => {
    const root = document.documentElement;
    if (!on) {
      delete root.dataset.idle;
      return;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const wake = () => {
      delete root.dataset.idle;
      clearTimeout(timer);
      timer = setTimeout(() => (root.dataset.idle = ''), IDLE_CURSOR_MS);
    };
    wake();
    window.addEventListener('mousemove', wake);
    window.addEventListener('mousedown', wake);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousemove', wake);
      window.removeEventListener('mousedown', wake);
      delete root.dataset.idle;
    };
  }, [on]);
}
