/**
 * bridge/background.js: the bridge's service worker: answers the
 * dashboard's requests for the bookmarks bar, and tells it when bookmarks
 * change.
 *
 * Layer: bridge extension (Chrome MV3 service worker).
 *
 * Who can ask: only pages listed in manifest.json `externally_connectable`
 * (the dashboard on GitHub Pages, and 127.0.0.1 for development); Chrome
 * enforces that before anything here runs. What they get: the bookmarks
 * bar only, read-only. The bridge never writes bookmarks.
 *
 * Messages (chrome.runtime.sendMessage(BRIDGE_ID, …) from the page):
 *   { type: 'hello' } → { ok: true, version, features }
 *   { type: 'bar' }   → { ok: true, bar, roots }  (bridge/tree.js: the bar,
 *       then Other and Mobile bookmarks as folders; `roots` counts each part)
 *   { type: 'open', target: 'ntp' | 'bookmarks' } → { ok: true }
 *       opens Chrome's own New Tab page or Bookmark manager in a new tab
 *       next to the asking one (a webpage can't open chrome:// pages
 *       itself). Only these two.
 *   { type: 'ask', origin: 'https://site/*' } → { ok: true, granted, asking }
 *       SWITCH TO OPEN TAB, turned on: may this bridge see the site's tabs?
 *       Already allowed: granted at once. Otherwise it opens its small
 *       grant.html window (asking: true), where your click on ALLOW lets
 *       Chrome ask you (only an extension's own page can ask, and only on
 *       a click). Your answer reaches the dashboard over its port as
 *       { type: 'granted', origin, granted }: you may take longer than a
 *       message waits.
 *   { type: 'forget', origin } → { ok: true }  gives a site's permission back.
 *   { type: 'go', url, pattern } → { ok: true, switched }
 *       a link with SWITCH TO OPEN TAB on: focuses an open tab whose
 *       address matches `pattern` (in the dashboard's window first, then
 *       the one used last), or opens `url` in a new tab next to the
 *       dashboard when there's none. Tabs of sites you haven't allowed
 *       can't be seen, so for those it always opens a new one.
 *
 * Site icons: the page loads them from this extension's
 * chrome-extension://<id>/_favicon/ (Chrome's icon cache; the `favicon`
 * permission plus web_accessible_resources in manifest.json).
 * A long-lived port (chrome.runtime.connect(BRIDGE_ID)) receives
 * { type: 'changed' } after any bookmark change; the page then asks for
 * the bar again. While the dashboard can be seen it sends { type: 'ping' }
 * every 20 s, which keeps this worker running (Chrome stops idle ones
 * after 30 s, and a stopped worker can't pass changes on); hidden, it
 * stops, the worker sleeps, and the page asks again when it's shown.
 * If Chrome stops this worker anyway, the port closes and the page
 * reconnects (which starts it again).
 */
import { dashboardBar, describeRoots, simplify } from './tree.js';

const VERSION = chrome.runtime.getManifest().version;

/** What this bridge can do beyond the bookmarks bar (the page shows only what's here). */
const FEATURES = ['favicons', 'open', 'switch'];

/** The chrome:// pages the dashboard may ask to open, by name. Nothing else can be opened. */
const OPENABLE = { ntp: 'chrome://new-tab-page/', bookmarks: 'chrome://bookmarks/' };

/** A site's origin pattern: `https://host/*` (no wildcard host, no port, no path): what SWITCH TO OPEN TAB asks for. */
const ORIGIN = /^https?:\/\/[a-z0-9.-]+\/\*$/i;

