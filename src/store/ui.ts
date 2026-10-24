/**
 * src/store/ui.ts: what the screen is doing right now (nothing here is saved).
 *
 * Layer: store (zustand vanilla store).
 *   - immersive: the page is fullscreen with the UI hidden (F);
 *   - panelOpen: the SYSTEM panel is open (S);
 *   - finderOpen: the finder is open (/);
 *   - moduleSettings: the module whose SETTINGS dialog is open, if any;
 *   - toast: the message at the bottom, if any;
 *   - announcement: the last change to tell screen readers about (app/App.tsx
 *     reads it into a polite live region: a move, a hide, an undo…).
 */
import { createStore } from 'zustand/vanilla';

/** A button a toast can offer. */
export type ToastAction = 'export';

/** The message at the bottom of the screen. */
export interface ToastState {
  /** Changes with every toast, so the same message twice still restarts its clock. */
  key: number;
  message: string;
  /** A button to show with it (EXPORT on the backup reminder). */
  action?: ToastAction;
  /** Stays until dismissed (no clock): for things that need an answer. */
  sticky?: boolean;
}

/** The UI store's state and actions. */
export interface UiState {
  immersive: boolean;
  panelOpen: boolean;
  finderOpen: boolean;
  /** The id of the module whose SETTINGS dialog is open, or null. */
  moduleSettings: string | null;
  toast: ToastState | null;
  setImmersive(on: boolean): void;
  setPanelOpen(open: boolean): void;
  setFinderOpen(open: boolean): void;
  /** Opens module `id`'s SETTINGS dialog (null closes it). */
  setModuleSettings(id: string | null): void;
  /** Shows a toast (replacing any other). */
  showToast(message: string, options?: { action?: ToastAction; sticky?: boolean }): void;
  /** Hides the toast with `key` (if it's still the one showing). */
  dismissToast(key: number): void;
  /** What a screen reader last heard about (key changes so a repeat is read again). */
  announcement: { key: number; text: string } | null;
  /** Tells screen readers about a change (nothing is shown on screen). */
  announce(text: string): void;
}

let nextKey = 1;

/** Creates a UI store. */
export function createUiStore() {
  return createStore<UiState>((set, get) => ({
    immersive: false,
    panelOpen: false,
    finderOpen: false,
    moduleSettings: null,
    toast: null,
    setImmersive: (immersive) => set({ immersive }),
    setPanelOpen: (panelOpen) => set({ panelOpen }),
    setFinderOpen: (finderOpen) => set({ finderOpen }),
    setModuleSettings: (moduleSettings) => set({ moduleSettings }),
    showToast: (message, options = {}) => set({ toast: { key: nextKey++, message, ...options } }),
    dismissToast: (key) => {
      if (get().toast?.key === key) set({ toast: null });
    },
    announcement: null,
    announce: (text) => set({ announcement: { key: nextKey++, text } }),
  }));
}

/** The app's one UI store. */
export const uiStore = createUiStore();
