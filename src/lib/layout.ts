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
 *
 * Versions:
 *   1  wallpaper, prefs (0.1.x)
 *   2  + bookmarks: an imported copy of the bookmarks bar, and which
 *      folders are open (0.2.0)
 *   3  + bookmarks.arrangement (your areas, order, hidden items) and
 *      panels (where NAV and the brand sit) (0.3.0)
 */
import { type Arrangement, type Panels, defaultPanels, emptyArrangement } from './arrange';
import { type BookmarkNode, countLinks } from './bookmarks';

/** The current schema version of the layout document. */
export const LAYOUT_SCHEMA_VERSION = 3;

/** The wallpaper a new layout starts with (src/wallpaper/registry.ts lists them all). */
export const DEFAULT_WALLPAPER_ID = 'matrix-rain';

/** Backup reminder choices, in days (0 = never remind). */
export const REMINDER_DAY_CHOICES: readonly number[] = [0, 7, 14, 30, 90];

/** Preferences that belong to the layout (and so travel with its backups). */
export interface LayoutPrefs {
  /** Remind to export a backup when the last one is older than this many days; 0 turns it off. */
  backupReminderDays: number;
}

/** The bookmarks part of the layout. */
export interface BookmarksLayout {
  /**
   * A copy of the bookmarks bar imported from bookmarks.html, or null.
   * Shown when the bridge extension isn't there (the bridge's live bar wins).
   */
  imported: BookmarkNode | null;
  /** When the copy was imported (epoch ms), or null. */
  importedAt: number | null;
  /** Folders shown open, by folderKey (lib/bookmarks.ts); every other folder is collapsed. Sorted. */
  open: string[];
  /** Your areas, order and hidden items (lib/arrange.ts). */
  arrangement: Arrangement;
}

/** The layout document (schema version 3). */
export interface LayoutDocument {
  schemaVersion: typeof LAYOUT_SCHEMA_VERSION;
  /** The id of the wallpaper shown behind the dashboard. */
  wallpaper: string;
  prefs: LayoutPrefs;
  bookmarks: BookmarksLayout;
  /** Where NAV and the brand panel sit (null each = the default place). */
  panels: Panels;
}

/** Most open folders remembered. */
export const MAX_OPEN_FOLDERS = 1000;

/** The bookmarks part of a new layout: nothing imported, every folder collapsed. */
export function defaultBookmarks(): BookmarksLayout {
  return { imported: null, importedAt: null, open: [], arrangement: emptyArrangement() };
}

/** Preferences a new layout starts with. */
export function defaultPrefs(): LayoutPrefs {
  return { backupReminderDays: 14 };
}

/** A new, empty layout. */
export function defaultLayout(): LayoutDocument {
  return { schemaVersion: LAYOUT_SCHEMA_VERSION, wallpaper: DEFAULT_WALLPAPER_ID, prefs: defaultPrefs(), bookmarks: defaultBookmarks(), panels: defaultPanels() };
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

/**
 * A short fingerprint of a text (cyrb53: a fast 53-bit hash). Two different
 * texts get the same one only by vanishing chance.
 */
export function hashText(text: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/**
 * A layout's content fingerprint (length + hash of its canonical JSON): the
 * same for the same content whatever the key order. Snapshots store it, so
 * "has the layout changed since the newest snapshot?" needs no copy of it.
 */
export function layoutFingerprint(doc: LayoutDocument): string {
  const json = canonicalJson(doc);
  return `${json.length.toString(36)}.${hashText(json)}`;
}

/** Does the layout differ from a brand-new one (is there anything worth backing up)? */
export function hasCustomContent(doc: LayoutDocument): boolean {
  return !sameLayout(doc, defaultLayout());
}

/**
 * A one-line description of a layout for snapshot lists and import
 * previews, e.g. `BAR COPY 41 LINKS · 2 OPEN · WALLPAPER MATRIX-RAIN · REMIND 14D`.
 * What's most likely to differ between snapshots comes first.
 */
export function summarizeLayout(doc: LayoutDocument): string {
  const parts: string[] = [];
  const { imported, open, arrangement } = doc.bookmarks;
  if (arrangement.areas.length) parts.push(`${arrangement.areas.length} AREA${arrangement.areas.length === 1 ? '' : 'S'}`);
  if (arrangement.order.length) parts.push('CUSTOM ORDER');
  if (arrangement.hidden.length) parts.push(`${arrangement.hidden.length} HIDDEN`);
  if (doc.panels.nav || doc.panels.brand) parts.push('PANELS MOVED');
  if (imported) parts.push(`BAR COPY ${countLinks(imported)} LINKS`);
  if (open.length) parts.push(`${open.length} OPEN`);
  parts.push(`WALLPAPER ${doc.wallpaper.toUpperCase()}`);
  parts.push(doc.prefs.backupReminderDays ? `REMIND ${doc.prefs.backupReminderDays}D` : 'REMIND OFF');
  return parts.join(' · ');
}
