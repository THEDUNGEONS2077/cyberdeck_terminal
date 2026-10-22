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
 *   { type: 'hello' } → { ok: true, version }
 *   { type: 'bar' }   → { ok: true, bar }  (bridge/tree.js shape)
 * A long-lived port (chrome.runtime.connect(BRIDGE_ID)) receives
 * { type: 'changed' } after any bookmark change; the page then asks for
 * the bar again. If Chrome stops this worker the port closes, and the
 * page reconnects (which starts the worker again).
 */
import { findBar, simplify } from './tree.js';

const VERSION = chrome.runtime.getManifest().version;

/** Open ports from dashboard pages. */
const ports = new Set();

chrome.runtime.onMessageExternal.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'hello') {
    sendResponse({ ok: true, version: VERSION });
    return false;
  }
  if (message?.type === 'bar') {
    chrome.bookmarks
      .getTree()
      .then((roots) => sendResponse({ ok: true, bar: simplify(findBar(roots)) }))
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
