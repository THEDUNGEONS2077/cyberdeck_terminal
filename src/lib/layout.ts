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
 *   4  + modules: SEARCH, QUICK LAUNCH, TIME panels you add (0.11.0)
 *   5  + a module's own sizes (modules[].sizes), and the CLOCK kind (0.18.0)
 *   6  a module's own UI SCALE and MODULE SIZE folded into one SIZE (sizes.scale; 0.19.0)
 */
import { DEFAULT_PALETTE, type PaletteId } from './palettes';
import { type Arrangement, type Panels, defaultPanels, emptyArrangement } from './arrange';
import { type BookmarkNode, countLinks } from './bookmarks';
import type { ModuleInstance } from './modules';
import { DEFAULT_MODULE_SCALE, DEFAULT_TEXT_SCALE, DEFAULT_UI_SCALE, percentLabel } from './scale';

/** The current schema version of the layout document. */
export const LAYOUT_SCHEMA_VERSION = 6;

/** The wallpaper a new layout starts with (src/wallpaper/registry.ts lists them all). */
export const DEFAULT_WALLPAPER_ID = 'matrix-rain';

/** How strongly the rain's glyphs glow (wallpaper/matrix-rain/params.ts GLOW). 'low' is the first look. */
export type GlowLevel = 'low' | 'medium' | 'high' | 'max';
/** The glow levels, weakest first. */
export const GLOW_LEVELS: readonly GlowLevel[] = ['low', 'medium', 'high', 'max'];
/** The glow a new layout starts with (and a layout from before 0.5.0 gets). */
export const DEFAULT_RAIN_GLOW: GlowLevel = 'high';

/** Backup reminder choices, in days (0 = never remind). */
export const REMINDER_DAY_CHOICES: readonly number[] = [0, 7, 14, 30, 90];

/**
 * The wallpaper zooms (1 = as designed), smallest first: Chrome's own zoom
 * levels from 50% to 200%, so + and − step as a browser's zoom does.
 * ZOOM lays the wallpaper out for a screen 1/zoom as big and draws it zoom
 * times as large (wallpaper/types.ts zoomedSize).
 */
export const ZOOM_STEPS: readonly number[] = [0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2];
/** A wallpaper's zoom until one is chosen for it. */
export const DEFAULT_ZOOM = 1;
/** Most wallpapers a layout keeps a zoom for (ids no longer known are kept too, up to this). */
export const MAX_ZOOMS = 32;

/** The zoom step nearest `zoom` (anything out of range comes back in it). */
export function nearestZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return DEFAULT_ZOOM;
  return ZOOM_STEPS.reduce((best, step) => (Math.abs(step - zoom) < Math.abs(best - zoom) ? step : best), DEFAULT_ZOOM);
}

/** The next zoom step in (`direction` 1) or out (-1) from `zoom`; at either end, the end. */
export function stepZoom(zoom: number, direction: 1 | -1): number {
  const at = ZOOM_STEPS.indexOf(nearestZoom(zoom));
  return ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, Math.max(0, at + direction))] ?? DEFAULT_ZOOM;
}

/** A zoom as the panel shows it: `125%`. */
export function zoomLabel(zoom: number): string {
  return `${Math.round(zoom * 100)}%`;
}

/**
 * A map of wallpaper zooms, checked: string ids (short ones), each zoom
 * snapped to a step, and the default left out (a wallpaper without an entry
 * shows at 100%), so a layout zoomed and set back is the same document as
 * before. Anything else is dropped.
 */
export function normalizeZooms(v: unknown): Record<string, number> {
  const zooms: Record<string, number> = {};
  if (!v || typeof v !== 'object' || Array.isArray(v)) return zooms;
  for (const [id, zoom] of Object.entries(v as Record<string, unknown>)) {
    if (Object.keys(zooms).length >= MAX_ZOOMS) break;
    if (!id || id.length > 64 || typeof zoom !== 'number' || !Number.isFinite(zoom)) continue;
    const step = nearestZoom(zoom);
    if (step !== DEFAULT_ZOOM) zooms[id] = step;
  }
  return zooms;
}

/** Wallpaper `id`'s zoom in a map of them. */
export function zoomOf(zooms: Readonly<Record<string, number>>, id: string): number {
  return zooms[id] ?? DEFAULT_ZOOM;
}

/** The map with wallpaper `id`'s zoom set (removed, if it's back to the default). */
export function withZoom(zooms: Readonly<Record<string, number>>, id: string, zoom: number): Record<string, number> {
  const next = { ...zooms };
  const step = nearestZoom(zoom);
  if (step === DEFAULT_ZOOM) delete next[id];
  else next[id] = step;
  return next;
}

