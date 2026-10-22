/**
 * src/store/idbKV.ts: the KV interface (store/kv.ts) on IndexedDB.
 *
 * Layer: store (browser storage). IndexedDB is the durable storage in a
 * browser: localStorage is small and can be cleared more readily.
 *
 * The database is this app's own (`cyberdeck_terminal`). quest_log_desktop
 * is served from the same origin (thedungeons2077.github.io), so both apps
 * can see the same storage area: they must never share a database name or
 * a localStorage key, or one could overwrite the other's data.
 */
import { createStore, del, get, keys, set, type UseStore } from 'idb-keyval';

import type { KV } from './kv';

/** This app's IndexedDB database and object store. Never quest_log_desktop's. */
const DB_NAME = 'cyberdeck_terminal';
const STORE_NAME = 'kv';

/** Opens (creating on first use) the app's IndexedDB store as a KV. */
export function idbKV(): KV {
  const store: UseStore = createStore(DB_NAME, STORE_NAME);
  return {
    get: (key) => get(key, store),
    set: (key, value) => set(key, value, store),
    del: (key) => del(key, store),
    keys: async () => (await keys(store)).map(String),
  };
}
