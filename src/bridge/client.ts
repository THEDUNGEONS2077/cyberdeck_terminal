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
export const BRIDGE_VERSION = '1.0.0';

/** The bridge download, next to the page (built by vite.config.ts). */
export const BRIDGE_ZIP = 'cyberdeck-bridge.zip';

/** How long to wait for an answer before deciding the bridge isn't there (ms). */
const ANSWER_MS = 3000;

/** The bits of Chrome's messaging API a webpage gets. */
interface Port {
  onMessage: { addListener(fn: (message: unknown) => void): void };
  onDisconnect: { addListener(fn: () => void): void };
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

/** The bridge's version, or null if it isn't there. */
export async function bridgeVersion(): Promise<string | null> {
  const r = await ask({ type: 'hello' });
  return r?.ok && typeof r.version === 'string' ? r.version : null;
}

/** The bookmarks bar from the bridge (checked), or null. */
export async function fetchBar(): Promise<BookmarkNode | null> {
  const r = await ask({ type: 'bar' });
  return r?.ok ? sanitizeTree(r.bar) : null;
}

/**
 * Listens for bookmark changes: calls `onChange` when the bridge says
 * bookmarks changed, and after a lost connection comes back (anything may
 * have changed meanwhile). Chrome stops idle extension workers, which
 * closes the port; reconnecting starts the worker again. Retries back off
 * from 1 s to 30 s, and wait while the page is hidden. Returns a function
 * that stops listening.
 */
export function watchBridge(onChange: () => void): () => void {
  const rt = runtime();
  if (!rt) return () => {};
  let port: Port | null = null;
  let stopped = false;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let delay = 1000;

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
      if ((m as { type?: string } | null)?.type === 'changed') onChange();
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
    delay = Math.min(delay * 2, 30_000);
  };

  open(false);
  return () => {
    stopped = true;
    clearTimeout(retry);
    port?.disconnect();
  };
}
