/**
 * src/store/persist.ts: loading the layout at startup, saving it, and
 * storing snapshots.
 *
 * Layer: store. Works through the KV interface (store/kv.ts), so tests run
 * it against memory.
 *
 * Startup reads only what it needs: the layout, the backup bookkeeping,
 * and the snapshots' index (not the snapshots themselves).
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
import { type LayoutDocument, defaultLayout, layoutFingerprint, summarizeLayout } from '@/lib/layout';
import { FutureSchemaError, migrateLayout } from '@/lib/migrations';
import { type BackupMeta, freshMeta } from '@/lib/reminder';
import { type Snapshot, type SnapshotInfo, type SnapshotReason, SNAPSHOT_REASONS, infoOf, makeSnapshot, pruneSnapshots, shouldSnapshot } from '@/lib/snapshots';

import { type KV, KEYS } from './kv';

/** Everything startup loads. */
export interface Boot {
  layout: LayoutDocument;
  meta: BackupMeta;
  /** The snapshots' index, newest first (the copies themselves stay in storage until restored). */
  snapshots: SnapshotInfo[];
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

/** Is this a usable snapshot index entry? */
function isInfo(v: unknown): v is SnapshotInfo {
  if (!v || typeof v !== 'object') return false;
  const i = v as Record<string, unknown>;
  return typeof i.at === 'number' && SNAPSHOT_REASONS.includes(i.reason as SnapshotReason) && typeof i.summary === 'string' && typeof i.fingerprint === 'string';
}

/** Reads one stored snapshot whole, checked and brought up to the current schema; null if it's gone or can't be read. */
async function readSnapshotAt(kv: KV, key: string): Promise<Snapshot | null> {
  const raw = (await kv.get(key)) as Partial<Snapshot> | undefined;
  if (!raw || typeof raw.at !== 'number') return null;
  try {
    const layout = migrateLayout(raw.layout).doc;
    const reason = SNAPSHOT_REASONS.includes(raw.reason as SnapshotReason) ? (raw.reason as SnapshotReason) : 'change';
    return { at: raw.at, reason, summary: typeof raw.summary === 'string' ? raw.summary : summarizeLayout(layout), fingerprint: layoutFingerprint(layout), layout };
  } catch {
    return null;
  }
}

/** Reads the snapshot taken at `at`, whole (to restore it); null if it's gone or can't be read. */
export function loadSnapshot(kv: KV, at: number): Promise<Snapshot | null> {
  return readSnapshotAt(kv, KEYS.snapshotPrefix + at);
}

/**
 * The snapshots' index, newest first, kept in step with what's stored
 * (`keys`: every storage key, if already read):
 *   - entries whose copy is gone are dropped;
 *   - copies the index doesn't list (snapshots from before the index
 *     existed, or a write cut short) are read once, checked, and added;
 *     a copy that can't be read is left in storage, not offered.
 * Only in those cases are copies read, and the index written back.
 */
export async function readSnapshotIndex(kv: KV, keys?: readonly string[]): Promise<SnapshotInfo[]> {
  const [allKeys, raw] = await Promise.all([keys ?? kv.keys(), kv.get(KEYS.snapshotIndex)]);
  const stored = new Set(allKeys.filter((k) => k.startsWith(KEYS.snapshotPrefix)));
  const listed = Array.isArray(raw) ? raw.filter(isInfo) : [];
  const index = listed.filter((i) => stored.has(KEYS.snapshotPrefix + i.at));
  let changed = !Array.isArray(raw) || index.length !== raw.length;
  const known = new Set(index.map((i) => KEYS.snapshotPrefix + i.at));
  for (const key of stored) {
    if (known.has(key)) continue;
    const snap = await readSnapshotAt(kv, key);
    if (!snap) continue;
    index.push(infoOf(snap));
    changed = true;
  }
  index.sort((a, b) => b.at - a.at);
  if (changed) await kv.set(KEYS.snapshotIndex, index);
  return index;
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
 * Stores a snapshot of `layout` if its content differs from the newest in
 * `index`, then deletes the copies pruning drops, and saves the index.
 * Returns the new index (newest first); a copy of `index` when nothing was stored.
 */
export async function storeSnapshot(kv: KV, index: readonly SnapshotInfo[], layout: LayoutDocument, reason: SnapshotReason, now: number): Promise<SnapshotInfo[]> {
  const fingerprint = layoutFingerprint(layout);
  if (!shouldSnapshot(index[0], fingerprint)) return [...index];
  // Never reuse a key: two snapshots in the same millisecond get the next free one.
  const at = Math.max(now, (index[0]?.at ?? 0) + 1);
  const snap = makeSnapshot(layout, reason, at, fingerprint);
  await kv.set(KEYS.snapshotPrefix + at, snap);
  const { keep, drop } = pruneSnapshots([infoOf(snap), ...index], now);
  await Promise.all(drop.map((s) => kv.del(KEYS.snapshotPrefix + s.at)));
  await kv.set(KEYS.snapshotIndex, keep);
  return keep;
}

/** Loads (or creates) everything the app needs to start. See the file header for the rules. */
export async function boot(kv: KV, now: number): Promise<Boot> {
  // Everything startup reads, asked for at once (one round of storage reads, not one after another).
  const [rawMeta, keys, raw] = await Promise.all([kv.get(KEYS.meta), kv.keys(), kv.get(KEYS.layout)]);

  // Backup bookkeeping: created on the first run.
  const meta = isMeta(rawMeta) ? rawMeta : freshMeta(now);
  if (meta !== rawMeta) await saveMeta(kv, meta);

  let snapshots = await readSnapshotIndex(kv, keys);
  let notice: string | null = null;
  let layout = defaultLayout();

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
