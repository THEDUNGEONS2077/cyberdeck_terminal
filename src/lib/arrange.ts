/**
 * src/lib/arrange.ts: the dashboard's own arrangement of the bookmarks
 * bar: your areas, your order, what's hidden, and where the panels sit.
 *
 * Layer: pure lib. Chrome's bookmarks are never changed: this is a layer
 * on top of them, saved in the layout document (so it's backed up and
 * restorable like everything else).
 *
 * Items are named by keys that stay the same across reloads and across
 * the live bar and an imported copy:
 *   - a link:   `l:<url>` (a second link to the same URL: `l:<url>#2`, …);
 *   - a folder: `f:<path of titles>` (lib/bookmarks.ts folderKey).
 * A renamed folder or a changed URL is a new item: it simply shows up
 * where Chrome has it again.
 *
 * What shows where:
 *   - NAV (the main section): the bar's top-level items, plus any deeper
 *     item you placed there, in your order. Items you haven't placed sit
 *     where Chrome has them (after the item Chrome puts before them).
 *   - Each area: the items you put in it, in your order.
 *   - A folder shows its contents in Chrome's order, minus anything you
 *     placed elsewhere or hid.
 *   - Hidden items show only in edit mode's HIDDEN tray.
 */
import { type BookmarkNode, folderKey } from './bookmarks';

/** One of your areas: a named section of the dashboard. */
export interface Area {
  id: string;
  title: string;
  /** Item keys, in your order. */
  items: string[];
  collapsed: boolean;
}

/** Your arrangement of the bookmarks. */
export interface Arrangement {
  /** NAV's order: item keys (top-level items not listed follow Chrome's order; deeper items listed here are placed in NAV). */
  order: string[];
  areas: Area[];
  /** Hidden item keys. */
  hidden: string[];
}

/** Where a panel sits: its top-left corner as a share of the window (0–1), and its width in px (NAV and the modules). */
export interface PanelPlace {
  x: number;
  y: number;
  w?: number;
}

/** Where the movable panels sit; null = their default place. */
export interface Panels {
  nav: PanelPlace | null;
  brand: PanelPlace | null;
  /**
   * The brand panel is off the screen (0.13.0: it's optional, added and
   * removed like a module). Only written when true, so a layout that never
   * removed it is the same document as before.
   */
  brandOff?: true;
}

/** Longest area title kept. */
export const MAX_AREA_TITLE = 40;
/** Most areas. */
export const MAX_AREAS = 50;
/** NAV's width limits (px). */
export const NAV_MIN_W = 360;
export const NAV_MAX_W = 2400;

/** How narrow and how wide a resizable panel can be (px). */
export interface WidthLimits {
  min: number;
  max: number;
}
/** NAV's width limits, as WidthLimits. */
export const NAV_WIDTH: WidthLimits = { min: NAV_MIN_W, max: NAV_MAX_W };

/** No arrangement: everything where Chrome has it. */
export function emptyArrangement(): Arrangement {
  return { order: [], areas: [], hidden: [] };
}

/** Panels in their default places. */
export function defaultPanels(): Panels {
  return { nav: null, brand: null };
}

/** An item of the bar, with where it is in Chrome. */
export interface TreeItem {
  key: string;
  node: BookmarkNode;
  /** Titles of its folders, outermost first, ending with its own title (folders) or its folder's (links). */
  path: string[];
  /** Its folder's key, or null for the bar's top level. */
  parent: string | null;
}

/** The kind of an item key. */
export function keyKind(key: string): 'link' | 'folder' {
  return key.startsWith('f:') ? 'folder' : 'link';
}

/**
 * Every item of the bar by key, in Chrome's order (depth first), plus the
 * keys of the top level. Links to the same URL get `#2`, `#3`… in that order.
 */
export function indexTree(bar: BookmarkNode | null): { items: Map<string, TreeItem>; top: string[]; children: Map<string, string[]> } {
  const items = new Map<string, TreeItem>();
  const top: string[] = [];
  // Each folder's own items, in Chrome's order (so a folder never has to search the whole bar).
  const children = new Map<string, string[]>();
  const seen = new Map<string, number>();
  const walk = (node: BookmarkNode, path: string[], parent: string | null) => {
    for (const child of node.children ?? []) {
      let key: string;
      let childPath = path;
      if (child.url !== undefined) {
        const base = `l:${child.url}`;
        const n = (seen.get(base) ?? 0) + 1;
        seen.set(base, n);
        key = n === 1 ? base : `${base}#${n}`;
      } else {
        childPath = [...path, child.title];
        key = `f:${folderKey(childPath)}`;
        if (items.has(key)) continue; // two folders with the same path: the first one counts
      }
      items.set(key, { key, node: child, path: childPath, parent });
      if (parent === null) top.push(key);
      else {
        const list = children.get(parent);
        if (list) list.push(key);
        else children.set(parent, [key]);
      }
      if (child.children) walk(child, childPath, key);
    }
  };
  if (bar) walk(bar, [], null);
  return { items, top, children };
}

