// e2e/bridge.mjs: the dashboard with the real bridge extension installed
// (`npm run e2e:bridge`: builds for the GitHub Pages path, then runs this).
//
// Chromium (Playwright's full build: the headless shell can't load
// extensions) starts with bridge/ loaded unpacked, in a throwaway profile.
// The dashboard is served at its real production address,
// https://thedungeons2077.github.io/cyberdeck_terminal/, from dist/ by
// Playwright's request routing: nothing goes to the network, and the
// bridge's `externally_connectable` rule is tested exactly as shipped.
// Page service workers are blocked (they'd bypass the routing).
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

/* global chrome -- the functions passed to worker.evaluate run inside the bridge, where `chrome` is the extension API. */

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const shots = join(root, 'e2e/screenshots');
mkdirSync(shots, { recursive: true });
const DASHBOARD = 'https://thedungeons2077.github.io/cyberdeck_terminal/';
const BRIDGE_ID = 'mbjnlinjocmaalhodjhpkadlpifnelic';
/** Bookmarked sites: answered locally with a stub page, so following a link needs no network. */
const SITE = 'https://site.cyberdeck.test/';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.zip': 'application/zip' };

const profile = mkdtempSync(join(tmpdir(), 'cyberdeck-bridge-'));
const bridgeDir = join(root, 'bridge');
const context = await chromium.launchPersistentContext(profile, {
  channel: 'chromium',
  headless: true,
  viewport: { width: 1600, height: 1000 },
  serviceWorkers: 'block',
  args: [`--disable-extensions-except=${bridgeDir}`, `--load-extension=${bridgeDir}`],
});

// The dashboard from dist/ (built for /cyberdeck_terminal/), and stub pages for bookmarked sites.
await context.route(`${DASHBOARD}**`, (route) => {
  const path = new URL(route.request().url()).pathname.replace('/cyberdeck_terminal/', '') || 'index.html';
  try {
    route.fulfill({ body: readFileSync(join(root, 'dist', path)), contentType: TYPES[extname(path)] ?? 'application/octet-stream' });
  } catch {
    route.fulfill({ status: 404, body: 'not found' });
  }
});
await context.route(`${SITE}**`, (route) => route.fulfill({ contentType: 'text/html', body: `<title>SITE</title><h1>${route.request().url()}</h1>` }));

let failed = 0;
const errors = [];
/** One check; a failure is reported and the walk goes on. */
async function path(name, fn) {
  try {
    await fn();
    if (errors.length) throw new Error(`page error: ${errors.splice(0).join(' | ')}`);
    console.log(`✓ ${name}`);
  } catch (e) {
    failed++;
    console.error(`✕ ${name}: ${e.message.split('\n')[0]}`);
  }
}
const expect = (ok, message) => {
  if (!ok) throw new Error(message);
};

