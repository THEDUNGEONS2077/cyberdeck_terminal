/**
 * src/lib/migrations.ts: brings any saved layout up to the current schema,
 * repairs what it safely can, and validates the result.
 *
 * Layer: pure lib. Used by startup (store/persist.ts), by snapshot restore
 * and by backup import (lib/backup.ts), so every way a layout comes back
 * in goes through the same checks.
 *
 * Adding a schema version:
 *   1. bump LAYOUT_SCHEMA_VERSION in lib/layout.ts and change the types;
 *   2. add `STEPS[n]`, turning a version-n document into version n+1;
 *   3. add a fixture test with a real version-n document.
 */
import { type Arrangement, type Area, type PanelPlace, type Panels, MAX_AREAS, cleanTitle, clampPlace, defaultPanels, emptyArrangement } from './arrange';
import { sanitizeTree } from './bookmarks';
import { type BookmarksLayout, type GlowLevel, type LayoutDocument, GLOW_LEVELS, LAYOUT_SCHEMA_VERSION, MAX_OPEN_FOLDERS, defaultBookmarks, defaultPrefs } from './layout';
import { PALETTE_IDS, type PaletteId } from './palettes';

/** The document was written by a newer version of the app than this one. */
export class FutureSchemaError extends Error {}

/** The document is damaged or isn't a layout at all. */
export class InvalidLayoutError extends Error {}

/** A plain object (not null, not an array)? */
function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

/**
 * Migration steps: STEPS[n] turns a version-n document into version n+1.
 *   1 → 2: bookmarks arrive (nothing imported, every folder collapsed).
 *   2 → 3: an empty arrangement (Chrome's order, no areas), panels in place.
 */
const STEPS: Record<number, (doc: Record<string, unknown>) => Record<string, unknown>> = {
  1: (doc) => ({ ...doc, bookmarks: { imported: null, importedAt: null, open: [] } }),
  2: (doc) => ({ ...doc, bookmarks: { ...(isRecord(doc.bookmarks) ? doc.bookmarks : {}), arrangement: emptyArrangement() }, panels: defaultPanels() }),
};

/** Strings only, each once, at most `max`. */
function stringList(v: unknown, max = 5000): string[] {
  return Array.isArray(v) ? [...new Set(v.filter((k): k is string => typeof k === 'string'))].slice(0, max) : [];
}

/** The arrangement, checked: anything malformed is dropped piece by piece (never the whole layout). */
function normalizeArrangement(v: unknown): Arrangement {
  if (!isRecord(v)) return emptyArrangement();
  const ids = new Set<string>();
  const areas: Area[] = [];
  for (const a of Array.isArray(v.areas) ? v.areas.slice(0, MAX_AREAS) : []) {
    if (!isRecord(a) || typeof a.id !== 'string' || !a.id || ids.has(a.id)) continue;
    ids.add(a.id);
    areas.push({ id: a.id, title: cleanTitle(typeof a.title === 'string' ? a.title : ''), items: stringList(a.items), collapsed: a.collapsed === true });
  }
  return { order: stringList(v.order), areas, hidden: stringList(v.hidden) };
}

/** A panel place, checked and clamped; null when missing or malformed. */
function normalizePlace(v: unknown): PanelPlace | null {
  if (!isRecord(v) || typeof v.x !== 'number' || typeof v.y !== 'number') return null;
  return clampPlace({ x: v.x, y: v.y, w: typeof v.w === 'number' ? v.w : undefined });
}

/** Where the panels sit, checked. */
function normalizePanels(v: unknown): Panels {
  if (!isRecord(v)) return defaultPanels();
  const brand = normalizePlace(v.brand);
  // The brand panel has no width.
  if (brand) delete brand.w;
  return { nav: normalizePlace(v.nav), brand };
}

/**
 * The bookmarks part, checked: the imported tree goes through sanitizeTree
 * (a damaged tree is dropped rather than failing the whole layout), and
 * the open folders are kept as sorted, unique strings.
 */
function normalizeBookmarks(v: unknown): BookmarksLayout {
  if (v === undefined) return defaultBookmarks();
  if (!isRecord(v)) throw new InvalidLayoutError('bookmarks is not an object');
  const imported = v.imported === null || v.imported === undefined ? null : sanitizeTree(v.imported);
  const importedAt = imported && typeof v.importedAt === 'number' ? v.importedAt : null;
  const open = Array.isArray(v.open) ? [...new Set(v.open.filter((k): k is string => typeof k === 'string'))].sort().slice(0, MAX_OPEN_FOLDERS) : [];
  return { imported, importedAt, open, arrangement: normalizeArrangement(v.arrangement) };
}

/**
 * Validates a current-version document and returns a clean copy of it.
 * Missing preferences are filled from the defaults (a repair, not an
 * error); fields this version doesn't know are dropped. Throws
 * InvalidLayoutError when something required is missing or wrong.
 */
export function normalizeLayout(doc: Record<string, unknown>): LayoutDocument {
  if (doc.schemaVersion !== LAYOUT_SCHEMA_VERSION) throw new InvalidLayoutError('wrong schema version');
  if (typeof doc.wallpaper !== 'string' || !doc.wallpaper.trim()) throw new InvalidLayoutError('no wallpaper');

  // Preferences: anything missing or out of range falls back to its default.
  const prefs = defaultPrefs();
  if (doc.prefs !== undefined && !isRecord(doc.prefs)) throw new InvalidLayoutError('prefs is not an object');
  const saved = isRecord(doc.prefs) ? doc.prefs : {};
  const days = saved.backupReminderDays;
  if (typeof days === 'number' && Number.isInteger(days) && days >= 0 && days <= 365) prefs.backupReminderDays = days;
  // The rain's glow (added in 0.5.0, no schema bump: an older layout simply gets the default).
  if (GLOW_LEVELS.includes(saved.rainGlow as GlowLevel)) prefs.rainGlow = saved.rainGlow as GlowLevel;
  // The palette (added in 0.6.0, the same way).
  if (PALETTE_IDS.includes(saved.palette as PaletteId)) prefs.palette = saved.palette as PaletteId;

  return { schemaVersion: LAYOUT_SCHEMA_VERSION, wallpaper: doc.wallpaper, prefs, bookmarks: normalizeBookmarks(doc.bookmarks), panels: normalizePanels(doc.panels) };
}

/**
 * Migrates `data` (anything read from storage or a file) to the current
 * schema, then normalizes it. Returns the document and whether it changed
 * version (so startup can save the upgraded copy).
 * Throws FutureSchemaError or InvalidLayoutError.
 */
export function migrateLayout(data: unknown): { doc: LayoutDocument; migrated: boolean } {
  if (!isRecord(data)) throw new InvalidLayoutError('not an object');
  const from = data.schemaVersion;
  if (typeof from !== 'number' || !Number.isInteger(from) || from < 1) throw new InvalidLayoutError('no schema version');
  if (from > LAYOUT_SCHEMA_VERSION) throw new FutureSchemaError(`schema ${from} is newer than ${LAYOUT_SCHEMA_VERSION}`);

  // Run each step in turn, from the document's version up to the current one.
  let doc = data;
  for (let v = from; v < LAYOUT_SCHEMA_VERSION; v++) {
    const step = STEPS[v];
    if (!step) throw new InvalidLayoutError(`no migration from schema ${v}`);
    doc = { ...step(doc), schemaVersion: v + 1 };
  }
  return { doc: normalizeLayout(doc), migrated: from !== LAYOUT_SCHEMA_VERSION };
}
