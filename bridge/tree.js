/**
 * bridge/tree.js: turns Chrome's bookmark nodes into the small tree the
 * dashboard reads.
 *
 * Layer: bridge extension (pure functions, no chrome.* calls, so the
 * dashboard's unit tests can run them too).
 *
 * Only the bookmarks bar is shared, and only what the dashboard needs:
 * id, title, url, children. Nothing else leaves the extension.
 */

/** Deepest folder level passed on (deeper folders are cut off). */
export const MAX_DEPTH = 12;
/** Most nodes passed on (a guard against a runaway tree). */
export const MAX_NODES = 5000;

/**
 * The bookmarks bar among getTree()'s roots: the folder Chrome marks as
 * the bar (folderType, Chrome 134+), else id "1" (its id since forever),
 * else the root's first folder.
 * @param {chrome.bookmarks.BookmarkTreeNode[]} roots
 */
export function findBar(roots) {
  const top = roots?.[0]?.children ?? [];
  return top.find((n) => n.folderType === 'bookmarks-bar') ?? top.find((n) => n.id === '1') ?? top[0] ?? null;
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
