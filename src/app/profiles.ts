/**
 * src/app/profiles.ts: switching profiles from the page (SYSTEM ▸ PROFILES
 * and the finder), so both do it the same way.
 *
 * Layer: UI. Switching replaces the whole layout, so edit mode is locked
 * first (DONE): its UNDO steps belong to the layout being left. The store
 * (store/layout.ts switchProfile) snapshots and stores the open one.
 */
import { activeProfile } from '@/lib/profiles';
import { editStore } from '@/store/edit';
import { layoutStore } from '@/store/instance';
import { uiStore } from '@/store/ui';

/** Opens profile `id`, and says what happened. */
export async function switchToProfile(id: string): Promise<void> {
  const store = layoutStore();
  const name = store.getState().profiles.list.find((p) => p.id === id)?.name ?? 'PROFILE';
  if (editStore.getState().editing) editStore.getState().done();
  const from = activeProfile(store.getState().profiles).name;
  const ok = await store.getState().switchProfile(id);
  uiStore.getState().showToast(ok ? `PROFILE ${name} · ${from} SAVED` : `PROFILE ${name} COULDN’T BE READ · NOTHING CHANGED`);
}
