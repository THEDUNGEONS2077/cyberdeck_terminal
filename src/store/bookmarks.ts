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
 *
 * `fresh`: items that weren't there a moment ago (added in Chrome while the
 * dashboard was open, or since the cached copy was made): the deck lights
 * them briefly, for FRESH_MS (UX pass, 2026-10-22: so a new bookmark is
 * seen arriving, not hunted for).
 */
import { createStore } from 'zustand/vanilla';

import type { BridgeRoots } from '@/bridge/client';
import { indexTree } from '@/lib/arrange';
import type { BookmarkNode } from '@/lib/bookmarks';
import { canonicalJson } from '@/lib/layout';

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
  /** What the installed bridge can do ('favicons', 'open'), when live. */
  features: string[];
  /** What the bridge read from Chrome (bridge 1.2+), when live: shown in SYSTEM. */
  roots: BridgeRoots | null;
  /** Keys (lib/arrange.ts) of items that just arrived, lit for FRESH_MS. */
  fresh: ReadonlySet<string>;
  /** The bridge answered: shows `bar` and caches it (only when it changed). */
  setLive(bar: BookmarkNode, version: string, features?: string[], roots?: BridgeRoots | null): void;
  /** No bridge: the cached bar is no longer shown. */
  setAbsent(): void;
}

/** How long a newly arrived item stays lit (ms). */
export const FRESH_MS = 4000;

/** Keys in `next` that `prev` didn't have (nothing, without a `prev` to compare to). */
export function arrivedKeys(prev: BookmarkNode | null, next: BookmarkNode): Set<string> {
  if (!prev) return new Set();
  const before = indexTree(prev).items;
  return new Set([...indexTree(next).items.keys()].filter((k) => !before.has(k)));
}

/** Creates the bookmarks store, starting from the cached bar (or none). */
export function createBookmarksStore(kv: KV, cached: BookmarkNode | null) {
  let freshTimer: ReturnType<typeof setTimeout> | undefined;
  return createStore<BookmarksState>((set, get) => ({
    status: 'checking',
    bar: cached,
    bridgeVersion: null,
    features: [],
    roots: null,
    fresh: new Set(),
    setLive(bar, version, features = [], roots = null) {
      const same = get().bar !== null && canonicalJson(get().bar) === canonicalJson(bar);
      // What arrived since the bar we had (live, or the cached copy): lit for FRESH_MS.
      if (!same) {
        const arrived = arrivedKeys(get().bar, bar);
        if (arrived.size) {
          set({ fresh: arrived });
          clearTimeout(freshTimer);
          freshTimer = setTimeout(() => set({ fresh: new Set() }), FRESH_MS);
        }
      }
      // The same features keep the same array, so components reading it don't re-render.
      const sameFeatures = features.join() === get().features.join();
      const sameRoots = JSON.stringify(roots) === JSON.stringify(get().roots);
      set({ status: 'live', bar: same ? get().bar : bar, bridgeVersion: version, features: sameFeatures ? get().features : features, roots: sameRoots ? get().roots : roots });
      // The cache is only for drawing the next open quickly: a failed write costs nothing.
      if (!same) kv.set(KEYS.bookmarksCache, bar).catch(() => {});
    },
    setAbsent() {
      set({ status: 'absent', bar: null, bridgeVersion: null, features: [], roots: null });
    },
  }));
}
