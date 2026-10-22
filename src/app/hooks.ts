/**
 * src/app/hooks.ts: React hooks for reading the stores.
 *
 * Layer: UI. Components re-render only when the slice they select changes.
 * Actions are read without subscribing: `layoutStore().getState().setWallpaper(…)`.
 */
import { useStore } from 'zustand';

import type { BookmarksState } from '@/store/bookmarks';
import { bookmarksStore, layoutStore } from '@/store/instance';
import type { LayoutState } from '@/store/layout';
import { uiStore, type UiState } from '@/store/ui';

/** A slice of the layout store. */
export function useLayout<T>(select: (s: LayoutState) => T): T {
  return useStore(layoutStore(), select);
}

/** A slice of the UI store. */
export function useUi<T>(select: (s: UiState) => T): T {
  return useStore(uiStore, select);
}

/** A slice of the bookmarks store (the bridge's live bar). */
export function useBookmarks<T>(select: (s: BookmarksState) => T): T {
  return useStore(bookmarksStore(), select);
}
