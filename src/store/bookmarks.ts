/**
 * src/store/bookmarks.ts: the live bookmarks bar from the bridge extension,
 * and whether the bridge is there.
 *
 * Layer: store (zustand vanilla store). Not saved in the layout: it's
 * Chrome's data, read live. The last bar is cached (KEYS.bookmarksCache)
 * only so the next open can draw it at once, before the bridge answers.
 *
 * status:
 *   checking  just opened; asking the bridge (the cached bar, if any, shows meanwhile)
 *   live      the bridge answered; `bar` is current
 *   absent    no bridge (not installed, or not answering)
 */
import { createStore } from 'zustand/vanilla';

import { canonicalJson } from '@/lib/layout';
import type { BookmarkNode } from '@/lib/bookmarks';

import { type KV, KEYS } from './kv';

/** Whether the bridge is there. */
export type BridgeStatus = 'checking' | 'live' | 'absent';

/** The bookmarks store's state and actions. */
export interface BookmarksState {
  status: BridgeStatus;
  /** The bridge's bookmarks bar (live), or the cached one while checking; null if none. */
  bar: BookmarkNode | null;
  /** The installed bridge's version, when live. */
  bridgeVersion: string | null;
  /** The bridge answered: shows `bar` and caches it (only when it changed). */
  setLive(bar: BookmarkNode, version: string): void;
  /** No bridge: the cached bar is no longer shown. */
  setAbsent(): void;
}

/** Creates the bookmarks store, starting from the cached bar (or none). */
export function createBookmarksStore(kv: KV, cached: BookmarkNode | null) {
  return createStore<BookmarksState>((set, get) => ({
    status: 'checking',
    bar: cached,
    bridgeVersion: null,
    setLive(bar, version) {
      const same = get().bar !== null && canonicalJson(get().bar) === canonicalJson(bar);
      set({ status: 'live', bar: same ? get().bar : bar, bridgeVersion: version });
      // The cache is only for drawing the next open quickly: a failed write costs nothing.
      if (!same) kv.set(KEYS.bookmarksCache, bar).catch(() => {});
    },
    setAbsent() {
      set({ status: 'absent', bar: null, bridgeVersion: null });
    },
  }));
}
