/**
 * src/lib/find.ts: the finder's search (press `/`): every bookmark on the
 * dashboard, matched against what's typed, best first.
 *
 * Layer: pure lib.
 *
 * What can be found: every link a webpage can open (http/https), at any
 * depth, except what you've hidden (and what's inside a hidden folder).
 * Each word typed must match the title, the site, or a folder on the way
 * to it; matches score higher the more prominent they are:
 *   title starts with it  100   a word in the title starts with it  80
 *   inside the title       50   the site starts with it             40
 *   inside the site        25   a folder's name holds it            15
 *   the title has its letters in order (a loose match)               8
 * Ties go to the shorter title, then to the dashboard's own order.
 */
import type { Arranged } from './arrange';
import { hostOf, isOpenable } from './bookmarks';

/** One findable bookmark. */
export interface FindEntry {
  key: string;
  title: string;
  url: string;
  host: string;
  /** Its folders' titles, outermost first (empty at the bar's top level). */
  folders: string[];
}

/** A match: the entry, its score, and where the title matched (for highlighting), as [start, end) pairs. */
export interface FindHit {
  entry: FindEntry;
  score: number;
  marks: [number, number][];
}

/** Every bookmark the finder can open, in the dashboard's order (NAV, then areas, then folders' contents). */
export function findEntries(arranged: Pick<Arranged, 'all' | 'main' | 'areas' | 'hidden'>): FindEntry[] {
  // Hidden items, and everything inside a hidden folder, stay hidden here too.
  const hidden = new Set(arranged.hidden.map((h) => h.key));
  const hiddenUnder = (key: string): boolean => {
    for (let k: string | null = key; k; k = arranged.all.get(k)?.parent ?? null) if (hidden.has(k)) return true;
    return false;
  };
  // Dashboard order first (what's shown at the top is found first), then the rest of the bar.
  const order = [...arranged.main.map((i) => i.key), ...arranged.areas.flatMap((a) => a.items.map((i) => i.key)), ...arranged.all.keys()];
  const out: FindEntry[] = [];
  const seen = new Set<string>();
  for (const key of order) {
    if (seen.has(key)) continue;
    seen.add(key);
    const item = arranged.all.get(key);
    const url = item?.node.url;
    if (!item || url === undefined || !isOpenable(url) || hiddenUnder(key)) continue;
    const host = hostOf(url);
    out.push({ key, title: item.node.title.trim() || host || url, url, host, folders: item.path });
  }
  return out;
}

/** Is `ch` a word boundary character (before a word)? */
const boundary = (ch: string | undefined) => ch === undefined || /[\s\-_./:|·()[\]]/.test(ch);

/** Scores one word against an entry; 0 = no match. Adds the title's matched range to `marks`. */
function scoreWord(e: FindEntry, word: string, marks: [number, number][]): number {
  const title = e.title.toLowerCase();
  let at = title.indexOf(word);
  if (at >= 0) {
    // Prefer a match at the start of a word (`hub` in "GitHub" scores lower than in "Hub page").
    for (let i = at; i >= 0; i = title.indexOf(word, i + 1)) {
      if (boundary(title[i - 1])) {
        at = i;
        break;
      }
    }
    marks.push([at, at + word.length]);
    if (at === 0) return 100;
    return boundary(title[at - 1]) ? 80 : 50;
  }
  const host = e.host.toLowerCase();
  if (host.startsWith(word)) return 40;
  if (host.includes(word)) return 25;
  if (e.folders.some((f) => f.toLowerCase().includes(word))) return 15;
  // A loose match: the word's letters in order in the title ("gthb" finds "GitHub").
  if (word.length >= 2) {
    let i = 0;
    for (const ch of title) if (ch === word[i]) i++;
    if (i === word.length) return 8;
  }
  return 0;
}

/** The best `limit` matches for `query` (every word must match), best first. Empty query: none. */
export function search(entries: readonly FindEntry[], query: string, limit = 8): FindHit[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const hits: (FindHit & { index: number })[] = [];
  entries.forEach((entry, index) => {
    const marks: [number, number][] = [];
    let score = 0;
    for (const w of words) {
      const s = scoreWord(entry, w, marks);
      if (!s) return;
      score += s;
    }
    hits.push({ entry, score, marks, index });
  });
  hits.sort((a, b) => b.score - a.score || a.entry.title.length - b.entry.title.length || a.index - b.index);
  return hits.slice(0, limit).map(({ entry, score, marks }) => ({ entry, score, marks }));
}

/** Splits `text` into plain and matched pieces, for highlighting (`marks` may overlap; they're merged). */
export function markPieces(text: string, marks: readonly [number, number][]): { text: string; mark: boolean }[] {
  const sorted = [...marks].sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const [s, e] of sorted) {
    const last = merged[merged.length - 1];
    if (last && s <= last[1]) last[1] = Math.max(last[1], e);
    else merged.push([s, e]);
  }
  const out: { text: string; mark: boolean }[] = [];
  let at = 0;
  for (const [s, e] of merged) {
    if (s > at) out.push({ text: text.slice(at, s), mark: false });
    out.push({ text: text.slice(s, e), mark: true });
    at = e;
  }
  if (at < text.length) out.push({ text: text.slice(at), mark: false });
  return out;
}
