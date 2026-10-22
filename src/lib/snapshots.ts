/**
 * src/lib/snapshots.ts: the rules for automatic layout snapshots: when one
 * is worth taking, and which ones to keep.
 *
 * Layer: pure lib. store/persist.ts does the storing; this decides.
 *
 * Snapshots are safety copies kept in the browser. One is taken:
 *   - after the layout changes (once it has been still for CHANGE_DEBOUNCE_MS),
 *   - at startup (so each day the page is used has one),
 *   - right before an import or a restore replaces the layout, so that
 *     replacing can itself be undone;
 *   - when edit mode starts, so a whole editing session can be undone.
 * A snapshot identical to the newest one is never stored twice.
 */
import { formatStamp } from './backup';
import { type LayoutDocument, sameLayout, summarizeLayout } from './layout';

/** Why a snapshot was taken (shown in the RESTORE list). */
export type SnapshotReason = 'change' | 'startup' | 'before-import' | 'before-restore' | 'before-edit';

/** One saved copy of the layout. */
export interface Snapshot {
  /** When it was taken (epoch ms); also its identity. */
  at: number;
  reason: SnapshotReason;
  /** A one-line description of the layout (lib/layout.ts summarizeLayout). */
  summary: string;
  layout: LayoutDocument;
}

/** How long the layout must be still before a change is snapshotted. */
export const CHANGE_DEBOUNCE_MS = 30_000;
/** The newest snapshots kept, whatever their age. */
export const SNAPSHOT_KEEP = 20;
/** Days back for which the newest snapshot of each day is kept as well. */
export const DAILY_KEEP_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Builds a snapshot of `layout`. */
export function makeSnapshot(layout: LayoutDocument, reason: SnapshotReason, at: number): Snapshot {
  return { at, reason, summary: summarizeLayout(layout), layout };
}

/** Is `layout` worth a new snapshot, given the newest one (if any)? Only if it differs. */
export function shouldSnapshot(newest: Snapshot | undefined, layout: LayoutDocument): boolean {
  return !newest || !sameLayout(newest.layout, layout);
}

/** The local calendar day of a time, as `YYYY-MM-DD`. */
function dayOf(at: number): string {
  return formatStamp(at).slice(0, 10);
}

/**
 * Splits snapshots into those to keep and those to delete:
 *   - the SNAPSHOT_KEEP newest are kept;
 *   - so is the newest snapshot of each of the last DAILY_KEEP_DAYS days,
 *     so a burst of changes can never push out every copy from earlier
 *     in the week.
 * Both lists come back newest first.
 */
export function pruneSnapshots(snapshots: readonly Snapshot[], now: number): { keep: Snapshot[]; drop: Snapshot[] } {
  const sorted = [...snapshots].sort((a, b) => b.at - a.at);
  const keep = new Set(sorted.slice(0, SNAPSHOT_KEEP));
  // The newest of each recent day (sorted is newest first, so the first seen per day wins).
  const days = new Set<string>();
  for (const s of sorted) {
    if (now - s.at > DAILY_KEEP_DAYS * DAY_MS) continue;
    const day = dayOf(s.at);
    if (days.has(day)) continue;
    days.add(day);
    keep.add(s);
  }
  return { keep: sorted.filter((s) => keep.has(s)), drop: sorted.filter((s) => !keep.has(s)) };
}

/** The RESTORE list's label for a reason. */
export function reasonLabel(reason: SnapshotReason): string {
  switch (reason) {
    case 'change':
      return 'CHANGED';
    case 'startup':
      return 'OPENED';
    case 'before-import':
      return 'BEFORE IMPORT';
    case 'before-restore':
      return 'BEFORE RESTORE';
    case 'before-edit':
      return 'BEFORE EDIT';
  }
}
