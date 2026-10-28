/**
 * src/lib/backup.ts: backup files: making one, naming it, and reading one
 * back with a plain-language error for anything that can't be used.
 *
 * Layer: pure lib. Same shape as quest_log_desktop's backups (format,
 * version, exportedAt, app, then the data). The file is saved wherever the
 * user likes; the app never sends it anywhere.
 *
 * Accepted on import: a cyberdeck_terminal backup file, or a bare layout
 * document (for example one copied out of a snapshot).
 *
 * Profiles (0.21.0): a backup also holds the open profile's name
 * (`profile`) and every other profile (`profiles`: name and layout). Both
 * are optional, so the wrapper's version stays 1: a file from before has
 * neither (and reads as it always did), and an older app reading a newer
 * file simply ignores them. A profile in the file that can't be read is
 * left out; the rest still import.
 */
import type { LayoutDocument } from './layout';
import type { ProfileCopy } from './profiles';
import { FutureSchemaError, migrateLayout } from './migrations';

/** Identifies a cyberdeck_terminal backup file. */
export const BACKUP_FORMAT = 'cyberdeck_terminal-backup';
/** Version of the file's wrapper (the layout inside has its own schemaVersion). */
export const BACKUP_VERSION = 1;
/**
 * Largest file accepted. A layout is a few kilobytes (a few hundred with a
 * huge imported bar), and a file holds up to 12 profiles; anything near
 * this is not a backup.
 */
export const BACKUP_MAX_BYTES = 20 * 1024 * 1024;

/** Which build of the app made a backup. */
export interface AppInfo {
  version: string;
  build: number;
}

/** A backup file's contents. */
export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: number;
  /** When it was made (epoch ms). */
  exportedAt: number;
  app: AppInfo;
  layout: LayoutDocument;
  /** The open profile's name (0.21.0; missing in older files). */
  profile?: string;
  /** Every other profile (0.21.0; missing in older files). */
  profiles?: ProfileCopy[];
}

/** A backup that read cleanly, ready to preview and import. */
export interface ParsedBackup {
  layout: LayoutDocument;
  /** When it was made, if the file says (bare documents don't). */
  exportedAt: number | null;
  /** The open profile's name when it was made, if the file says. */
  profile: string | null;
  /** Its other profiles that could be read (none in older files). */
  profiles: ProfileCopy[];
}

/** A backup that can't be used; `message` is shown to the user as is. */
export class BackupError extends Error {}

/** Builds a backup of `layout` (the open profile's, named `profile`), with the `others`. */
export function makeBackup(layout: LayoutDocument, now: number, app: AppInfo, profile?: string, others: readonly ProfileCopy[] = []): BackupFile {
  const file: BackupFile = { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: now, app, layout };
  if (profile !== undefined) file.profile = profile;
  if (others.length) file.profiles = others.map((p) => ({ name: p.name, layout: p.layout }));
  return file;
}

/** A file's other profiles: each read like the layout; one that can't be read (or a newer version's) is left out. */
function readProfiles(v: unknown): ProfileCopy[] {
  if (!Array.isArray(v)) return [];
  const out: ProfileCopy[] = [];
  for (const p of v) {
    if (!p || typeof p !== 'object' || typeof (p as Record<string, unknown>).name !== 'string') continue;
    try {
      out.push({ name: (p as { name: string }).name, layout: migrateLayout((p as Record<string, unknown>).layout).doc });
    } catch {
      // Damaged: skipped, the rest still import.
    }
  }
  return out;
}

/** Two digits, for dates in names. */
const pad = (n: number) => String(n).padStart(2, '0');

/** `cyberdeck_terminal-backup-2026-10-22-1430.json` (local time, so the names sort by date). */
export function backupFileName(now: number): string {
  const d = new Date(now);
  return `cyberdeck_terminal-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.json`;
}

/** `2026-10-22 14:30` (local time), for previews and snapshot lists. */
export function formatStamp(at: number): string {
  const d = new Date(at);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Throws a BackupError when a file is too big to be a backup. */
export function checkBackupSize(bytes: number): void {
  if (bytes > BACKUP_MAX_BYTES) throw new BackupError('That file is too big to be a cyberdeck_terminal backup.');
}

/** Migrates and validates a layout from a file, translating failures into messages. */
function readLayout(data: unknown): LayoutDocument {
  try {
    return migrateLayout(data).doc;
  } catch (e) {
    if (e instanceof FutureSchemaError) throw new BackupError('This backup is from a newer cyberdeck_terminal. Reload the page to update, then try again.');
    throw new BackupError('This backup is damaged or incomplete, so it can’t be used.');
  }
}

/** Reads a backup file's text. Throws BackupError with a message for the user. */
export function parseBackup(text: string): ParsedBackup {
  checkBackupSize(text.length);
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BackupError('That file isn’t a cyberdeck_terminal backup (it isn’t valid JSON).');
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new BackupError('That file isn’t a cyberdeck_terminal backup.');
  const file = data as Record<string, unknown>;

  // A backup file: check the wrapper, then read the layout inside.
  if (file.format === BACKUP_FORMAT) {
    if (typeof file.version !== 'number' || file.version > BACKUP_VERSION) {
      throw new BackupError('This backup is from a newer cyberdeck_terminal. Reload the page to update, then try again.');
    }
    return {
      layout: readLayout(file.layout),
      exportedAt: typeof file.exportedAt === 'number' ? file.exportedAt : null,
      profile: typeof file.profile === 'string' ? file.profile : null,
      profiles: readProfiles(file.profiles),
    };
  }
  // A bare layout document.
  if ('schemaVersion' in file && 'wallpaper' in file) return { layout: readLayout(file), exportedAt: null, profile: null, profiles: [] };
  throw new BackupError('That file isn’t a cyberdeck_terminal backup.');
}
