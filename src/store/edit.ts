/**
 * src/store/edit.ts: edit mode: whether the layout is unlocked, and the
 * session's UNDO steps and REVERT point.
 *
 * Layer: store (zustand vanilla store, over the layout store).
 *
 * Every change made while editing is saved at once (store/layout.ts), so
 * nothing is lost if the page closes mid-edit. What this adds:
 *   - a "BEFORE EDIT" snapshot when editing starts (SYSTEM ▸ RESTORE can
 *     bring a whole session back);
 *   - UNDO: steps back through this session's changes, one at a time;
 *   - REVERT: back to how it all was when editing started (itself undoable);
 *   - DONE: locks the layout again and snapshots the result.
 * A change is an arrangement (areas, order, hidden), panel places and the
 * modules (where they sit, what they hold).
 */
import { createStore } from 'zustand/vanilla';

import type { Arrangement, PanelPlace, Panels } from '@/lib/arrange';
import { type ModuleInstance, placeModule } from '@/lib/modules';

import { layoutStore } from './instance';

/** What editing changes. */
export interface EditShape {
  arrangement: Arrangement;
  panels: Panels;
  modules: ModuleInstance[];
}

/** The shape with panel `id` (NAV, the brand panel, or a module) at `place`. */
export function withPlace(shape: EditShape, id: string, place: PanelPlace): EditShape {
  if (id === 'nav' || id === 'brand') return { ...shape, panels: { ...shape.panels, [id]: place } };
  return { ...shape, modules: placeModule(shape.modules, id, place) };
}

/** Most undo steps kept per session. */
const MAX_UNDO = 100;

/** The edit store's state and actions. */
export interface EditState {
  editing: boolean;
  /** How things were when editing started (REVERT goes back here). */
  start: EditShape | null;
  /** Earlier shapes this session, newest last (UNDO). */
  undo: EditShape[];
  /** Unlocks the layout. */
  begin(): void;
  /** Locks it again. */
  done(): void;
  /** Applies a change to the arrangement, panels and/or modules (undoable). */
  apply(change: (shape: EditShape) => EditShape): void;
  /** Steps back one change. */
  undoLast(): void;
  /** Back to how it was when editing started. */
  revert(): void;
}

/** The layout's current shape. */
function current(): EditShape {
  const { layout } = layoutStore().getState();
  return { arrangement: layout.bookmarks.arrangement, panels: layout.panels, modules: layout.modules };
}

/** Writes a shape to the layout (saved at once). */
function write(shape: EditShape): void {
  const store = layoutStore().getState();
  store.setArrangement(shape.arrangement);
  store.setPanels(shape.panels);
  store.setModules(shape.modules);
}

/** The app's edit store. */
export const editStore = createStore<EditState>((set, get) => ({
  editing: false,
  start: null,
  undo: [],

  begin() {
    if (get().editing) return;
    void layoutStore().getState().snapshotNow('before-edit');
    set({ editing: true, start: current(), undo: [] });
  },

  done() {
    if (!get().editing) return;
    set({ editing: false, start: null, undo: [] });
    // The edited layout gets its snapshot now, not after the usual quiet period.
    void layoutStore().getState().flushSnapshot();
  },

  apply(change) {
    const before = current();
    const after = change(before);
    if (after.arrangement === before.arrangement && after.panels === before.panels && after.modules === before.modules) return;
    set({ undo: [...get().undo, before].slice(-MAX_UNDO) });
    write(after);
  },

  undoLast() {
    const undo = get().undo;
    const last = undo[undo.length - 1];
    if (!last) return;
    set({ undo: undo.slice(0, -1) });
    write(last);
  },

  revert() {
    const start = get().start;
    if (!start) return;
    get().apply(() => start);
  },
}));