/** Preferences that belong to the layout (and so travel with its backups). */
export interface LayoutPrefs {
  /** Remind to export a backup when the last one is older than this many days; 0 turns it off. */
  backupReminderDays: number;
  /** How strongly the rain glows. */
  rainGlow: GlowLevel;
  /** The dashboard's colour palette (lib/palettes.ts). */
  palette: PaletteId;
  /** The wallpaper's colour palette: chosen on its own, not tied to the dashboard's (user request, 2026-10-23). */
  wallpaperPalette: PaletteId;
  /**
   * Each wallpaper's zoom, by wallpaper id (user request, 2026-10-23): the
   * zoom it opens at. Only zooms other than 100% are kept (normalizeZooms).
   */
  wallpaperZoom: Record<string, number>;
  /**
   * The places whose links switch to their open tab (lib/switching.ts;
   * bridge 1.3+, 0.12.0): Chrome match patterns, sorted.
   */
  switchTabs: string[];
  /** UI SCALE: the whole dashboard's size, the wallpaper aside (lib/scale.ts UI_SCALE_STEPS; 0.17.0). */
  uiScale: number;
  /** TEXT SIZE: the text's size on top of UI SCALE (TEXT_SCALE_STEPS). */
  textScale: number;
  /** MODULE SIZE: the modules' size against the rest (MODULE_SCALE_STEPS). */
  moduleScale: number;
  /** Draw the dashboard at UI SCALE whatever Chrome's zoom (shared with quest_log_desktop) is: true; or let the zoom apply on top. */
  cancelBrowserZoom: boolean;
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

/** The layout document (schema version 4). */
export interface LayoutDocument {
  schemaVersion: typeof LAYOUT_SCHEMA_VERSION;
  /** The id of the wallpaper shown behind the dashboard. */
  wallpaper: string;
  prefs: LayoutPrefs;
  bookmarks: BookmarksLayout;
  /** Where NAV and the brand panel sit (null each = the default place). */
  panels: Panels;
  /** The modules you've added, bottom to top (lib/modules.ts). */
  modules: ModuleInstance[];
}

/** Most open folders remembered. */
export const MAX_OPEN_FOLDERS = 1000;

/** The bookmarks part of a new layout: nothing imported, every folder collapsed. */
export function defaultBookmarks(): BookmarksLayout {
  return { imported: null, importedAt: null, open: [], arrangement: emptyArrangement() };
}

/** Preferences a new layout starts with. */
export function defaultPrefs(): LayoutPrefs {
  return { backupReminderDays: 14, rainGlow: DEFAULT_RAIN_GLOW, palette: DEFAULT_PALETTE, wallpaperPalette: DEFAULT_PALETTE, wallpaperZoom: {}, switchTabs: [], uiScale: DEFAULT_UI_SCALE, textScale: DEFAULT_TEXT_SCALE, moduleScale: DEFAULT_MODULE_SCALE, cancelBrowserZoom: true };
}

/** A new, empty layout. */
export function defaultLayout(): LayoutDocument {
  return { schemaVersion: LAYOUT_SCHEMA_VERSION, wallpaper: DEFAULT_WALLPAPER_ID, prefs: defaultPrefs(), bookmarks: defaultBookmarks(), panels: defaultPanels(), modules: [] };
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
  if (doc.panels.brandOff) parts.push('NO BRAND PANEL');
  if (doc.modules.length) parts.push(`${doc.modules.length} MODULE${doc.modules.length === 1 ? '' : 'S'}`);
  if (imported) parts.push(`BAR COPY ${countLinks(imported)} LINKS`);
  if (open.length) parts.push(`${open.length} OPEN`);
  parts.push(`WALLPAPER ${doc.wallpaper.toUpperCase()}`);
  // The shown wallpaper's zoom, when it isn't 100%.
  const zoom = zoomOf(doc.prefs.wallpaperZoom, doc.wallpaper);
  if (zoom !== DEFAULT_ZOOM) parts.push(`ZOOM ${zoomLabel(zoom)}`);
  // The glow only when it isn't the default (keeps the usual summary short).
  if (doc.prefs.palette !== DEFAULT_PALETTE) parts.push(`COLOURS ${doc.prefs.palette.toUpperCase()}`);
  if (doc.prefs.wallpaperPalette !== DEFAULT_PALETTE) parts.push(`WALLPAPER COLOURS ${doc.prefs.wallpaperPalette.toUpperCase()}`);
  if (doc.prefs.rainGlow !== DEFAULT_RAIN_GLOW) parts.push(`GLOW ${doc.prefs.rainGlow.toUpperCase()}`);
  // The sizes, likewise only when chosen.
  if (doc.prefs.uiScale !== DEFAULT_UI_SCALE) parts.push(`UI ${percentLabel(doc.prefs.uiScale)}`);
  if (doc.prefs.textScale !== DEFAULT_TEXT_SCALE) parts.push(`TEXT ${percentLabel(doc.prefs.textScale)}`);
  if (doc.prefs.moduleScale !== DEFAULT_MODULE_SCALE) parts.push(`MODULES ${percentLabel(doc.prefs.moduleScale)}`);
  parts.push(doc.prefs.backupReminderDays ? `REMIND ${doc.prefs.backupReminderDays}D` : 'REMIND OFF');
  return parts.join(' · ');
}
