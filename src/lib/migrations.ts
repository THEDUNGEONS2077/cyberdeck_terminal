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
import { type LayoutDocument, LAYOUT_SCHEMA_VERSION, defaultPrefs } from './layout';

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
 * Empty while version 1 is the only one.
 */
const STEPS: Record<number, (doc: Record<string, unknown>) => Record<string, unknown>> = {};

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
  const days = isRecord(doc.prefs) ? doc.prefs.backupReminderDays : undefined;
  if (typeof days === 'number' && Number.isInteger(days) && days >= 0 && days <= 365) prefs.backupReminderDays = days;

  return { schemaVersion: LAYOUT_SCHEMA_VERSION, wallpaper: doc.wallpaper, prefs };
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
