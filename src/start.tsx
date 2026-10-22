/**
 * src/start.tsx: the app's startup: storage, then the page.
 *
 * Layer: entry point (second stage). main.tsx has already started the
 * wallpaper and loads this module in parallel. It loads the saved layout before the first render
 * (store/persist.ts boot), so the page never flashes a default layout.
 * If the browser blocks storage (some privacy settings), the page still
 * runs from memory and says that changes won't be kept.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app/App';
import { sanitizeTree } from './lib/bookmarks';
import { createBookmarksStore } from './store/bookmarks';
import { idbKV } from './store/idbKV';
import { createLayoutStore } from './store/layout';
import { type KV, KEYS, memoryKV } from './store/kv';
import { type Boot, boot } from './store/persist';
import { setBookmarksStore, setLayoutStore } from './store/instance';
import { uiStore } from './store/ui';

/** The notice when storage can't be used at all. */
const NOTICE_NO_STORAGE = 'BROWSER STORAGE IS BLOCKED · CHANGES WON’T BE KEPT';

// Storage: IndexedDB, or memory if the browser refuses it.
let kv: KV = idbKV();
let booted: Boot;
try {
  booted = await boot(kv, Date.now());
} catch (e) {
  console.error('storage unavailable', e);
  kv = memoryKV();
  booted = { ...(await boot(kv, Date.now())), notice: NOTICE_NO_STORAGE };
}

const store = createLayoutStore(kv, booted, (e) => {
  console.error('save failed', e);
  uiStore.getState().showToast('COULDN’T SAVE THE LAYOUT · EXPORT A BACKUP FROM SYSTEM [S]', { sticky: true });
});
setLayoutStore(store);

// The bridge's last bookmarks bar, drawn at once while the bridge is asked again (app/useBridge.ts).
const cachedBar = sanitizeTree(await kv.get(KEYS.bookmarksCache).catch(() => null));
setBookmarksStore(createBookmarksStore(kv, cachedBar));
if (booted.notice) uiStore.getState().showToast(booted.notice, { sticky: true });

// Leaving the page: take a pending change snapshot now rather than lose it.
window.addEventListener('pagehide', () => void store.getState().flushSnapshot());

// A handle for the browser tests (e2e/walk.mjs): wait for storage, take a pending snapshot.
(window as unknown as { __cyberdeck: object }).__cyberdeck = {
  settled: () => store.getState().settled(),
  flushSnapshot: () => store.getState().flushSnapshot(),
};

// The service worker (production builds only): opens instantly, works offline.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
