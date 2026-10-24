/**
 * src/lib/switching.ts: SWITCH TO OPEN TAB's rules: which links switch to
 * an open tab of their site instead of opening another (bridge 1.3+).
 *
 * Layer: pure lib. You turn it on per link, from its ⋯ menu; what's kept
 * is the link's *place*: its origin and path up to the last `/`, then `*`
 * (`https://thedungeons2077.github.io/quest_log_desktop/*`), as a Chrome
 * match pattern. A click on any link under that place then focuses a tab
 * already open there, so one app keeps one tab. The list lives in the
 * layout (prefs.switchTabs), so it's backed up with everything else.
 *
 * What Chrome grants the bridge is a whole site (`https://host/*`: Chrome
 * ignores a host permission's path), so a pattern's site is asked for once
 * (`siteOf`), and given back when its last pattern goes.
 */

/** Most places kept. */
export const MAX_SWITCH = 200;

/** A place pattern: http(s), a host (no wildcard, no port), a path ending in `/*`. */
const PATTERN = /^https?:\/\/[a-z0-9.-]+\/[^*\s]*\*$/i;

/** Is `p` a place pattern? */
export function isSwitchPattern(p: string): boolean {
  return p.length <= 2000 && PATTERN.test(p) && p.endsWith('/*');
}

/**
 * The place a link switches within: its origin and its path up to the last
 * `/`, then `*`. Null for a link that isn't http(s). The port is left out:
 * a Chrome match pattern can't hold one (and matches any).
 */
export function switchPattern(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if ((u.protocol !== 'http:' && u.protocol !== 'https:') || !u.hostname) return null;
  const dir = u.pathname.slice(0, u.pathname.lastIndexOf('/') + 1) || '/';
  const pattern = `${u.protocol}//${u.hostname}${dir}*`;
  return isSwitchPattern(pattern) ? pattern : null;
}

/** The site a pattern needs the bridge to see: `https://host/*`. */
export function siteOf(pattern: string): string {
  const u = new URL(pattern.slice(0, -1));
  return `${u.protocol}//${u.hostname}/*`;
}

/** Does `pattern` cover `url` (same scheme and host, and its path starts with the pattern's)? */
export function covers(pattern: string, url: string): boolean {
  try {
    const p = new URL(pattern.slice(0, -1));
    const u = new URL(url);
    return p.protocol === u.protocol && p.hostname === u.hostname && u.pathname.startsWith(p.pathname);
  } catch {
    return false;
  }
}

/** The pattern in `list` that covers `url` (the longest, so the nearest place wins), or null. */
export function patternFor(list: readonly string[], url: string): string | null {
  let best: string | null = null;
  for (const p of list) if (covers(p, url) && (!best || p.length > best.length)) best = p;
  return best;
}

/** The list with `pattern` in it (sorted, once). */
export function withPattern(list: readonly string[], pattern: string): string[] {
  if (list.includes(pattern) || list.length >= MAX_SWITCH) return [...list];
  return [...list, pattern].sort();
}

/** The list without `pattern`. */
export function withoutPattern(list: readonly string[], pattern: string): string[] {
  return list.filter((p) => p !== pattern);
}

/** Does any pattern in `list` still need `site`? (When none does, its permission can go back.) */
export function siteNeeded(list: readonly string[], site: string): boolean {
  return list.some((p) => siteOf(p) === site);
}

/** A stored list, checked: place patterns only, each once, sorted, at most MAX_SWITCH. */
export function normalizeSwitchTabs(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return [...new Set(v.filter((p): p is string => typeof p === 'string' && isSwitchPattern(p)))].sort().slice(0, MAX_SWITCH);
}