/**
 * `custom` (your order) with Chrome's `natural` keys that aren't in it
 * added where Chrome has them: right after the item Chrome puts before
 * them (or first, if none). Keys in `custom` that no longer exist go.
 */
export function mergeOrder(natural: readonly string[], custom: readonly string[], exists: (key: string) => boolean): string[] {
  const out = custom.filter(exists);
  const inOut = new Set(out);
  natural.forEach((key, i) => {
    if (inOut.has(key)) return;
    const before = natural.slice(0, i).reverse().find((k) => inOut.has(k));
    out.splice(before === undefined ? 0 : out.indexOf(before) + 1, 0, key);
    inOut.add(key);
  });
  return out;
}

/** What the dashboard shows, worked out from the bar and the arrangement. */
export interface Arranged {
  /** NAV's items, in order. */
  main: TreeItem[];
  /** NAV's keys in order, hidden ones included (where moves are measured from, so hidden items keep their place). */
  mainKeys: string[];
  /** Every item of the bar, by key. */
  all: Map<string, TreeItem>;
  /** Each folder's own item keys, in Chrome's order. */
  children: Map<string, string[]>;
  /** Each area and its items, in order. */
  areas: { area: Area; items: TreeItem[] }[];
  /** Hidden items that exist (the edit tray). */
  hidden: TreeItem[];
  /** Keys shown somewhere other than inside their own folder (placed) or not at all (hidden): folders leave these out. */
  excluded: Set<string>;
}

/** Works out what shows where (see the file header). */
export function arrange(bar: BookmarkNode | null, arr: Arrangement): Arranged {
  const { items, top, children } = indexTree(bar);
  const hidden = new Set(arr.hidden.filter((k) => items.has(k)));
  const inAreas = new Set(arr.areas.flatMap((a) => a.items).filter((k) => items.has(k)));
  // Deeper items placed in NAV are those listed in its order.
  const placedInMain = new Set(arr.order.filter((k) => items.get(k)?.parent !== null && items.has(k) && !inAreas.has(k)));
  const naturalMain = top.filter((k) => !inAreas.has(k));
  const mainKeys = mergeOrder(naturalMain, arr.order, (k) => items.has(k) && !inAreas.has(k) && (items.get(k)!.parent === null || placedInMain.has(k)));
  const excluded = new Set<string>([...hidden, ...inAreas, ...placedInMain]);
  // An item in two areas (a hand-edited backup): only its first area keeps it.
  const claimed = new Set<string>();
  const areas = arr.areas.map((area) => {
    const shown: TreeItem[] = [];
    for (const k of area.items) {
      const item = items.get(k);
      if (!item || hidden.has(k) || claimed.has(k)) continue;
      claimed.add(k);
      shown.push(item);
    }
    return { area, items: shown };
  });
  return {
    main: mainKeys.filter((k) => !hidden.has(k)).map((k) => items.get(k)!),
    mainKeys,
    all: items,
    children,
    areas,
    hidden: [...hidden].map((k) => items.get(k)!),
    excluded,
  };
}

/** A folder's contents as shown: Chrome's order, minus what's placed elsewhere or hidden. */
export function folderContents(item: TreeItem, arranged: { all: Map<string, TreeItem>; children: Map<string, string[]>; excluded: ReadonlySet<string> }): TreeItem[] {
  const out: TreeItem[] = [];
  for (const key of arranged.children.get(item.key) ?? []) if (!arranged.excluded.has(key)) out.push(arranged.all.get(key)!);
  return out;
}

// --- Changes (each returns a new arrangement) -------------------------------

/** Where a moved item goes: NAV (`main`) or an area, before `before` (a key) or at the end (null). */
export interface MoveTarget {
  section: 'main' | string;
  before: string | null;
}

/** Takes `key` out of every list it's placed in (NAV's order, every area). */
function unplace(arr: Arrangement, key: string): Arrangement {
  return { ...arr, order: arr.order.filter((k) => k !== key), areas: arr.areas.map((a) => (a.items.includes(key) ? { ...a, items: a.items.filter((k) => k !== key) } : a)) };
}

/** Inserts `key` into `list` before `before` (or at the end). */
function insertBefore(list: readonly string[], key: string, before: string | null): string[] {
  const out = list.filter((k) => k !== key);
  const at = before === null ? -1 : out.indexOf(before);
  out.splice(at < 0 ? out.length : at, 0, key);
  return out;
}

/**
 * Moves `key` to `target`. NAV's order is written out in full (`mainNow`:
 * NAV's keys as shown now), so the move is kept exactly as seen even as
 * Chrome adds items later.
 */
export function moveItem(arr: Arrangement, key: string, target: MoveTarget, mainNow: readonly string[]): Arrangement {
  const out = unplace(arr, key);
  if (target.section === 'main') return { ...out, order: insertBefore(mainNow, key, target.before) };
  return { ...out, areas: out.areas.map((a) => (a.id === target.section ? { ...a, items: insertBefore(a.items, key, target.before) } : a)) };
}

/**
 * BACK TO CHROME'S PLACE: `key` leaves your order and your areas, and shows
 * where Chrome has it again (inside its folder, for a deeper item).
 */
