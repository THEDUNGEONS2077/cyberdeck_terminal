/**
 * src/store/ui.ts: what the screen is doing right now (nothing here is saved).
 *
 * Layer: store (zustand vanilla store).
 *   - immersive: the page is fullscreen with the UI hidden (F);
 *   - panelOpen: the SYSTEM panel is open (S);
 *   - toast: the message at the bottom, if any.
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
  toast: ToastState | null;
  setImmersive(on: boolean): void;
  setPanelOpen(open: boolean): void;
  /** Shows a toast (replacing any other). */
  showToast(message: string, options?: { action?: ToastAction; sticky?: boolean }): void;
  /** Hides the toast with `key` (if it's still the one showing). */
  dismissToast(key: number): void;
}

let nextKey = 1;

/** Creates a UI store. */
export function createUiStore() {
  return createStore<UiState>((set, get) => ({
    immersive: false,
    panelOpen: false,
    toast: null,
    setImmersive: (immersive) => set({ immersive }),
    setPanelOpen: (panelOpen) => set({ panelOpen }),
    showToast: (message, options = {}) => set({ toast: { key: nextKey++, message, ...options } }),
    dismissToast: (key) => {
      if (get().toast?.key === key) set({ toast: null });
    },
  }));
}

/** The app's one UI store. */
export const uiStore = createUiStore();
