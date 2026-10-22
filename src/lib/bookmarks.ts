/**
 * src/lib/bookmarks.ts: the bookmarks bar as the dashboard sees it: the
 * tree, checking a tree that came from outside, which links a webpage
 * can open, folder keys, and reading Chrome's exported bookmarks.html.
 *
 * Layer: pure lib (no DOM: the export is parsed with a small tokenizer,
 * so tests run in Node).
 *
 * Two sources give the same tree:
 *   - the bridge extension (live; bridge/tree.js builds it from Chrome);
 *   - an imported bookmarks.html (a copy, kept in the layout so it's
 *     backed up with it).
 */

/** A bookmark (has `url`) or a folder (has `children`). */
export interface BookmarkNode {
  id: string;
  title: string;
  url?: string;
  children?: BookmarkNode[];
}

/** Deepest folder level accepted. */
export const MAX_DEPTH = 12;
/** Most nodes accepted from any source. */
export const MAX_NODES = 5000;
/** Longest title and URL kept (longer ones are cut). */
const MAX_TITLE = 300;
const MAX_URL = 4000;

/**
 * Can a webpage open this link? Only http(s): the browser refuses to let a
 * page navigate to chrome://, file:// or javascript: (bookmarklets), so
 * those are shown but not clickable.
 */
export function isOpenable(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

/** The host a link points at, for the small line under its title (`github.com`); '' if none. */
export function hostOf(url: string): string {
  const m = /^[a-z][a-z0-9+.-]*:\/\/([^/?#]+)/i.exec(url);
  return m ? m[1]!.replace(/^www\./i, '').toLowerCase() : '';
}

/**
 * A tree from outside (the bridge, a stored layout, a file), checked and
 * copied: only id, title, url and children survive; depth, node count and
 * text lengths are capped. Returns null when `data` isn't a folder at all.
 */
export function sanitizeTree(data: unknown): BookmarkNode | null {
  let budget = MAX_NODES;
  const walk = (v: unknown, depth: number): BookmarkNode | null => {
    if (!v || typeof v !== 'object' || budget <= 0) return null;
    const n = v as Record<string, unknown>;
    budget--;
    const title = typeof n.title === 'string' ? n.title.slice(0, MAX_TITLE) : '';
    const id = typeof n.id === 'string' || typeof n.id === 'number' ? String(n.id) : '';
    if (typeof n.url === 'string') return { id, title, url: n.url.slice(0, MAX_URL) };
    if (!Array.isArray(n.children)) return null;
    const children: BookmarkNode[] = [];
    if (depth < MAX_DEPTH) {
      for (const c of n.children) {
        const node = walk(c, depth + 1);
        if (node) children.push(node);
      }
    }
    return { id, title, children };
  };
  const root = walk(data, 0);
  return root?.children ? root : null;
}

/** How many links a tree holds (folders not counted). */
export function countLinks(node: BookmarkNode | null): number {
  if (!node) return 0;
  if (node.url !== undefined) return 1;
  return (node.children ?? []).reduce((n, c) => n + countLinks(c), 0);
}

/**
 * A folder's key for remembering whether it's collapsed: its path of titles
 * (`Dev/Tools`). The same folder gets the same key from the bridge and from
 * an imported file (whose ids differ), and across reloads.
 */
export function folderKey(path: readonly string[]): string {
  return path.map((t) => t.replace(/\//g, '∕')).join('/');
}

// --- bookmarks.html (the Netscape bookmark file Chrome exports) -----------

/** Turns the export's HTML entities back into text. */
function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|#39);/gi, (_m, e: string) => {
    const k = e.toLowerCase();
    if (k === 'amp') return '&';
    if (k === 'lt') return '<';
    if (k === 'gt') return '>';
    if (k === 'quot') return '"';
    if (k === 'apos' || k === '#39') return "'";
    const code = k.startsWith('#x') ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10);
    return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : '';
  });
}

/** A file that isn't a bookmarks export (or has no bookmarks bar); `message` is for the user. */
export class BookmarksFileError extends Error {}

/**
 * Reads Chrome's bookmarks.html (Bookmark manager ▸ ⋮ ▸ Export bookmarks)
 * and returns its bookmarks bar: the folder marked
 * PERSONAL_TOOLBAR_FOLDER="true", or the first folder if none is marked.
 *
 * The format is a nested list: `<DT><H3 …>Folder</H3>` followed by its
 * `<DL>` of entries, and `<DT><A HREF="…">Title</A>` for a link. It's read
 * as a stream of those tags, keeping a stack of open folders. Ids are
 * made up from the position (`f0`, `f0.3`), since files carry none.
 */
export function parseBookmarksHtml(html: string): BookmarkNode {
  if (!/<!DOCTYPE NETSCAPE-Bookmark-file-1>/i.test(html)) {
    throw new BookmarksFileError('That file isn’t a bookmarks export. In Chrome: Bookmark manager ▸ ⋮ ▸ Export bookmarks.');
  }
  const root: BookmarkNode = { id: 'f', title: '', children: [] };
  // Open folders; the top is where new entries go.
  const stack: BookmarkNode[] = [root];
  // A folder heading seen whose <DL> hasn't opened yet.
  let pendingFolder: BookmarkNode | null = null;
  let toolbar: BookmarkNode | null = null;
  let count = 0;
  const tags = /<(H3)([^>]*)>([\s\S]*?)<\/H3>|<(A)\s([^>]*)>([\s\S]*?)<\/A>|<(DL)[^>]*>|<\/(DL)>/gi;
  for (const m of html.matchAll(tags)) {
    if (++count > MAX_NODES * 2) break;
    const top = stack[stack.length - 1]!;
    const kids = top.children!;
    if (m[1]) {
      const folder: BookmarkNode = { id: `${top.id}${kids.length}.`, title: decodeEntities(m[3]!.trim()), children: [] };
      kids.push(folder);
      pendingFolder = folder;
      if (!toolbar && /PERSONAL_TOOLBAR_FOLDER\s*=\s*"true"/i.test(m[2]!)) toolbar = folder;
    } else if (m[4]) {
      const href = /HREF\s*=\s*"([^"]*)"/i.exec(m[5]!)?.[1];
      if (href !== undefined) kids.push({ id: `${top.id}${kids.length}`, title: decodeEntities(m[6]!.replace(/<[^>]*>/g, '').trim()), url: decodeEntities(href) });
    } else if (m[7]) {
      // A list opens: it belongs to the folder just named (the outermost one belongs to the root).
      if (pendingFolder) stack.push(pendingFolder);
      else if (stack.length > 1) stack.push(top);
      pendingFolder = null;
    } else if (m[8]) {
      if (stack.length > 1) stack.pop();
    }
  }
  const bar = toolbar ?? root.children!.find((c) => c.children) ?? null;
  const clean = sanitizeTree(bar);
  if (!clean) throw new BookmarksFileError('That bookmarks export has no bookmarks bar in it.');
  return clean;
}