/** Is `pattern` (`https://host/path/*`) one that `url` matches, both http(s)? */
function covers(pattern, url) {
  if (typeof pattern !== 'string' || typeof url !== 'string' || !/^https?:\/\/[^*]+\*$/i.test(pattern) || !/^https?:\/\//i.test(url)) return false;
  try {
    const p = new URL(pattern.slice(0, -1));
    const u = new URL(url);
    return p.protocol === u.protocol && p.hostname === u.hostname && u.pathname.startsWith(p.pathname);
  } catch {
    return false;
  }
}

/** Open ports from dashboard pages. */
const ports = new Set();

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (message?.type === 'hello') {
    sendResponse({ ok: true, version: VERSION, features: FEATURES });
    return false;
  }
  if (message?.type === 'open') {
    const url = Object.hasOwn(OPENABLE, message.target) ? OPENABLE[message.target] : null;
    const tab = sender.tab;
    if (!url || tab?.id === undefined) {
      sendResponse({ ok: false, error: 'cannot open that' });
      return false;
    }
    // Next to the dashboard's tab, like a link opened from it (no extra permission needed).
    chrome.tabs
      .create({ url, index: tab.index + 1, openerTabId: tab.id })
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }
  if (message?.type === 'ask') {
    const origin = message.origin;
    if (typeof origin !== 'string' || !ORIGIN.test(origin)) {
      sendResponse({ ok: false, error: 'not a site' });
      return false;
    }
    chrome.permissions
      .contains({ origins: [origin] })
      .then(async (granted) => {
        if (granted) return sendResponse({ ok: true, granted: true, asking: false });
        // Only a click in the bridge's own page can ask: its small window does (grant.js).
        const url = chrome.runtime.getURL(`grant.html?origin=${encodeURIComponent(origin)}`);
        await chrome.windows.create({ url, type: 'popup', width: 480, height: 320, focused: true });
        sendResponse({ ok: true, granted: false, asking: true });
      })
      .catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }
  if (message?.type === 'forget') {
    const origin = message.origin;
    if (typeof origin !== 'string' || !ORIGIN.test(origin)) {
      sendResponse({ ok: false, error: 'not a site' });
      return false;
    }
    // The dashboard's own site is in the manifest and can't be given back (Chrome refuses): nothing to do then.
    chrome.permissions
      .remove({ origins: [origin] })
      .catch(() => false)
      .then(() => sendResponse({ ok: true }));
    return true;
  }
  if (message?.type === 'go') {
    const { url, pattern } = message;
    const from = sender.tab;
    if (!covers(pattern, url) || from?.id === undefined) {
      sendResponse({ ok: false, error: 'cannot go there' });
      return false;
    }
    (async () => {
      // Tabs of sites not allowed come back without addresses, so they never match: a new tab then.
      const open = (await chrome.tabs.query({ url: pattern })).filter((t) => t.id !== from.id && t.id !== undefined);
      // The dashboard's window first, then the tab used last.
      open.sort((a, b) => Number(b.windowId === from.windowId) - Number(a.windowId === from.windowId) || (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0));
      const tab = open[0];
      if (tab) {
        await chrome.tabs.update(tab.id, { active: true });
        await chrome.windows.update(tab.windowId, { focused: true });
        return { ok: true, switched: true };
      }
      await chrome.tabs.create({ url, index: from.index + 1, openerTabId: from.id });
      return { ok: true, switched: false };
    })()
      .then(sendResponse)
      .catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }
  if (message?.type === 'bar') {
    chrome.bookmarks
      .getTree()
      .then((roots) => sendResponse({ ok: true, bar: simplify(dashboardBar(roots)), roots: describeRoots(roots) }))
      .catch((error) => sendResponse({ ok: false, error: String(error) }));
    // The answer comes later (asynchronously).
    return true;
  }
  sendResponse({ ok: false, error: 'unknown request' });
  return false;
});

// The grant window's answer (grant.js, this extension's own page): passed on to every open dashboard.
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type !== 'granted' || sender.id !== chrome.runtime.id || typeof message.origin !== 'string' || !ORIGIN.test(message.origin)) return;
  for (const port of ports) port.postMessage({ type: 'granted', origin: message.origin, granted: message.granted === true });
});

chrome.runtime.onConnectExternal.addListener((port) => {
  ports.add(port);
  port.onDisconnect.addListener(() => ports.delete(port));
  // The dashboard's pings: receiving them is what keeps this worker awake (nothing to answer).
  port.onMessage.addListener(() => {});
});

// One notice per burst: importing or syncing bookmarks fires many events at once.
let pending = 0;
const changed = () => {
  clearTimeout(pending);
  pending = setTimeout(() => {
    for (const port of ports) port.postMessage({ type: 'changed' });
  }, 150);
};
chrome.bookmarks.onCreated.addListener(changed);
chrome.bookmarks.onRemoved.addListener(changed);
chrome.bookmarks.onChanged.addListener(changed);
chrome.bookmarks.onMoved.addListener(changed);
chrome.bookmarks.onChildrenReordered.addListener(changed);
chrome.bookmarks.onImportEnded.addListener(changed);
