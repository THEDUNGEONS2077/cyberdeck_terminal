/**
 * src/store/layout.ts: the layout store: the layout document, the backup
 * bookkeeping and the snapshot list, with the actions that change them.
 *
 * Layer: store (zustand vanilla store; React reads it via app/hooks.ts).
 *
 * Every change to the layout is saved at once (changes are rare, single
 * clicks, so there's nothing to batch), and a snapshot follows once the
 * layout has been still for CHANGE_DEBOUNCE_MS. Replacing the layout
 * (import, restore) snapshots the current one first, so it's never lost.
 * Storage writes run one at a time, in order, through `queue`.
 */
import { createStore, type StoreApi } from 'zustand/vanilla';

import type { Arrangement, Panels } from '@/lib/arrange';
import type { BookmarkNode } from '@/lib/bookmarks';
import { type GlowLevel, type LayoutDocument, type LayoutPrefs, withZoom, zoomOf } from '@/lib/layout';
import type { ModuleInstance } from '@/lib/modules';
import type { PaletteId } from '@/lib/palettes';
import { type BackupMeta, SNOOZE_MS } from '@/lib/reminder';
import { CHANGE_DEBOUNCE_MS, type SnapshotInfo, type SnapshotReason } from '@/lib/snapshots';

import type { KV } from './kv';
import { type Boot, loadSnapshot, saveLayout, saveMeta, storeSnapshot } from './persist';

/** The layout store's state and actions. */
export interface LayoutState {
  layout: LayoutDocument;
  meta: BackupMeta;
  /** The snapshots' index, newest first. */
  snapshots: SnapshotInfo[];
  /** Shows a different wallpaper. */
  setWallpaper(id: string): void;
  /** Sets the backup reminder's interval in days (0 = off). */
  setReminderDays(days: number): void;
  /** Sets how strongly the rain glows. */
  setRainGlow(level: GlowLevel): void;
  /** Sets the dashboard's colour palette. */
  setPalette(id: PaletteId): void;
  /** Sets the wallpaper's colour palette. */
  setWallpaperPalette(id: PaletteId): void;
  /** Sets wallpaper `id`'s zoom (snapped to a step; 100% removes it). */
  setWallpaperZoom(id: string, zoom: number): void;
  /** Sets the places whose links switch to their open tab (lib/switching.ts). */
  setSwitchTabs(list: string[]): void;
  /** Sets any of the sizes (UI SCALE, TEXT SIZE, MODULE SIZE, cancelling the browser's zoom; lib/scale.ts), already snapped to their steps. */
  setSizes(sizes: Partial<Pick<LayoutPrefs, 'uiScale' | 'textScale' | 'moduleScale' | 'cancelBrowserZoom'>>): void;
  /** Opens or collapses a bookmarks folder (by folderKey). */
  setFolderOpen(key: string, open: boolean): void;
  /** Keeps `bar` as the imported copy of the bookmarks bar (replacing any earlier copy). */
  importBookmarks(bar: BookmarkNode): void;
  /** Forgets the imported copy (snapshots still hold it). */
  removeImported(): void;
  /** Sets your arrangement of the bookmarks (areas, order, hidden). */
  setArrangement(arrangement: Arrangement): void;
  /** Sets where the panels sit. */
  setPanels(panels: Panels): void;
  /** Sets the modules (their places and settings). */
  setModules(modules: ModuleInstance[]): void;
  /** Takes a snapshot of the layout now (if it differs from the newest), e.g. as edit mode starts. */
  snapshotNow(reason: SnapshotReason): Promise<void>;
  /**
   * Restores the snapshot taken at `at` (read in full now), after
   * snapshotting the current layout. False if it can't be read.
   */
  restoreSnapshot(at: number): Promise<boolean>;
  /**
   * Replaces the whole layout (an import or a restore), after snapshotting
   * the current one with `reason`. Resolves once both are stored.
   */
  replaceLayout(next: LayoutDocument, reason: 'before-import' | 'before-restore'): Promise<void>;
  /** Records that a backup file was exported now (and ends any snooze). */
  markExported(): void;
  /** LATER on the reminder: quiet for SNOOZE_MS. */
  snoozeReminder(): void;
  /** Takes a pending change snapshot now (on leaving the page). */
  flushSnapshot(): Promise<void>;
  /** Resolves when every storage write so far has finished (tests, e2e). */
  settled(): Promise<void>;
}

/** Called when a storage write fails, so the UI can say so. */
export type SaveErrorHandler = (error: unknown) => void;

/**
 * Creates the layout store from what startup loaded.
 * `now` is the clock (injected so tests control time).
 */
