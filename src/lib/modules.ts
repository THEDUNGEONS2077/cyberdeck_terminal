/**
 * src/lib/modules.ts: the dashboard's modules: panels you add, place and
 * size yourself, beside NAV and the brand panel (SEARCH, QUICK LAUNCH, TIME,
 * CLOCK, COUNTDOWN).
 *
 * Layer: pure lib. The modules live in the layout document (since schema 4), so
 * they're saved, snapshotted, backed up and restored with everything else.
 * Each kind's settings have their own rules (lib/search.ts, lib/launch.ts,
 * lib/time.ts, lib/clock.ts, lib/countdown.ts); here are the list's: adding one at a free spot, moving,
 * resizing, removing, and checking a list read from storage or a file
 * (unknown kinds and malformed entries are dropped one by one, never the
 * whole layout).
 *
 * Every module can also have its own sizes: a SIZE and a TEXT SIZE of its
 * own, each replacing the dashboard's for that module alone (`ModuleSizes`,
 * `moduleScaleOf`, `moduleTextOf`). 0.18.0 (schema 5) had three, UI SCALE,
 * TEXT SIZE and MODULE SIZE, but its UI SCALE and MODULE SIZE both just made
 * the module bigger: 0.19.0 (schema 6) folds them into one SIZE.
 *
 * The page knows how each kind looks from app/modules/catalog.ts.
 */
import { type PanelPlace, type WidthLimits, clampPlace } from './arrange';
import { type ClockSettings, defaultClock, normalizeClock } from './clock';
import { type CountdownSettings, defaultCountdown, normalizeCountdown } from './countdown';
import { type LaunchSettings, defaultLaunch, normalizeLaunch } from './launch';
import { type SearchSettings, defaultSearch, normalizeSearch } from './search';
import { type TimeSettings, defaultTime, normalizeTime } from './time';
import { MODULE_OWN_STEPS, TEXT_SCALE_STEPS, nearestStep } from './scale';

/** The kinds of module. */
export type ModuleKind = 'search' | 'launch' | 'time' | 'clock' | 'countdown';
/** Every kind, in the order the + MODULE menu lists them. */
export const MODULE_KINDS: readonly ModuleKind[] = ['search', 'launch', 'time', 'clock', 'countdown'];

/**
 * A module's own sizes (0.19.0, schema 6). Each one that's set (OWN) replaces
 * the dashboard's for this module alone; one that's missing (DASHBOARD)
 * follows the dashboard's (SYSTEM ▸ APPEARANCE). Values are steps of
 * lib/scale.ts.
 */
export interface ModuleSizes {
  /** SIZE: how big it's drawn against the UI, instead of the dashboard's MODULE SIZE (MODULE_OWN_STEPS). */
  scale?: number;
  /** TEXT SIZE: its text, instead of the dashboard's TEXT SIZE (TEXT_SCALE_STEPS). */
  textScale?: number;
}

/** A module of one kind: its id, where it sits (always placed: it has no usual spot), and its settings. */
interface Module<K extends ModuleKind, S> {
  id: string;
  kind: K;
  place: PanelPlace;
  settings: S;
  /** Its own sizes; missing (the usual case) follows the dashboard's. */
  sizes?: ModuleSizes;
  /**
   * SHOW TITLE (0.27.0): its `> NAME` bar outside edit mode, when it isn't
   * its kind's usual (app/modules/catalog.ts `bare`: SEARCH, QUICK LAUNCH and
   * CLOCK show none; the others do). Missing: the kind's usual. No schema
   * bump: it's additive, and an older build drops it, showing the usual.
   */
  title?: boolean;
}

/** A module on the dashboard. */
export type ModuleInstance = Module<'search', SearchSettings> | Module<'launch', LaunchSettings> | Module<'time', TimeSettings> | Module<'clock', ClockSettings> | Module<'countdown', CountdownSettings>;

/** The module of kind `K`. */
export type ModuleOf<K extends ModuleKind> = Extract<ModuleInstance, { kind: K }>;

/** How big a module is drawn until MODULE SIZE is chosen (defined in lib/scale.ts, kept here for the modules' code). */
export { MODULE_SCALE } from './scale';

