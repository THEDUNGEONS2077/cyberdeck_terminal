/**
 * src/lib/layout.ts: the layout document, everything about how the
 * dashboard is arranged that must survive (and be recoverable).
 *
 * Layer: pure lib (no React, no browser APIs).
 *
 * The whole layout is one versioned JSON document. Saving, snapshots and
 * backup files all store exactly this document, so any feature added to
 * it later (areas, folders, collapsed lists, bookmark sources) is backed
 * up and restorable from the day it lands. A shape change bumps
 * LAYOUT_SCHEMA_VERSION and adds a step in lib/migrations.ts.
 */

/** The current schema version of the layout document. */
export const LAYOUT_SCHEMA_VERSION = 1;

/** The wallpaper a new layout starts with (src/wallpaper/registry.ts lists them all). */
export const DEFAULT_WALLPAPER_ID = 'matrix-rain';

/** Backup reminder choices, in days (0 = never remind). */
export const REMINDER_DAY_CHOICES: readonly number[] = [0, 7, 14, 30, 90];

/** Preferences that belong to the layout (and so travel with its backups). */
export interface LayoutPrefs {
  /** Remind to export a backup when the last one is older than this many days; 0 turns it off. */
  backupReminderDays: number;
}

/** The layout document (schema version 1). */
export interface LayoutDocument {
  schemaVersion: typeof LAYOUT_SCHEMA_VERSION;
  /** The id of the wallpaper shown behind the dashboard. */
  wallpaper: string;
  prefs: LayoutPrefs;
}

/** Preferences a new layout starts with. */
export function defaultPrefs(): LayoutPrefs {
  return { backupReminderDays: 14 };
}

/** A new, empty layout. */
export function defaultLayout(): LayoutDocument {
  return { schemaVersion: LAYOUT_SCHEMA_VERSION, wallpaper: DEFAULT_WALLPAPER_ID, prefs: defaultPrefs() };
}

/**
 * JSON with object keys sorted, so two documents with the same content
 * always give the same text whatever order their keys were written in.
 * Used to tell whether a layout actually changed (snapshots skip copies).
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) => {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const sorted: Record<string, unknown> = {};
      for (const k of Object.keys(v).sort()) sorted[k] = (v as Record<string, unknown>)[k];
      return sorted;
    }
    return v;
  });
}

/** Do two layouts hold the same content? */
export function sameLayout(a: LayoutDocument, b: LayoutDocument): boolean {
  return canonicalJson(a) === canonicalJson(b);
}

/** Does the layout differ from a brand-new one (is there anything worth backing up)? */
export function hasCustomContent(doc: LayoutDocument): boolean {
  return !sameLayout(doc, defaultLayout());
}

/**
 * A one-line description of a layout for snapshot lists and import
 * previews, e.g. `WALLPAPER MATRIX-RAIN · REMIND 14D`. Later phases add
 * their counts at the front ("3 AREAS · 41 LINKS · …").
 */
export function summarizeLayout(doc: LayoutDocument): string {
  const remind = doc.prefs.backupReminderDays ? `REMIND ${doc.prefs.backupReminderDays}D` : 'REMIND OFF';
  return [`WALLPAPER ${doc.wallpaper.toUpperCase()}`, remind].join(' · ');
}
