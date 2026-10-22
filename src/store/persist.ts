/**
 * src/store/persist.ts: loading the layout at startup, saving it, and
 * storing snapshots.
 *
 * Layer: store. Works through the KV interface (store/kv.ts), so tests run
 * it against memory.
 *
 * Startup never loses data:
 *   - an older layout is migrated and saved back in the new shape;
 *   - a layout that can't be read is copied to `corrupt.<time>` first, and
 *     the app starts from a fresh layout with a notice pointing at RESTORE;
 *   - a layout from a newer version is also copied aside, but left in
 *     place (the newer version can still read it), and nothing overwrites
 *     it until the layout is changed here;
 *   - a snapshot is taken if the layout differs from the newest one.
 */
import { type LayoutDocument, defaultLayout } from '@/lib/layout';
import { FutureSchemaError, migrateLayout } from '@/lib/migrations';
import { type BackupMeta, freshMeta } from '@/lib/reminder';
import { type Snapshot, type SnapshotReason, makeSnapshot, pruneSnapshots, shouldSnapshot } from '@/lib/snapshots';

import { type KV, KEYS } from './kv';

/** Everything startup loads. */
export interface Boot {
  layout: LayoutDocument;
  meta: BackupMeta;
  /** Newest first. */
  snapshots: Snapshot[];
  /** A message for the user about the load (damaged data), or null. */
  notice: string | null;
}

/** The notice when the saved layout couldn't be read. */
export const NOTICE_DAMAGED = 'SAVED LAYOUT WAS DAMAGED · A COPY WAS KEPT · RESTORE ONE IN SYSTEM [S]';
/** The notice when the saved layout came from a newer version. */
export const NOTICE_NEWER = 'SAVED LAYOUT IS FROM A NEWER VERSION · RELOAD TO UPDATE';

/** Is this a usable BackupMeta? */
function isMeta(v: unknown): v is BackupMeta {
  if (!v || typeof v !== 'object') return false;
  const m = v as Record<string, unknown>;
  const timeOrNull = (x: unknown) => x === null || typeof x === 'number';
  return typeof m.firstRunAt === 'number' && timeOrNull(m.lastExportAt) && timeOrNull(m.snoozedUntil);
}

/**
 * Reads every stored snapshot, newest first. A snapshot whose layout no
 * longer reads (damaged) is skipped, not deleted: it's left for inspection.
 */
export async function readSnapshots(kv: KV): Promise<Snapshot[]> {
  const out: Snapshot[] = [];
  for (const key of await kv.keys()) {
    if (!key.startsWith(KEYS.snapshotPrefix)) continue;
    const raw = (await kv.get(key)) as Partial<Snapshot> | undefined;
    if (!raw || typeof raw.at !== 'number') continue;
    try {
      const layout = migrateLayout(raw.layout).doc;
      out.push({ at: raw.at, reason: raw.reason ?? 'change', summary: String(raw.summary ?? ''), layout });
    } catch {
      // Unreadable snapshot: leave it in storage, don't offer it.
    }
  }
  return out.sort((a, b) => b.at - a.at);
}

/** Saves the layout document. */
export function saveLayout(kv: KV, layout: LayoutDocument): Promise<void> {
  return kv.set(KEYS.layout, layout);
}

/** Saves the backup bookkeeping. */
export function saveMeta(kv: KV, meta: BackupMeta): Promise<void> {
  return kv.set(KEYS.meta, meta);
}

/**
 * Stores a snapshot of `layout` if it differs from the newest in `list`,
 * then deletes the ones pruning drops. Returns the new list (newest first);
 * `list` itself is returned unchanged when nothing was stored.
 */
export async function storeSnapshot(kv: KV, list: readonly Snapshot[], layout: LayoutDocument, reason: SnapshotReason, now: number): Promise<Snapshot[]> {
  if (!shouldSnapshot(list[0], layout)) return [...list];
  // Never reuse a key: two snapshots in the same millisecond get the next free one.
  const at = Math.max(now, (list[0]?.at ?? 0) + 1);
  const snap = makeSnapshot(layout, reason, at);
  await kv.set(KEYS.snapshotPrefix + at, snap);
  const { keep, drop } = pruneSnapshots([snap, ...list], now);
  await Promise.all(drop.map((s) => kv.del(KEYS.snapshotPrefix + s.at)));
  return keep;
}

/** Loads (or creates) everything the app needs to start. See the file header for the rules. */
export async function boot(kv: KV, now: number): Promise<Boot> {
  // Backup bookkeeping: created on the first run.
  const rawMeta = await kv.get(KEYS.meta);
  const meta = isMeta(rawMeta) ? rawMeta : freshMeta(now);
  if (meta !== rawMeta) await saveMeta(kv, meta);

  let snapshots = await readSnapshots(kv);
  let notice: string | null = null;
  let layout = defaultLayout();

  const raw = await kv.get(KEYS.layout);
  if (raw !== undefined) {
    try {
      const { doc, migrated } = migrateLayout(raw);
      layout = doc;
      if (migrated) await saveLayout(kv, doc);
    } catch (e) {
      // Keep the unreadable data before anything else happens to it.
      await kv.set(KEYS.corruptPrefix + now, raw);
      if (e instanceof FutureSchemaError) {
        notice = NOTICE_NEWER;
      } else {
        notice = NOTICE_DAMAGED;
        await saveLayout(kv, layout);
      }
    }
  }

  // The startup snapshot (only when the layout differs from the newest one;
  // not for a newer version's layout, which this one can't represent).
  if (notice !== NOTICE_NEWER) snapshots = await storeSnapshot(kv, snapshots, layout, 'startup', now);
  return { layout, meta, snapshots, notice };
}
