/**
 * src/lib/launch.ts: the QUICK LAUNCH module's rules: its pinned tiles,
 * how they're added, moved and removed, and which open on keys 1–9.
 *
 * Layer: pure lib. A tile is just a title and an address (pinned from a
 * bookmark, or typed in); it isn't tied to Chrome's bookmarks, so it stays
 * when the bookmark changes.
 */
import { hostOf } from './bookmarks';

/** A pinned tile. */
export interface LaunchTile {
  url: string;
  title: string;
}

/** The QUICK LAUNCH module's settings: its tiles, in order. */
export interface LaunchSettings {
  tiles: LaunchTile[];
}

/** Most tiles in one module. */
export const MAX_TILES = 24;
/** Longest tile title kept. */
export const MAX_TILE_TITLE = 40;
/** Longest address kept. */
export const MAX_TILE_URL = 2000;
/** How many tiles have a key (1–9). */
export const LAUNCH_KEYS = 9;

/** A new QUICK LAUNCH module's settings: no tiles yet. */
export function defaultLaunch(): LaunchSettings {
  return { tiles: [] };
}

/**
 * An address as typed, made openable: a bare `github.com/x` gets `https://`;
 * only http(s) addresses are kept (a tile is opened by the page, which
 * can't open chrome:// or javascript:). Null when it isn't an address.
 */
export function cleanUrl(input: string): string | null {
  let t = input.trim();
  if (!t || t.length > MAX_TILE_URL || /\s/.test(t)) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(t)) t = `https://${t}`;
  try {
    const u = new URL(t);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    if (!u.hostname) return null;
    return u.href;
  } catch {
    return null;
  }
}

/** A tile title: trimmed and capped; the site's name when empty. */
export function cleanTileTitle(title: string, url: string): string {
  const t = title.trim().slice(0, MAX_TILE_TITLE);
  return t || hostOf(url) || 'TILE';
}

/** The settings, checked: tiles with an openable address, each address once, at most MAX_TILES. */
export function normalizeLaunch(v: unknown): LaunchSettings {
  const out = defaultLaunch();
  if (!v || typeof v !== 'object' || Array.isArray(v)) return out;
  const tiles = (v as Record<string, unknown>).tiles;
  if (!Array.isArray(tiles)) return out;
  for (const t of tiles) {
    if (out.tiles.length >= MAX_TILES) break;
    if (!t || typeof t !== 'object') continue;
    const { url, title } = t as Record<string, unknown>;
    const clean = typeof url === 'string' ? cleanUrl(url) : null;
    if (!clean || out.tiles.some((x) => x.url === clean)) continue;
    out.tiles.push({ url: clean, title: cleanTileTitle(typeof title === 'string' ? title : '', clean) });
  }
  return out;
}

/** Is `url` pinned already? */
export function hasTile(settings: LaunchSettings, url: string): boolean {
  return settings.tiles.some((t) => t.url === url);
}

/** Pins a tile at the end (unchanged if the address isn't openable, is pinned already, or the module is full). */
export function addTile(settings: LaunchSettings, url: string, title: string): LaunchSettings {
  const clean = cleanUrl(url);
  if (!clean || hasTile(settings, clean) || settings.tiles.length >= MAX_TILES) return settings;
  return { tiles: [...settings.tiles, { url: clean, title: cleanTileTitle(title, clean) }] };
}

/** Unpins the tile with `url`. */
export function removeTile(settings: LaunchSettings, url: string): LaunchSettings {
  return { tiles: settings.tiles.filter((t) => t.url !== url) };
}

/** Moves the tile with `url` one place earlier (-1) or later (1); at either end, unchanged. */
export function moveTile(settings: LaunchSettings, url: string, direction: -1 | 1): LaunchSettings {
  const at = settings.tiles.findIndex((t) => t.url === url);
  const to = at + direction;
  if (at < 0 || to < 0 || to >= settings.tiles.length) return settings;
  const tiles = [...settings.tiles];
  [tiles[at], tiles[to]] = [tiles[to]!, tiles[at]!];
  return { tiles };
}

/** The tiles keys 1–9 open: the first nine across every QUICK LAUNCH module, in the modules' order. */
export function launchTargets(all: readonly LaunchSettings[]): LaunchTile[] {
  return all.flatMap((s) => s.tiles).slice(0, LAUNCH_KEYS);
}
