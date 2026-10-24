/**
 * src/bridge/client.ts: talking to the CYBERDECK BRIDGE extension.
 *
 * Layer: browser API (Chrome's extension messaging from a webpage). The
 * bridge's side is bridge/background.js.
 *
 * How a webpage reaches an extension: an extension that lists the page in
 * its manifest's `externally_connectable` makes `chrome.runtime` appear on
 * that page, with sendMessage/connect addressed by the extension's id. So
 * no `chrome.runtime` here means no bridge (or one installed after this
 * page loaded: a reload picks it up).
 *
 * The bridge's id is fixed by the public key in bridge/manifest.json (an
 * unpacked extension's id is otherwise its folder path's hash); a unit
 * test checks the two stay in step.
 */
import { type BookmarkNode, sanitizeTree } from '@/lib/bookmarks';

/** The bridge extension's id (derived from bridge/manifest.json `key`). */
export const BRIDGE_ID = 'mbjnlinjocmaalhodjhpkadlpifnelic';

/** The bridge version this page ships as a download (bridge/manifest.json `version`). */
export const BRIDGE_VERSION = '1.3.0';

/** The bridge download, next to the page (built by vite.config.ts). */
export const BRIDGE_ZIP = 'cyberdeck-bridge.zip';

/** How long to wait for an answer before deciding the bridge isn't there (ms). */
const ANSWER_MS = 3000;

/** The bits of Chrome's messaging API a webpage gets. */
interface Port {
  onMessage: { addListener(fn: (message: unknown) => void): void };
  onDisconnect: { addListener(fn: () => void): void };
  postMessage(message: unknown): void;
  disconnect(): void;
}
interface Runtime {
  sendMessage(id: string, message: unknown, callback: (response: unknown) => void): void;
  connect(id: string): Port;
  lastError?: { message?: string };
}

/** Chrome's runtime API on this page, if an extension made it available. */
function runtime(): Runtime | null {
  const chrome = (globalThis as { chrome?: { runtime?: Partial<Runtime> } }).chrome;
  return chrome?.runtime?.sendMessage && chrome.runtime.connect ? (chrome.runtime as Runtime) : null;
}

/** Could the bridge be here? (False: certainly not; reload after installing it.) */
export function bridgePossible(): boolean {
  return runtime() !== null;
}

/** Sends one message to the bridge; null if it doesn't answer (not installed, disabled, too slow). */
function ask(message: unknown): Promise<Record<string, unknown> | null> {
  const rt = runtime();
  if (!rt) return Promise.resolve(null);
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ANSWER_MS);
    try {
      rt.sendMessage(BRIDGE_ID, message, (response) => {
        clearTimeout(timer);
        // Reading lastError marks the failure as handled (Chrome logs it otherwise).
        const failed = !!rt.lastError;
        resolve(!failed && response && typeof response === 'object' ? (response as Record<string, unknown>) : null);
      });
    } catch {
      clearTimeout(timer);
      resolve(null);
    }
  });
}

/** What an installed bridge says about itself. */
export interface BridgeInfo {
  version: string;
  /**
   * What it can do beyond the bookmarks bar: 'favicons' (site icons),
   * 'open' (Chrome's New Tab page, Bookmark manager), 'switch' (SWITCH TO
   * OPEN TAB, 1.3.0). Bridge 1.0.0 had none.
   */
  features: string[];
}

/** The bridge's version and features, or null if it isn't there. */
export async function bridgeInfo(): Promise<BridgeInfo | null> {
  const r = await ask({ type: 'hello' });
  if (!r?.ok || typeof r.version !== 'string') return null;
  const features = Array.isArray(r.features) ? r.features.filter((f): f is string => typeof f === 'string') : [];
  return { version: r.version, features };
}

/** The Chrome pages the bridge can open for the page (bridge/background.js OPENABLE). */
export type ChromePage = 'ntp' | 'bookmarks';

/**
 * Asks the bridge to open Chrome's own New Tab page or Bookmark manager in
 * a new tab next to this one (a webpage can't open chrome:// itself).
 * True if it did.
 */
export async function openChromePage(target: ChromePage): Promise<boolean> {
  const r = await ask({ type: 'open', target });
  return !!r?.ok;
}

/** What the bridge said to SWITCH TO OPEN TAB for a site: allowed already, asking you in its window, or no answer. */
export type AskResult = 'granted' | 'asking' | null;

/**
 * Asks the bridge to see `site`'s tabs (`https://host/*`, lib/switching.ts
 * siteOf). Already allowed: 'granted'. Otherwise the bridge opens its own
 * small window to ask you ('asking'); your answer arrives later through
 * watchBridge's `onGranted` (it can take longer than a message waits).
 */
