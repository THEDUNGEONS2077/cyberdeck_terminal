/**
 * bridge/tree.js: turns Chrome's bookmark nodes into the small tree the
 * dashboard reads.
 *
 * Layer: bridge extension (pure functions, no chrome.* calls, so the
 * dashboard's unit tests can run them too).
 *
 * What the dashboard gets: everything on the bookmarks bar, then Chrome's
 * "Other bookmarks" and "Mobile bookmarks" as two folders at the end (when
 * they hold anything), as Chrome's own bar ends with "All bookmarks". So a
 * bookmark always shows up somewhere, wherever Chrome saved it.
 *
 * Chrome can keep two of each of those folders (since 2025, for people
 * signed in to Chrome): one stored in their Google Account (marked
 * `syncing`), one only on this device. New bookmarks usually go to the
 * account one. Both are read and joined, account first, as Chrome's own
 * bookmarks bar shows them (bridge 1.2.0: 1.1 read only the first bar it
 * found, so bookmarks saved to the other never appeared).
 *
 * Only what the dashboard needs leaves the extension: id, title, url,
 * children. Read-only, always.
 */

/** Deepest folder level passed on (deeper folders are cut off). */
export const MAX_DEPTH = 12;
/** Most nodes passed on (a guard against a runaway tree). */
export const MAX_NODES = 5000;

/** Chrome's permanent folders by kind: their `folderType`, and their id from before folderType existed. */
const PERMANENT = {
  bar: { type: 'bookmarks-bar', id: '1' },
  other: { type: 'other', id: '2' },
  mobile: { type: 'mobile', id: '3' },
};

/**
 * Every permanent folder of one kind ('bar', 'other', 'mobile') among
 * getTree()'s roots: the account copy (`syncing`) first, then this
 * device's. Chrome before 134 has no folderType: then the folder with the
 * kind's old fixed id.
 * @param {chrome.bookmarks.BookmarkTreeNode[]} roots
 * @param {'bar' | 'other' | 'mobile'} kind
 */
export function permanentFolders(roots, kind) {
  const top = roots?.[0]?.children ?? [];
  const { type, id } = PERMANENT[kind];
  const typed = top.filter((n) => n.folderType === type);
  const found = typed.length ? typed : top.filter((n) => n.id === id);
  return [...found.filter((n) => n.syncing), ...found.filter((n) => !n.syncing)];
}

/**
 * The tree the dashboard shows (see the file header): the bookmarks bar's
 * items (every copy, account first), then OTHER and MOBILE as folders when
 * they hold anything. Null if Chrome has no bookmarks bar at all.
 * @param {chrome.bookmarks.BookmarkTreeNode[]} roots
 */
export function dashboardBar(roots) {
  const bars = permanentFolders(roots, 'bar');
  if (!bars.length) return null;
  const children = bars.flatMap((b) => b.children ?? []);
  for (const [kind, title] of [
    ['other', 'Other bookmarks'],
    ['mobile', 'Mobile bookmarks'],
  ]) {
    const items = permanentFolders(roots, kind).flatMap((n) => n.children ?? []);
    if (items.length) children.push({ id: `chrome-${kind}`, title, children: items });
  }
  return { id: bars[0].id, title: bars[0].title, children };
}

/**
 * How many items each part holds, and how many copies of the bar Chrome
 * keeps: shown in the dashboard's SYSTEM panel, to see what the bridge sees.
 * @param {chrome.bookmarks.BookmarkTreeNode[]} roots
 */
export function describeRoots(roots) {
  const count = (kind) => permanentFolders(roots, kind).reduce((n, f) => n + (f.children?.length ?? 0), 0);
  return { bars: permanentFolders(roots, 'bar').length, bar: count('bar'), other: count('other'), mobile: count('mobile') };
}

/**
 * A node and its children, reduced to { id, title, url? , children? }.
 * Folders keep `children` (possibly empty); links keep `url`.
 * @param {chrome.bookmarks.BookmarkTreeNode | null} node
 */
export function simplify(node) {
  if (!node) return null;
  let budget = MAX_NODES;
  const walk = (n, depth) => {
    budget--;
    const out = { id: String(n.id), title: String(n.title ?? '') };
    if (typeof n.url === 'string') {
      out.url = n.url;
      return out;
    }
    out.children = [];
    if (depth >= MAX_DEPTH) return out;
    for (const child of n.children ?? []) {
      if (budget <= 0) break;
      out.children.push(walk(child, depth + 1));
    }
    return out;
  };
  return walk(node, 0);
}