export function unplaceItem(arr: Arrangement, key: string): Arrangement {
  return unplace(arr, key);
}

/** Is `key` placed by you (in an area, or in NAV's order)? */
export function isPlaced(arr: Arrangement, key: string): boolean {
  return arr.order.includes(key) || arr.areas.some((a) => a.items.includes(key));
}

/** Hides `key` (it keeps its place, for when it's shown again). */
export function hideItem(arr: Arrangement, key: string): Arrangement {
  return arr.hidden.includes(key) ? arr : { ...arr, hidden: [...arr.hidden, key] };
}

/** Shows `key` again, where it was. */
export function showItem(arr: Arrangement, key: string): Arrangement {
  return { ...arr, hidden: arr.hidden.filter((k) => k !== key) };
}

/** Adds an area at the end, named `title`, with id `id`. */
export function addArea(arr: Arrangement, id: string, title: string): Arrangement {
  if (arr.areas.length >= MAX_AREAS) return arr;
  return { ...arr, areas: [...arr.areas, { id, title: cleanTitle(title), items: [], collapsed: false }] };
}

/** An area title: trimmed, capped, upper case (the terminal look), never empty. */
export function cleanTitle(title: string): string {
  return title.trim().slice(0, MAX_AREA_TITLE).toUpperCase() || 'AREA';
}

/** Renames area `id`. */
export function renameArea(arr: Arrangement, id: string, title: string): Arrangement {
  return { ...arr, areas: arr.areas.map((a) => (a.id === id ? { ...a, title: cleanTitle(title) } : a)) };
}

/** Deletes area `id`: its items go back where Chrome has them. */
export function deleteArea(arr: Arrangement, id: string): Arrangement {
  return { ...arr, areas: arr.areas.filter((a) => a.id !== id) };
}

/** Moves area `id` before area `before` (or to the end). */
export function moveArea(arr: Arrangement, id: string, before: string | null): Arrangement {
  const area = arr.areas.find((a) => a.id === id);
  if (!area || id === before) return arr;
  const rest = arr.areas.filter((a) => a.id !== id);
  const at = before === null ? -1 : rest.findIndex((a) => a.id === before);
  rest.splice(at < 0 ? rest.length : at, 0, area);
  return { ...arr, areas: rest };
}

/** Opens or collapses area `id`. */
export function setAreaCollapsed(arr: Arrangement, id: string, collapsed: boolean): Arrangement {
  return { ...arr, areas: arr.areas.map((a) => (a.id === id ? { ...a, collapsed } : a)) };
}

/**
 * RELOAD CHROME ORDER: everything back where Chrome has it: your order and
 * areas go. Hidden items stay hidden (that's a choice, not an order).
 */
export function chromeOrder(arr: Arrangement): Arrangement {
  return { ...arr, order: [], areas: [] };
}

/** A panel's box on screen (px). */
export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** How near (px) an edge must come to snap. */
export const SNAP_PX = 8;
/** The gap (px) kept between panels snapped side by side, and from the window's edges (app.css keeps panels 8 px in). */
export const SNAP_GAP = 8;

/**
 * Where a dropped panel settles (0.14.0): each axis on its own, the edge
 * nearest within `within` px of a line wins: the window's edges (8 px in),
 * another panel's same edge (lined up), or its far edge plus the gap (side
 * by side). Unchanged on an axis with nothing that near.
 */
export function snapBox(box: Box, others: readonly Box[], view: { w: number; h: number }, within = SNAP_PX): { left: number; top: number } {
  const width = box.right - box.left;
  const height = box.bottom - box.top;
  /** The nearest shift (within reach) that puts one of `edges` on one of `lines`; 0 if none. */
  const shift = (edges: readonly number[], lines: readonly number[]) => {
    let best = Number.POSITIVE_INFINITY;
    for (const e of edges) for (const l of lines) if (Math.abs(l - e) <= within && Math.abs(l - e) < Math.abs(best)) best = l - e;
    return Number.isFinite(best) ? best : 0;
  };
  const xs = [SNAP_GAP, view.w - SNAP_GAP, ...others.flatMap((o) => [o.left, o.right, o.right + SNAP_GAP, o.left - SNAP_GAP])];
  const ys = [SNAP_GAP, view.h - SNAP_GAP, ...others.flatMap((o) => [o.top, o.bottom, o.bottom + SNAP_GAP, o.top - SNAP_GAP])];
  return { left: box.left + shift([box.left, box.left + width], xs), top: box.top + shift([box.top, box.top + height], ys) };
}

/** A panel place kept inside sensible bounds (shares 0–0.95; a width within `width`, NAV's unless said). */
export function clampPlace(place: PanelPlace, width: WidthLimits = NAV_WIDTH): PanelPlace {
  const clamp = (v: number, lo: number, hi: number) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo);
  const out: PanelPlace = { x: clamp(place.x, 0, 0.95), y: clamp(place.y, 0, 0.95) };
  if (place.w !== undefined) out.w = Math.round(clamp(place.w, width.min, width.max));
  return out;
}