/** Most modules on one dashboard. */
export const MAX_MODULES = 12;
/** How narrow and how wide a module can be (px). */
export const MODULE_WIDTH: WidthLimits = { min: 240, max: 1200 };
/** Each kind's width when it's added (px): narrow enough to sit beside NAV on a 1920 px screen (NAV is at most 1120 wide, centred). */
export const MODULE_DEFAULT_W: Record<ModuleKind, number> = { search: 380, launch: 380, time: 320, clock: 420, countdown: 420 };

/**
 * The spots a new module tries, in turn: down the right-hand side (top
 * right is otherwise empty; the key hints are bottom right). x is a share
 * of the window: app.css keeps the panel on screen, so 0.95 means "against
 * the right edge" whatever its width.
 */
const SPOTS: readonly PanelPlace[] = [0.02, 0.22, 0.42, 0.62].map((y) => ({ x: 0.95, y }));

/** A new module's id: `m` + time + a little chance, unique enough for one person's modules, short to store. */
export function newModuleId(now: number = Date.now(), chance: number = Math.random()): string {
  return `m${now.toString(36)}${Math.floor(chance * 1296).toString(36)}`;
}

/** Is `id` a module's (and so not NAV's or the brand panel's)? */
export function isModuleId(id: string): boolean {
  return /^m[a-z0-9]{1,24}$/.test(id);
}

/** The first spot no module sits near yet (the first spot when every one is taken). */
function freeSpot(modules: readonly ModuleInstance[]): PanelPlace {
  const near = (a: PanelPlace, b: PanelPlace) => Math.abs(a.x - b.x) < 0.1 && Math.abs(a.y - b.y) < 0.1;
  return SPOTS.find((spot) => !modules.some((m) => near(m.place, spot))) ?? SPOTS[0]!;
}

/** A new module of `kind` with its default settings, at a free spot. */
export function newModule(kind: ModuleKind, id: string, modules: readonly ModuleInstance[]): ModuleInstance {
  const place = { ...freeSpot(modules), w: MODULE_DEFAULT_W[kind] };
  switch (kind) {
    case 'search':
      return { id, kind, place, settings: defaultSearch() };
    case 'launch':
      return { id, kind, place, settings: defaultLaunch() };
    case 'time':
      return { id, kind, place, settings: defaultTime() };
    case 'clock':
      return { id, kind, place, settings: defaultClock() };
    case 'countdown':
      return { id, kind, place, settings: defaultCountdown() };
  }
}

/** Adds `module` at the end (on top); unchanged when the dashboard is full or the id is taken. */
export function addModule(modules: readonly ModuleInstance[], module: ModuleInstance): ModuleInstance[] {
  if (modules.length >= MAX_MODULES || modules.some((m) => m.id === module.id)) return [...modules];
  return [...modules, module];
}

/** Removes module `id`. */
export function removeModule(modules: readonly ModuleInstance[], id: string): ModuleInstance[] {
  return modules.filter((m) => m.id !== id);
}

/** Puts module `id` at `place` (clamped; its width within a module's limits, kept when `place` has none). */
export function placeModule(modules: readonly ModuleInstance[], id: string, place: PanelPlace): ModuleInstance[] {
  return modules.map((m) => (m.id === id ? { ...m, place: clampPlace({ ...place, w: place.w ?? m.place.w }, MODULE_WIDTH) } : m));
}

/** Gives module `id` (of kind `kind`) new settings. */
export function setSettings<K extends ModuleKind>(modules: readonly ModuleInstance[], id: string, kind: K, settings: ModuleOf<K>['settings']): ModuleInstance[] {
  // The kind is checked, so the settings fit: the cast only tells TypeScript what was checked.
  return modules.map((m) => (m.id === id && m.kind === kind ? ({ ...m, settings } as ModuleOf<K>) : m));
}

/** Gives module `id` its own sizes; an empty set (every size following the dashboard) is stored as none. */
export function setSizes(modules: readonly ModuleInstance[], id: string, sizes: ModuleSizes): ModuleInstance[] {
  const kept = normalizeSizes(sizes);
  return modules.map((m) => {
    if (m.id !== id) return m;
    const next = { ...m, sizes: kept };
    if (!kept) delete next.sizes;
    return next;
  });
}

/** Shows (true) or hides module `id`'s title outside edit mode; `undefined` goes back to its kind's usual. */
export function setTitle(modules: readonly ModuleInstance[], id: string, title: boolean | undefined): ModuleInstance[] {
  return modules.map((m) => {
    if (m.id !== id) return m;
    const next = { ...m, title };
    if (title === undefined) delete next.title;
    return next;
  });
}

