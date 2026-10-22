/**
 * src/store/instance.ts: the app's layout and bookmarks stores, set once at startup.
 *
 * Layer: store. main.tsx loads storage (persist.ts boot), creates the store
 * and sets it here before rendering, so components can read it without
 * waiting. Tests create their own stores with createLayoutStore instead.
 */
import type { StoreApi } from 'zustand/vanilla';

import type { BookmarksState } from './bookmarks';
import type { LayoutState } from './layout';

let instance: StoreApi<LayoutState> | null = null;
let bookmarks: StoreApi<BookmarksState> | null = null;

/** Sets the app's layout store (startup only). */
export function setLayoutStore(store: StoreApi<LayoutState>): void {
  instance = store;
}

/** The app's layout store. Throws if startup hasn't set it yet (a bug). */
export function layoutStore(): StoreApi<LayoutState> {
  if (!instance) throw new Error('layout store used before startup set it');
  return instance;
}

/** Sets the app's bookmarks store (startup only). */
export function setBookmarksStore(store: StoreApi<BookmarksState>): void {
  bookmarks = store;
}

/** The app's bookmarks store. Throws if startup hasn't set it yet (a bug). */
export function bookmarksStore(): StoreApi<BookmarksState> {
  if (!bookmarks) throw new Error('bookmarks store used before startup set it');
  return bookmarks;
}
