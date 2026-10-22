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
const FEATURES = ['favicons', 'open'];

/** The chrome:// pages the dashboard may ask to open, by name. Nothing else can be opened. */
const OPENABLE = { ntp: 'chrome://new-tab-page/', bookmarks: 'chrome://bookmarks/' };

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