try {
  // The bridge's service worker: its URL carries the extension id.
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker', { timeout: 10000 }));
  /** Runs `fn` inside the bridge (it has the chrome.bookmarks API). */
  const inBridge = (fn, arg) => worker.evaluate(fn, arg);

  await path('the bridge loads with the fixed id the page expects', async () => {
    const id = new URL(worker.url()).host;
    expect(id === BRIDGE_ID, `id is ${id}`);
  });

  // A bookmarks bar to mirror: two links, a folder with a link and a nested folder.
  await inBridge(async (site) => {
    const bar = (await chrome.bookmarks.getTree())[0].children.find((n) => n.id === '1');
    await chrome.bookmarks.create({ parentId: bar.id, title: 'Alpha', url: `${site}alpha` });
    await chrome.bookmarks.create({ parentId: bar.id, title: 'Settings', url: 'chrome://settings' });
    const dev = await chrome.bookmarks.create({ parentId: bar.id, title: 'Dev' });
    await chrome.bookmarks.create({ parentId: dev.id, title: 'Beta', url: `${site}beta` });
    const deep = await chrome.bookmarks.create({ parentId: dev.id, title: 'Deep' });
    await chrome.bookmarks.create({ parentId: deep.id, title: 'Gamma', url: `${site}gamma` });
  }, SITE);

  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(DASHBOARD);

  await path('the dashboard (at its production address) connects to the bridge: LIVE', async () => {
    await page.locator('.deck-source', { hasText: 'LIVE' }).waitFor({ timeout: 8000 });
    await page.locator('.deck-source', { hasText: '4 LINKS' }).waitFor();
    await page.getByRole('link', { name: /Alpha/ }).waitFor();
    // chrome:// can't be opened from a webpage: shown, but not a link.
    expect((await page.getByRole('link', { name: /Settings/ }).count()) === 0, 'chrome:// link is clickable');
    await page.locator('.tile.off', { hasText: 'Settings' }).waitFor();
  });

  await path('folders start collapsed, open on click, and stay open after a reload', async () => {
    const head = page.getByRole('button', { name: /DEV/i });
    expect((await head.getAttribute('aria-expanded')) === 'false', 'Dev starts open');
    await head.click();
    await page.getByRole('link', { name: /Beta/ }).waitFor();
    await page.getByRole('button', { name: /DEEP/i }).click();
    await page.getByRole('link', { name: /Gamma/ }).waitFor();
    await page.waitForTimeout(400); // the fold's animation
    await page.screenshot({ path: join(shots, 'bridge-01-live.png') });
    await page.evaluate(() => window.__cyberdeck.settled());
    await page.reload();
    await page.getByRole('link', { name: /Gamma/ }).waitFor({ timeout: 8000 });
  });

  await path('a bookmark added in Chrome appears on the open dashboard', async () => {
    await inBridge(async (site) => chrome.bookmarks.create({ parentId: '1', title: 'Fresh', url: `${site}fresh` }), SITE);
    await page.getByRole('link', { name: /Fresh/ }).waitFor({ timeout: 5000 });
    await page.locator('.deck-source', { hasText: '5 LINKS' }).waitFor();
  });

  await path('SYSTEM shows the live source and the bridge version', async () => {
    await page.keyboard.press('s');
    await page.locator('.setting', { hasText: 'SOURCE' }).getByText('LIVE · BRIDGE v1.1.0').waitFor();
    await page.keyboard.press('Escape');
  });

  await path('the deck is titled NAV, and links show their site icons (from Chrome, via the bridge)', async () => {
    await page.getByRole('heading', { name: '> NAV' }).waitFor();
    const icon = page.getByRole('link', { name: /Alpha/ }).locator('img.favicon');
    await icon.waitFor();
    expect((await icon.getAttribute('src')).startsWith(`chrome-extension://${BRIDGE_ID}/_favicon/?pageUrl=`), 'icon not from the bridge');
    // It loads (Chrome answers with its default icon for a site it hasn't seen).
    await page.waitForFunction(() => document.querySelector('.tile img.favicon')?.naturalWidth > 0, null, { timeout: 5000 });
  });

  await path('a bookmark opens in a new tab; the dashboard stays as it is', async () => {
    const [tab] = await Promise.all([context.waitForEvent('page'), page.getByRole('link', { name: /Alpha/ }).click()]);
    await tab.waitForURL(`${SITE}alpha`);
    // No referrer: the site isn't told where you came from.
    expect((await tab.evaluate(() => document.referrer)) === '', 'the referrer was sent');
    await tab.close();
    expect(page.url() === DASHBOARD, `the dashboard navigated to ${page.url()}`);
  });

  await path('CHROME NEW TAB opens Chrome’s own New Tab page, EDIT BOOKMARKS the Bookmark manager: each in a new tab', async () => {
    for (const [button, url] of [
      ['CHROME NEW TAB', 'chrome://new-tab-page/'],
      ['EDIT BOOKMARKS', 'chrome://bookmarks/'],
    ]) {
      const [tab] = await Promise.all([context.waitForEvent('page'), page.getByRole('button', { name: button }).click()]);
      await tab.waitForURL(url, { timeout: 8000 });
      await tab.close();
    }
    expect(page.url() === DASHBOARD, `the dashboard navigated to ${page.url()}`);
  });

  await path('the next open draws the bar at once from the cache, before the bridge answers', async () => {
    // Slow the bridge down: its answer is held back, so what shows first is the cache.
    await page.addInitScript(() => {
      const rt = window.chrome?.runtime;
      if (!rt) return;
      const send = rt.sendMessage.bind(rt);
      rt.sendMessage = (id, msg, cb) => setTimeout(() => send(id, msg, cb), 1500);
    });
    await page.reload();
    await page.locator('.deck-source', { hasText: 'SYNCING' }).waitFor({ timeout: 1000 });
    await page.getByRole('link', { name: /Fresh/ }).waitFor({ timeout: 500 });
    await page.locator('.deck-source', { hasText: 'LIVE' }).waitFor({ timeout: 8000 });
  });

  await path('with the dashboard open, a new tab switches back to it and closes itself', async () => {
    const before = context.pages().length;
    const blank = await context.newPage();
    const closed = blank.waitForEvent('close', { timeout: 8000 });
    await blank.goto('chrome://newtab/').catch(() => {}); // the tab closes during this
    await closed;
    expect(context.pages().length === before, `${context.pages().length - before} extra tab(s) left open`);
    const active = await inBridge(async () => (await chrome.tabs.query({ active: true, lastFocusedWindow: true }))[0]?.url);
    expect(active === DASHBOARD, `the active tab is ${active}`);
  });

  await path('with no dashboard open, a new tab becomes the dashboard', async () => {
    await page.close();
    const tab = await context.newPage();
    await tab.goto('chrome://newtab/').catch(() => {}); // the redirect interrupts this navigation
    await tab.waitForURL(DASHBOARD, { timeout: 8000 });
    await tab.locator('.deck-source', { hasText: 'LIVE' }).waitFor({ timeout: 8000 });
  });
} finally {
  await context.close();
  rmSync(profile, { recursive: true, force: true });
}
console.log(failed ? `\n${failed} bridge path(s) failed` : '\nall bridge paths passed');
process.exit(failed ? 1 : 0);
