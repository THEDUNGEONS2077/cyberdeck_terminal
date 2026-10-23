/**
 * src/app/useShownBar.ts: which bookmarks bar the dashboard shows, and
 * where it came from (the deck and the finder show the same one).
 *
 * Layer: UI (a hook over the bookmarks and layout stores).
 *   live      the bridge's bar
 *   cached    the bar cached from last time, while the bridge is asked
 *   imported  no bridge: the imported copy (layout.bookmarks.imported)
 * No bar (null) means the CONNECT prompt (or, briefly, nothing yet).
 */
import type { BookmarkNode } from '@/lib/bookmarks';

import { useBookmarks, useLayout } from './hooks';

/** Where the shown bar came from. */
export type BarSource = 'live' | 'cached' | 'imported';

/** The bar the dashboard shows now, its source, and the bridge's status. */
export function useShownBar(): { bar: BookmarkNode | null; source: BarSource; status: 'checking' | 'live' | 'absent' } {
  const status = useBookmarks((s) => s.status);
  const liveBar = useBookmarks((s) => s.bar);
  const imported = useLayout((s) => s.layout.bookmarks.imported);
  if (liveBar && status !== 'absent') return { bar: liveBar, source: status === 'live' ? 'live' : 'cached', status };
  return { bar: imported, source: 'imported', status };
}