/** The dashboard's sizes a module's own replace (SYSTEM ▸ APPEARANCE; the layout's prefs). */
export interface DashboardSizes {
  textScale: number;
  moduleScale: number;
}

/**
 * How big module content is drawn, against the UI's own px (app.css --m):
 * its own SIZE, else the dashboard's MODULE SIZE. Either way it's on top of
 * the dashboard's UI SCALE (#root's zoom), as the rest of the UI is.
 */
export function moduleScaleOf(sizes: ModuleSizes | undefined, dashboard: DashboardSizes): number {
  return sizes?.scale ?? dashboard.moduleScale;
}

/** A module's TEXT SIZE: its own, else the dashboard's. */
export function moduleTextOf(sizes: ModuleSizes | undefined, dashboard: DashboardSizes): number {
  return sizes?.textScale ?? dashboard.textScale;
}

/** A module's sizes read from storage or a file: each snapped to its steps; unknown or malformed ones dropped. Undefined when none are left. */
export function normalizeSizes(v: unknown): ModuleSizes | undefined {
  if (!isRecord(v)) return undefined;
  const out: ModuleSizes = {};
  // A number snaps to its nearest step; anything else means "follow the dashboard".
  const snap = (steps: readonly number[], x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? nearestStep(steps, x, steps[0]!) : undefined);
  const scale = snap(MODULE_OWN_STEPS, v.scale), text = snap(TEXT_SCALE_STEPS, v.textScale);
  if (scale !== undefined) out.scale = scale;
  if (text !== undefined) out.textScale = text;
  return Object.keys(out).length ? out : undefined;
}

/** The modules of `kind`, in order. */
export function modulesOf<K extends ModuleKind>(modules: readonly ModuleInstance[], kind: K): ModuleOf<K>[] {
  return modules.filter((m): m is ModuleOf<K> => m.kind === kind);
}

/** A plain object (not null, not an array)? */
function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

/** A module's place, checked; a module with a malformed one goes to the first free spot. */
function normalizeModulePlace(v: unknown, kind: ModuleKind, before: readonly ModuleInstance[]): PanelPlace {
  if (isRecord(v) && typeof v.x === 'number' && typeof v.y === 'number') {
    return clampPlace({ x: v.x, y: v.y, w: typeof v.w === 'number' ? v.w : MODULE_DEFAULT_W[kind] }, MODULE_WIDTH);
  }
  return { ...freeSpot(before), w: MODULE_DEFAULT_W[kind] };
}

/**
 * A list of modules read from storage or a file, checked: entries with an
 * unknown kind, a bad id or a repeated one are dropped; each kind's
 * settings go through its own rules; at most MAX_MODULES.
 */
export function normalizeModules(v: unknown): ModuleInstance[] {
  const out: ModuleInstance[] = [];
  if (!Array.isArray(v)) return out;
  for (const m of v) {
    if (out.length >= MAX_MODULES) break;
    if (!isRecord(m) || typeof m.id !== 'string' || !isModuleId(m.id) || out.some((x) => x.id === m.id)) continue;
    const { id } = m;
    const place = (kind: ModuleKind) => normalizeModulePlace(m.place, kind, out);
    // Its own sizes, only when it has any (most modules follow the dashboard).
    const sizes = normalizeSizes(m.sizes);
    const own = { ...(sizes ? { sizes } : {}), ...(typeof m.title === 'boolean' ? { title: m.title } : {}) };
    if (m.kind === 'search') out.push({ id, kind: 'search', place: place('search'), settings: normalizeSearch(m.settings), ...own });
    else if (m.kind === 'launch') out.push({ id, kind: 'launch', place: place('launch'), settings: normalizeLaunch(m.settings), ...own });
    else if (m.kind === 'time') out.push({ id, kind: 'time', place: place('time'), settings: normalizeTime(m.settings), ...own });
    else if (m.kind === 'clock') out.push({ id, kind: 'clock', place: place('clock'), settings: normalizeClock(m.settings), ...own });
    // COUNTDOWN (0.25.0, schema 7: it replaces 0.24.0's TIMER, which migrations.ts turns into one; an older build drops the entry it doesn't know, one by one).
    else if (m.kind === 'countdown') out.push({ id, kind: 'countdown', place: place('countdown'), settings: normalizeCountdown(m.settings), ...own });
  }
  return out;
}
