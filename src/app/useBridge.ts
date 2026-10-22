/**
 * src/app/useBridge.ts: keeps the bookmarks store in step with the bridge
 * extension while the page is open.
 *
 * Layer: UI (a React hook around src/bridge/client.ts). On open it asks
 * the bridge for its version and the bookmarks bar; after that it asks
 * again whenever the bridge says bookmarks changed, when its connection
 * comes back, when the page is shown again (another tab was in front), and
 * when its window gets the focus back (it may have been open, unfocused,
 * in another window while bookmarks changed).
 * No bridge on the page → the store says `absent` straight away.
 */
import { useEffect } from 'react';

import { bridgeInfo, bridgePossible, fetchBar, watchBridge } from '@/bridge/client';
import { bookmarksStore } from '@/store/instance';

/** Connects to the bridge while mounted. */
export function useBridge(): void {
  useEffect(() => {
    const store = bookmarksStore();
    if (!bridgePossible()) {
      store.getState().setAbsent();
      return;
    }
    let alive = true;
    // One request at a time; a change arriving mid-request asks once more after it.
    let busy = false;
    let again = false;
    const refresh = async () => {
      if (busy) {
        again = true;
        return;
      }
      busy = true;
      // `finally`: whatever happens, the next change can ask again (a stuck `busy` would ignore every later change).
      try {
        do {
          again = false;
          const info = await bridgeInfo();
          const got = info ? await fetchBar() : null;
          if (!alive) return;
          if (info && got) store.getState().setLive(got.bar, info.version, info.features, got.roots);
          else store.getState().setAbsent();
        } while (again && alive);
      } finally {
        busy = false;
      }
    };
    void refresh();
    const stop = watchBridge(() => void refresh());
    const onShow = () => {
      if (!document.hidden) void refresh();
    };
    document.addEventListener('visibilitychange', onShow);
    window.addEventListener('focus', onShow);
    return () => {
      alive = false;
      stop();
      document.removeEventListener('visibilitychange', onShow);
      window.removeEventListener('focus', onShow);
    };
  }, []);
}
