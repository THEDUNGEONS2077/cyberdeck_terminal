/**
 * src/lib/profiles.ts: layout profiles (C9, 0.21.0): whole layouts with
 * names, switched by hand (SYSTEM ▸ PROFILES, or the finder).
 *
 * Layer: pure lib. store/layout.ts and store/persist.ts do the storing;
 * these are the rules for the list.
 *
 * A profile is a whole layout document: the bookmarks' arrangement, panels,
 * modules and their sizes, the wallpaper, its zooms, the colours and the
 * dashboard's sizes. The open profile's layout is the layout (`layout.v1`),
 * so everything that saves, snapshots and backs it up works as it always
 * has; each other profile is a stored copy (`profile.<id>`). The list
 * (`ProfileIndex`) names them and says which is open. Until a second
 * profile is saved, there's one, MAIN, and nothing extra is stored.
 */
import { type LayoutDocument, layoutFingerprint } from './layout';

/** One profile in the list. */
export interface ProfileEntry {
  /** Its storage id (never shown). */
  id: string;
  /** Its name, as shown: upper case, trimmed (`cleanProfileName`). */
  name: string;
}

/** The profiles, in the order they were made, and which one is open. */
export interface ProfileIndex {
  active: string;
  list: ProfileEntry[];
}

/** A profile carried in a backup file: its name and layout. */
export interface ProfileCopy {
  name: string;
  layout: LayoutDocument;
}

/** The most profiles kept (each is a whole layout, a few KB to a few hundred). */
export const MAX_PROFILES = 12;
/** The longest name. */
export const MAX_PROFILE_NAME = 24;
/** The first profile's name, and its id, before any other is saved. */
export const FIRST_PROFILE: ProfileEntry = { id: 'main', name: 'MAIN' };

/** The list before any profile is saved: MAIN, open. */
export function defaultProfiles(): ProfileIndex {
  return { active: FIRST_PROFILE.id, list: [{ ...FIRST_PROFILE }] };
}

/** A name: spaces collapsed, trimmed, capped, upper case (the terminal look), never empty. */
export function cleanProfileName(name: string): string {
  return name.replace(/\s+/g, ' ').trim().slice(0, MAX_PROFILE_NAME).trim().toUpperCase() || 'PROFILE';
}

/** Is `name` (cleaned) another profile's name already? */
export function nameTaken(index: ProfileIndex, name: string, exceptId?: string): boolean {
  const clean = cleanProfileName(name);
  return index.list.some((p) => p.id !== exceptId && p.name === clean);
}

/** `name` cleaned, or with ` 2`, ` 3`… after it when another profile has it. */
export function uniqueName(index: ProfileIndex, name: string): string {
  const base = cleanProfileName(name);
  if (!nameTaken(index, base)) return base;
  for (let n = 2; ; n++) {
    const suffix = ` ${n}`;
    const candidate = base.slice(0, MAX_PROFILE_NAME - suffix.length).trim() + suffix;
    if (!nameTaken(index, candidate)) return candidate;
  }
}

/** A new profile's id: the time and a random tail (base 36), never one in `index`. */
export function newProfileId(index: ProfileIndex, now: number, random: number): string {
  let id = `p${now.toString(36)}${Math.floor(random * 36 ** 4).toString(36)}`;
  while (index.list.some((p) => p.id === id)) id += '0';
  return id;
}

/** Adds a profile (at the end), opening it when `open`. Unchanged at MAX_PROFILES. */
export function addProfile(index: ProfileIndex, entry: ProfileEntry, open: boolean): ProfileIndex {
  if (index.list.length >= MAX_PROFILES) return index;
  return { active: open ? entry.id : index.active, list: [...index.list, entry] };
}

/** Renames profile `id` (to a free, clean name). */
export function renameProfile(index: ProfileIndex, id: string, name: string): ProfileIndex {
  const current = index.list.find((p) => p.id === id);
  if (!current) return index;
  const clean = cleanProfileName(name);
  if (clean === current.name) return index;
  const free = nameTaken(index, clean, id) ? uniqueName(index, clean) : clean;
  return { ...index, list: index.list.map((p) => (p.id === id ? { ...p, name: free } : p)) };
}

/** Removes profile `id`; the open one can't be removed. */
export function removeProfile(index: ProfileIndex, id: string): ProfileIndex {
  if (id === index.active) return index;
  return { ...index, list: index.list.filter((p) => p.id !== id) };
}

/** Opens profile `id` (in the list). */
export function openProfile(index: ProfileIndex, id: string): ProfileIndex {
  return index.list.some((p) => p.id === id) ? { ...index, active: id } : index;
}

/** The open profile's entry. */
export function activeProfile(index: ProfileIndex): ProfileEntry {
  return index.list.find((p) => p.id === index.active) ?? index.list[0] ?? { ...FIRST_PROFILE };
}

/** A plain object (not null, not an array)? */
function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

/**
 * The list read from storage, checked: entries without a usable id are
 * dropped, names cleaned and kept unique, at most MAX_PROFILES. `stored`
 * says whether a profile's copy exists: one that doesn't (other than the
 * open one, whose layout is the layout) is dropped. Missing or unreadable,
 * the list is MAIN alone, open.
 */
export function normalizeProfiles(v: unknown, stored: (id: string) => boolean): ProfileIndex {
  if (!isRecord(v) || !Array.isArray(v.list) || typeof v.active !== 'string') return defaultProfiles();
  const active = v.active;
  let index: ProfileIndex = { active, list: [] };
  for (const e of v.list) {
    if (index.list.length >= MAX_PROFILES) break;
    if (!isRecord(e) || typeof e.id !== 'string' || !/^[a-z0-9]{1,40}$/.test(e.id) || index.list.some((p) => p.id === e.id)) continue;
    if (e.id !== active && !stored(e.id)) continue;
    index = { ...index, list: [...index.list, { id: e.id, name: uniqueName(index, typeof e.name === 'string' ? e.name : '') }] };
  }
  // The open one must be listed; if it isn't, MAIN stands in for it.
  if (!index.list.some((p) => p.id === active)) {
    index = { active: FIRST_PROFILE.id, list: [{ id: FIRST_PROFILE.id, name: uniqueName({ ...index, active: FIRST_PROFILE.id }, FIRST_PROFILE.name) }, ...index.list.filter((p) => p.id !== FIRST_PROFILE.id)].slice(0, MAX_PROFILES) };
  }
  return index;
}

/**
 * Which of a backup's profiles to add on import: those whose layout isn't
 * already one here (by content: `have` are the fingerprints of every
 * profile's layout here, the imported layout included), each with a free
 * name, as many as there's room for. Importing never removes a profile.
 */
export function profilesToAdd(index: ProfileIndex, copies: readonly ProfileCopy[], have: readonly string[]): ProfileCopy[] {
  const seen = new Set(have);
  const out: ProfileCopy[] = [];
  let names = index;
  for (const copy of copies) {
    if (names.list.length >= MAX_PROFILES) break;
    const print = layoutFingerprint(copy.layout);
    if (seen.has(print)) continue;
    seen.add(print);
    const name = uniqueName(names, copy.name);
    // Count the name as taken for the copies after it (the id here is only a placeholder).
    names = { ...names, list: [...names.list, { id: `import${out.length}`, name }] };
    out.push({ name, layout: copy.layout });
  }
  return out;
}