export function createLayoutStore(kv: KV, boot: Boot, onSaveError: SaveErrorHandler = () => {}, now: () => number = Date.now): StoreApi<LayoutState> {
  // Storage writes, chained so they land in the order they were made.
  let queue: Promise<void> = Promise.resolve();
  const enqueue = (write: () => Promise<void>) => {
    queue = queue.then(write).catch(onSaveError);
    return queue;
  };
  // The pending change snapshot's timer.
  let timer: ReturnType<typeof setTimeout> | null = null;

  return createStore<LayoutState>((set, get) => {
    /** Snapshots the current layout (if it differs from the newest snapshot). */
    const snapshot = (reason: SnapshotReason) =>
      enqueue(async () => {
        const snapshots = await storeSnapshot(kv, get().snapshots, get().layout, reason, now());
        set({ snapshots });
      });

    /** Sets and saves a new layout, and schedules its change snapshot. */
    const commit = (layout: LayoutDocument) => {
      set({ layout });
      void enqueue(() => saveLayout(kv, layout));
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        void snapshot('change');
      }, CHANGE_DEBOUNCE_MS);
    };

    /** Sets and saves the backup bookkeeping. */
    const commitMeta = (meta: BackupMeta) => {
      set({ meta });
      void enqueue(() => saveMeta(kv, meta));
    };

    return {
      layout: boot.layout,
      meta: boot.meta,
      snapshots: boot.snapshots,

      setWallpaper(id) {
        if (get().layout.wallpaper !== id) commit({ ...get().layout, wallpaper: id });
      },

      setReminderDays(days) {
        const layout = get().layout;
        if (layout.prefs.backupReminderDays !== days) commit({ ...layout, prefs: { ...layout.prefs, backupReminderDays: days } });
      },

      setPalette(id) {
        const layout = get().layout;
        if (layout.prefs.palette !== id) commit({ ...layout, prefs: { ...layout.prefs, palette: id } });
      },

      setWallpaperPalette(id) {
        const layout = get().layout;
        if (layout.prefs.wallpaperPalette !== id) commit({ ...layout, prefs: { ...layout.prefs, wallpaperPalette: id } });
      },

      setWallpaperZoom(id, zoom) {
        const layout = get().layout;
        const zooms = withZoom(layout.prefs.wallpaperZoom, id, zoom);
        if (zoomOf(zooms, id) !== zoomOf(layout.prefs.wallpaperZoom, id)) commit({ ...layout, prefs: { ...layout.prefs, wallpaperZoom: zooms } });
      },

      setSwitchTabs(list) {
        const layout = get().layout;
        if (list.join() !== layout.prefs.switchTabs.join()) commit({ ...layout, prefs: { ...layout.prefs, switchTabs: list } });
      },

      setSizes(sizes) {
        const layout = get().layout;
        const prefs = { ...layout.prefs, ...sizes };
        // Only a real change is committed (a step pressed at either end changes nothing).
        if ((Object.keys(sizes) as (keyof typeof sizes)[]).some((k) => prefs[k] !== layout.prefs[k])) commit({ ...layout, prefs });
      },

      setRainGlow(level) {
        const layout = get().layout;
        if (layout.prefs.rainGlow !== level) commit({ ...layout, prefs: { ...layout.prefs, rainGlow: level } });
      },

      setFolderOpen(key, open) {
        const layout = get().layout;
        const was = layout.bookmarks.open.includes(key);
        if (was === open) return;
        const keys = open ? [...layout.bookmarks.open, key].sort() : layout.bookmarks.open.filter((k) => k !== key);
        commit({ ...layout, bookmarks: { ...layout.bookmarks, open: keys } });
      },

      importBookmarks(bar) {
        const layout = get().layout;
        commit({ ...layout, bookmarks: { ...layout.bookmarks, imported: bar, importedAt: now() } });
      },

      removeImported() {
        const layout = get().layout;
        if (layout.bookmarks.imported) commit({ ...layout, bookmarks: { ...layout.bookmarks, imported: null, importedAt: null } });
      },

      setArrangement(arrangement) {
        const layout = get().layout;
        if (layout.bookmarks.arrangement !== arrangement) commit({ ...layout, bookmarks: { ...layout.bookmarks, arrangement } });
      },

      setPanels(panels) {
        const layout = get().layout;
        if (layout.panels !== panels) commit({ ...layout, panels });
      },

      setModules(modules) {
        const layout = get().layout;
        if (layout.modules !== modules) commit({ ...layout, modules });
      },

      async snapshotNow(reason) {
        await snapshot(reason);
      },

      async restoreSnapshot(at) {
        const snap = await loadSnapshot(kv, at);
        if (!snap) return false;
        await get().replaceLayout(snap.layout, 'before-restore');
        return true;
      },

      async replaceLayout(next, reason) {
        // The current layout is stored first: an import or restore can always be undone.
        if (timer) clearTimeout(timer);
        timer = null;
        await snapshot(reason);
        commit(next);
        await queue;
      },

      markExported() {
        commitMeta({ ...get().meta, lastExportAt: now(), snoozedUntil: null });
      },

      snoozeReminder() {
        commitMeta({ ...get().meta, snoozedUntil: now() + SNOOZE_MS });
      },

      async flushSnapshot() {
        if (!timer) return;
        clearTimeout(timer);
        timer = null;
        await snapshot('change');
      },

      settled: () => queue,
    };
  });
}
