/**
 * src/lib/reminder.ts: when to remind about exporting a backup file, and
 * how to describe the last export's age.
 *
 * Layer: pure lib. Snapshots live in this browser, so they're lost along
 * with it (cleared site data, a new PC); only an exported file survives
 * that. The reminder nudges toward one when it's been a while.
 */

/** What the app remembers about backups (stored next to the layout, not in it). */
export interface BackupMeta {
  /** When a backup file was last exported (epoch ms), or null if never. */
  lastExportAt: number | null;
  /** The reminder stays quiet until then (after LATER). */
  snoozedUntil: number | null;
  /** When this browser first ran the app: a never-exported layout counts from here. */
  firstRunAt: number;
}

/** How long LATER keeps the reminder quiet. */
export const SNOOZE_MS = 3 * 24 * 60 * 60 * 1000;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Meta for a browser that has never run the app. */
export function freshMeta(now: number): BackupMeta {
  return { lastExportAt: null, snoozedUntil: null, firstRunAt: now };
}

/**
 * Should the reminder show now?
 *   - never when `days` is 0 (turned off) or the layout has nothing of its own yet;
 *   - never while snoozed;
 *   - otherwise once the last export (or, never exported, the first run)
 *     is more than `days` days ago.
 */
export function backupDue(meta: BackupMeta, days: number, hasContent: boolean, now: number): boolean {
  if (!days || !hasContent) return false;
  if (meta.snoozedUntil !== null && now < meta.snoozedUntil) return false;
  const since = meta.lastExportAt ?? meta.firstRunAt;
  return now - since > days * DAY_MS;
}

/** `NEVER`, `TODAY`, `1 DAY AGO`, `12 DAYS AGO`. */
export function exportAge(meta: BackupMeta, now: number): string {
  if (meta.lastExportAt === null) return 'NEVER';
  const days = Math.floor((now - meta.lastExportAt) / DAY_MS);
  if (days <= 0) return 'TODAY';
  return days === 1 ? '1 DAY AGO' : `${days} DAYS AGO`;
}