export async function askToSwitch(site: string): Promise<AskResult> {
  const r = await ask({ type: 'ask', origin: site });
  if (!r?.ok) return null;
  return r.granted === true ? 'granted' : r.asking === true ? 'asking' : null;
}

/** Gives the bridge's permission for `site` back (when no link needs it any more). */
export async function forgetSite(site: string): Promise<void> {
  await ask({ type: 'forget', origin: site });
}

/**
 * Asks the bridge to switch to an open tab under `pattern`, or to open
 * `url` in a new tab next to this one when there's none. True if it did
 * either (false: no bridge, or no answer, and the page opens it itself).
 */
export async function goToTab(url: string, pattern: string): Promise<boolean> {
  const r = await ask({ type: 'go', url, pattern });
  return !!r?.ok;
}

/**
 * A bookmark's site icon from Chrome's icon cache, via the bridge
 * (chrome-extension://<id>/_favicon/), as a srcset: 16 px for ordinary
 * screens, 32 px for sharper ones, so the 16 px icon is always crisp.
 */
export function faviconSrcSet(pageUrl: string): string {
  const base = `chrome-extension://${BRIDGE_ID}/_favicon/?pageUrl=${encodeURIComponent(pageUrl)}`;
  return `${base}&size=16 1x, ${base}&size=32 2x`;
}

/** What the bridge reports reading from Chrome (bridge 1.2+): copies of the bar, and items in each part. */
export interface BridgeRoots {
  /** How many bookmarks bars Chrome keeps (2 when signed in: your Google Account's and this device's). */
  bars: number;
  bar: number;
  other: number;
  mobile: number;
}

/** The bookmarks bar from the bridge (checked), and what it read; null if it didn't answer. */
export async function fetchBar(): Promise<{ bar: BookmarkNode; roots: BridgeRoots | null } | null> {
  const r = await ask({ type: 'bar' });
  const bar = r?.ok ? sanitizeTree(r.bar) : null;
  if (!bar) return null;
  const raw = r?.roots as Partial<BridgeRoots> | undefined;
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  return { bar, roots: raw && typeof raw === 'object' ? { bars: n(raw.bars), bar: n(raw.bar), other: n(raw.other), mobile: n(raw.mobile) } : null };
}

/** While the page can be seen, it pings the bridge this often: it keeps the bridge's worker awake (Chrome stops idle ones after 30 s). */
const PING_MS = 20_000;

/**
 * Listens for bookmark changes: calls `onChange` when the bridge says
 * bookmarks changed, and after a lost connection comes back (anything may
 * have changed meanwhile). `onGranted` hears your answer in the bridge's
 * SWITCH TO OPEN TAB window (askToSwitch). While the page can be seen it pings the bridge
 * every PING_MS, so its worker stays awake and every change arrives at
 * once; hidden, the pings stop and the worker may sleep. If the port
 * closes anyway, reconnecting starts the worker again: retries back off
 * from 1 s to 10 s, and wait while the page is hidden. Returns a function
 * that stops listening.
 */
export function watchBridge(onChange: () => void, onGranted: (site: string, granted: boolean) => void = () => {}): () => void {
  const rt = runtime();
  if (!rt) return () => {};
  let port: Port | null = null;
  let stopped = false;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let delay = 1000;
  // Pings while the page can be seen (they keep the bridge's worker awake).
  const ping = setInterval(() => {
    if (document.hidden || !port) return;
    try {
      port.postMessage({ type: 'ping' });
    } catch {
      // The port just closed: onDisconnect reconnects.
    }
  }, PING_MS);

  const open = (again: boolean) => {
    if (stopped) return;
    try {
      port = rt.connect(BRIDGE_ID);
    } catch {
      port = null;
    }
    if (!port) return schedule();
    port.onMessage.addListener((m) => {
      delay = 1000; // it's alive
      const msg = m as { type?: string; origin?: unknown; granted?: unknown } | null;
      if (msg?.type === 'changed') onChange();
      else if (msg?.type === 'granted' && typeof msg.origin === 'string') onGranted(msg.origin, msg.granted === true);
    });
    port.onDisconnect.addListener(() => {
      void rt.lastError; // handled
      port = null;
      schedule();
    });
    if (again) onChange();
  };
  // A hidden page (another tab in front) doesn't keep waking the bridge: it reconnects when shown.
  const whenVisible = () => {
    if (!document.hidden) return open(true);
    const onShow = () => {
      if (document.hidden) return;
      document.removeEventListener('visibilitychange', onShow);
      open(true);
    };
    document.addEventListener('visibilitychange', onShow);
  };
  const schedule = () => {
    if (stopped) return;
    clearTimeout(retry);
    retry = setTimeout(whenVisible, delay);
    delay = Math.min(delay * 2, 10_000);
  };

  open(false);
  return () => {
    stopped = true;
    clearTimeout(retry);
    clearInterval(ping);
    port?.disconnect();
  };
}
