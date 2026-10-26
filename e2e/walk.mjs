// e2e/walk.mjs: cyberdeck_terminal end to end in headless Chromium
// (`npm run e2e`, after `npm run build`).
//
// Serves dist/ with the serve binary itself (not `npx serve`, whose child
// process would outlive it), on 127.0.0.1 only, and always stops it.
// CYBERDECK_BASE=/cyberdeck_terminal/ serves the build at that sub-path,
// the way GitHub Pages does (build it with the same variable first).
// Each path runs on the same page, in order, building on the one before;
// screens are saved to e2e/screenshots/ for review.
import { spawn } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const shots = join(root, 'e2e/screenshots');
mkdirSync(shots, { recursive: true });
const PORT = 8163;
const BASE = process.env.CYBERDECK_BASE ?? '/';
const URL = `http://127.0.0.1:${PORT}${BASE}`;

// A sub-path build is served from a temporary root with dist/ copied in at that path.
let serveDir = join(root, 'dist');
let tempRoot = null;
if (BASE !== '/') {
  tempRoot = mkdtempSync(join(tmpdir(), 'cyberdeck-walk-'));
  cpSync(serveDir, join(tempRoot, BASE), { recursive: true });
  serveDir = tempRoot;
}
const server = spawn(join(root, 'node_modules/.bin/serve'), [serveDir, '-l', `tcp://127.0.0.1:${PORT}`, '--no-port-switching'], { cwd: root, stdio: 'ignore' });
for (let i = 0; i < 50; i++) {
  try {
    await fetch(URL);
    break;
  } catch {
    await new Promise((r) => setTimeout(r, 200));
  }
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, acceptDownloads: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
let failed = 0;

/** One check: runs the steps, then fails on any page error. */
async function path(name, fn) {
  try {
    await fn();
    if (errors.length) throw new Error(`page error: ${errors.splice(0).join(' | ')}`);
    console.log(`✓ ${name}`);
  } catch (e) {
    failed++;
    console.error(`✕ ${name}: ${e.message.split('\n')[0]}`);
    await page.screenshot({ path: join(shots, `FAILED-${name.replace(/[^a-z0-9]+/gi, '-').slice(0, 60)}.png`) }).catch(() => {});
  }
}
const shot = (name) => page.screenshot({ path: join(shots, `${name}.png`) });
const expect = (ok, message) => {
  if (!ok) throw new Error(message);
};
/** The SYSTEM panel's reminder setting. */
const reminder = () => page.getByLabel('REMIND TO EXPORT AFTER');
/** Waits for the page's storage writes to land. */
const settled = () => page.evaluate(() => window.__cyberdeck.settled());
/**
 * The wallpaper canvas as it is now (the host's probe: the canvas belongs to
 * the wallpaper's worker, so the page can't read it): `lit`, the share of
 * pixels with alpha above a faint residue, and `sig`, a fingerprint.
 */
const rain = () => page.evaluate(() => window.__cyberdeckRain.pixels());
/** The share of the canvas that's lit. */
const litPixels = async () => (await rain()).lit;
/** axe-core: WCAG 2.2 A/AA and best practice, the same gate as quest_log_desktop. */
const audit = async (state) => {
  // axe is added to the page once per load (a reload drops it).
  if (!(await page.evaluate(() => !!window.axe))) await page.addScriptTag({ path: join(root, 'node_modules/axe-core/axe.min.js') });
  await page.waitForTimeout(400);
  const found = await page.evaluate(async () => {
    const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } });
    return r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target.join(' ')}`);
  });
  if (found.length) throw new Error(`${state}: ${found.join(' | ')}`);
};

let backupPath = null;

try {
  const opened = Date.now();
  await page.goto(URL);
  await page.locator('.brand').waitFor();

  await path('opens on a screen already full of rain, with the HUD', async () => {
    // The canvas is pre-warmed (in slices, without stalling the page), then fades in already full.
    await page.locator('.wallpaper-canvas[data-ready]').waitFor({ state: 'attached', timeout: 5000 });
    const lit = await litPixels();
    expect(lit > 0.02, `canvas only ${(lit * 100).toFixed(2)}% lit`);
    // The wallpaper runs in its own worker, off the page's main thread.
    const mode = await page.evaluate(() => window.__cyberdeckRain.mode());
    expect(mode === 'worker', `the wallpaper runs on the ${mode}, not in a worker`);
    console.log(`  (first full frame within ${Date.now() - opened} ms; ${(lit * 100).toFixed(1)}% of pixels lit; drawn in a worker)`);
    await page.getByRole('button', { name: 'FULLSCREEN' }).waitFor();
    await page.getByRole('button', { name: 'SYSTEM' }).waitFor();
    await shot('01-open');
  });

  await path('with no bridge: the CONNECT prompt offers the bridge download and the import', async () => {
    await page.getByText('LINK YOUR BOOKMARKS BAR').waitFor({ timeout: 5000 });
    const href = await page.getByRole('link', { name: 'DOWNLOAD BRIDGE' }).getAttribute('href');
    const zip = await page.evaluate(async (h) => new Uint8Array(await (await fetch(h)).arrayBuffer()).slice(0, 4).join(','), href);
    expect(zip === '80,75,3,4', `the bridge download isn't a zip (${zip})`);
    await page.getByRole('button', { name: 'Copy chrome://extensions' }).waitFor();
    await page.waitForTimeout(300);
    await shot('07-connect');
    await page.addScriptTag({ path: join(root, 'node_modules/axe-core/axe.min.js') });
    await audit('the CONNECT prompt');
  });

  await path('IMPORT BOOKMARKS.HTML: the bar shows as a copy; folders fold open, nested ones too', async () => {
    await page.getByLabel('Bookmarks file to import').first().setInputFiles(join(root, 'e2e/fixtures/bookmarks.html'));
    await page.locator('.toast', { hasText: 'IMPORTED 5 LINKS' }).waitFor();
    await page.locator('.deck-source', { hasText: 'COPY' }).waitFor();
    await page.getByRole('heading', { name: '> NAV' }).waitFor();
    // No bridge: no Chrome buttons, and the accent › stands in for site icons.
    expect((await page.getByRole('button', { name: 'CHROME NEW TAB' }).count()) === 0, 'Chrome buttons without a bridge');
    expect((await page.locator('img.favicon').count()) === 0, 'site icons without a bridge');
    await page.getByRole('link', { name: /GitHub/ }).waitFor();
    await page.getByRole('link', { name: /Hacker News/ }).waitFor();
    await page.getByRole('button', { name: /^dev\b/i }).click();
    await page.getByRole('link', { name: /MDN/ }).waitFor();
    await page.getByRole('button', { name: /^tools/i }).click();
    // A bookmarklet can't run from a webpage: listed, not a link.
    await page.locator('.row-link.off', { hasText: 'Bookmarklet' }).waitFor();
    await page.waitForTimeout(400);
    await shot('08-imported');
    await audit('the imported bar, folders open');
    await page.getByRole('button', { name: /^tools/i }).click(); // leaves DEV open
    await settled();
  });

  await path('/ opens the finder: type to find (at any depth), the match lit; Enter opens it in a new tab', async () => {
    // Opening is checked without leaving the test machine: window.open is recorded instead.
    await page.evaluate(() => {
      window.__opened = [];
      window.open = (url) => {
        window.__opened.push(url);
        return null;
      };
    });
    await page.locator('body').click({ position: { x: 5, y: 600 } }); // the page has the keyboard
    await page.keyboard.press('/');
    const finder = page.getByRole('dialog', { name: 'Find' });
    await finder.waitFor();
    await page.keyboard.type('mdn');
    await finder.locator('[role="option"][aria-selected="true"]', { hasText: 'MDN' }).waitFor();
    expect((await finder.locator('mark').first().textContent()) === 'MDN', 'the match isn’t lit');
    // The finder's entrance fade done, for the screenshot: its own animations only (the brand
    // panel's scanlines loop forever, so waiting on every animation would never end), at most 1 s.
    await page
      .locator('.finder-layer')
      .evaluate((el) => Promise.race([Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => {}))), new Promise((r) => setTimeout(r, 1000))]));
    await shot('09a-finder');
    await page.addScriptTag({ path: join(root, 'node_modules/axe-core/axe.min.js') });
    await audit('the finder');
    await page.keyboard.press('Enter');
    await finder.waitFor({ state: 'detached' });
    const opened = await page.evaluate(() => window.__opened);
    expect(opened[0] === 'https://developer.mozilla.org/', `opened ${opened}`);
  });

  await path('the finder runs commands, Esc clears then closes, and ↑↓ choose', async () => {
    await page.keyboard.press('/');
    await page.keyboard.type('open system');
    await page.getByRole('option', { name: /OPEN SYSTEM/ }).waitFor();
    await page.keyboard.press('Enter');
    await page.getByRole('dialog', { name: 'SYSTEM' }).waitFor();
    await page.keyboard.press('Escape');
    await page.getByRole('dialog', { name: 'SYSTEM' }).waitFor({ state: 'detached' });
    await page.keyboard.press('/');
    await page.keyboard.type('news');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Escape'); // clears
    expect((await page.getByRole('combobox').inputValue()) === '', 'Esc didn’t clear');
    await page.keyboard.press('Escape'); // closes
    await page.getByRole('dialog', { name: 'Find' }).waitFor({ state: 'detached' });
  });

  await path('arrow keys move between tiles and folders; an open folder drops down as a list', async () => {
    await page.locator('.tile', { hasText: 'GitHub' }).focus();
    await page.keyboard.press('ArrowRight');
    expect(await page.evaluate(() => document.activeElement?.textContent?.includes('Mail & more')), '→ didn’t move to the next tile');
    await page.keyboard.press('ArrowDown');
    const below = await page.evaluate(() => document.activeElement?.className);
    expect(/folder-head|row-link|tile/.test(below ?? ''), `↓ went to ${below}`);
    await page.keyboard.press('Home');
    expect(await page.evaluate(() => document.activeElement?.textContent?.includes('GitHub')), 'Home didn’t go to the first item');
    // A dropdown in its own grid cell, one link per row (user's choice, 2026-10-23).
    const span = await page.locator('[data-item-key="f:Dev"]').evaluate((el) => getComputedStyle(el).gridColumnStart);
    expect(span === 'auto', `the open folder spans ${span}`);
    // Every link on a line of its own: each one starts below the one before.
    const ys = await page.locator('[data-item-key="f:Dev"] .row-link').evaluateAll((links) => links.map((a) => Math.round(a.getBoundingClientRect().top)));
    expect(ys.length > 1 && ys.every((y, i) => i === 0 || y > ys[i - 1]), `the folder's links aren't one per line (tops: ${ys})`);
  });

  // --- Edit mode (on the imported bar: GitHub, Mail & more, Hacker News; folders Dev > Tools / Utils) ---
  /** The keys of a section's tiles, in order (NAV: 'main', or an area's id). */
  const tilesIn = (section) => page.locator(`[data-section="${section}"][data-kind="link"] .link-title`).allInnerTexts();
  /** Drags from one element's middle to a point inside another, in small steps (a real pointer drag). */
  const drag = async (from, to, where = 'center') => {
    const a = await from.boundingBox();
    const b = await to.boundingBox();
    const tx = where === 'left' ? b.x + 6 : b.x + b.width / 2;
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(a.x + a.width / 2 + 12, a.y + a.height / 2 + 6, { steps: 3 });
    await page.mouse.move(tx, b.y + b.height / 2, { steps: 8 });
    await page.waitForTimeout(80);
    await page.mouse.up();
    await page.waitForTimeout(150);
  };
  const editBar = () => page.getByRole('toolbar', { name: 'Edit layout' });

  await path('EDIT unlocks the layout: the edit bar, grips and ⋯ menus; links don’t open', async () => {
    await page.getByRole('button', { name: 'EDIT', exact: true }).click();
    await editBar().waitFor();
    await page.getByRole('button', { name: /^Move NAV/ }).waitFor();
    await page.getByRole('button', { name: 'Arrange GitHub' }).waitFor();
    const pages = context.pages().length;
    await page.locator('.tile', { hasText: 'GitHub' }).click();
    await page.waitForTimeout(300);
    expect(context.pages().length === pages, 'a link opened while editing');
    await shot('09-edit');
  });

  await path('+ AREA makes an area, its name ready to type', async () => {
    await editBar().getByRole('button', { name: '+ AREA' }).click();
    const name = page.getByRole('textbox', { name: /^Name of area/ });
    await name.waitFor();
    expect(await name.evaluate((el) => el === document.activeElement), 'the name field doesn’t have the cursor');
    await name.fill('work');
    await name.press('Enter');
    await page.locator('[data-area-id]', { hasText: '' }).first().waitFor();
    expect((await name.inputValue()) === 'WORK', `area named ${await name.inputValue()}`);
  });

  await path('dragging a tile into an area moves it there', async () => {
    const area = page.locator('[data-area-id]').first();
    const areaId = await area.getAttribute('data-area-id');
    await drag(page.locator('.tile', { hasText: 'GitHub' }), area.locator('.section-items'));
    expect(JSON.stringify(await tilesIn(areaId)) === '["GitHub"]', `area holds ${await tilesIn(areaId)}`);
    expect(!(await tilesIn('main')).includes('GitHub'), 'GitHub is still in NAV');
  });

  await path('dragging reorders NAV', async () => {
    await drag(page.locator('.tile', { hasText: 'Hacker News' }), page.locator('.tile', { hasText: 'Mail & more' }), 'left');
    const order = await tilesIn('main');
    expect(JSON.stringify(order) === '["Hacker News","Mail & more"]', `NAV order is ${order}`);
  });

  await path('a link inside a folder can be dragged out into NAV', async () => {
    await drag(page.locator('.row-link', { hasText: 'MDN' }), page.locator('[data-drop-section="main"]').first());
    expect((await tilesIn('main')).includes('MDN'), 'MDN isn’t in NAV');
    expect((await page.locator('.row-link', { hasText: 'MDN' }).count()) === 0, 'MDN is still in its folder');
  });

  await path('the ⋯ menu works from the keyboard: hide, then SHOW from the tray', async () => {
    await page.getByRole('button', { name: 'Arrange Mail & more' }).focus();
    await page.keyboard.press('Enter');
    const menu = page.getByRole('menu');
    await menu.waitFor();
    await page.waitForTimeout(100);
    for (let i = 0; i < 8; i++) {
      if ((await page.evaluate(() => document.activeElement?.textContent ?? '')).endsWith('HIDE')) break;
      await page.keyboard.press('ArrowDown');
    }
    await shot('10-menu');
    await page.keyboard.press('Enter');
    await page.getByRole('region', { name: 'Hidden' }).getByText('Mail & more').waitFor();
    expect(!(await tilesIn('main')).includes('Mail & more'), 'still shown after HIDE');
    await page.getByRole('button', { name: 'Show Mail & more' }).click();
    await page.locator('.tile', { hasText: 'Mail & more' }).waitFor();
  });

  await path('UNDO steps back one change; REVERT goes back to how it was before editing', async () => {
    await editBar().getByRole('button', { name: 'UNDO' }).click(); // un-SHOW: hidden again
    await page.getByRole('region', { name: 'Hidden' }).getByText('Mail & more').waitFor();
    await page.keyboard.press('Control+z'); // un-HIDE
    await page.locator('.tile', { hasText: 'Mail & more' }).waitFor();
    await editBar().getByRole('button', { name: 'REVERT' }).click();
    await page.waitForFunction(() => !document.querySelector('[data-area-id]'));
    expect((await tilesIn('main')).includes('GitHub'), 'REVERT didn’t bring GitHub back to NAV');
    await editBar().getByRole('button', { name: 'UNDO' }).click(); // undo the revert: the arrangement is back
    await page.locator('[data-area-id]').first().waitFor();
  });

  await path('panels move: drag NAV by its grip, nudge the brand with the keys, resize NAV; RESET PANELS', async () => {
    const nav = page.locator('.deck-area');
    const before = await nav.boundingBox();
    const grip = page.getByRole('button', { name: /^Move NAV/ });
    const g = await grip.boundingBox();
    await page.mouse.move(g.x + 8, g.y + 8);
    await page.mouse.down();
    await page.mouse.move(g.x + 60, g.y + 40, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(150);
    const after = await nav.boundingBox();
    expect(Math.abs(after.x - before.x - 52) < 4 && Math.abs(after.y - before.y - 32) < 4, `NAV moved by ${after.x - before.x}, ${after.y - before.y}`);
    const brand = page.locator('.hud-brand');
    const b0 = await brand.boundingBox();
    await page.getByRole('button', { name: /^Move the brand panel/ }).focus();
    await page.keyboard.press('Shift+ArrowRight');
    await page.waitForTimeout(100);
    const b1 = await brand.boundingBox();
    expect(b1.x > b0.x + 40, `brand moved by ${b1.x - b0.x}`);
    await page.getByRole('button', { name: /^Resize NAV/ }).focus();
    await page.keyboard.press('Shift+ArrowLeft');
    await page.waitForTimeout(100);
    expect((await nav.boundingBox()).width < after.width - 40, 'NAV didn’t narrow');
    await shot('11-panels-moved');
    await editBar().getByRole('button', { name: 'RESET PANELS' }).click();
    await page.waitForTimeout(100);
    const reset = await nav.boundingBox();
    expect(Math.abs(reset.x - before.x) < 2 && Math.abs(reset.y - before.y) < 2, 'RESET PANELS didn’t put NAV back');
  });

  await path('no accessibility violations in edit mode', async () => {
    await audit('edit mode');
  });

  await path('DONE locks the layout: links open again, and it all survives a reload', async () => {
    await page.getByRole('button', { name: 'DONE' }).click();
    await page.waitForFunction(() => !document.querySelector('[role="toolbar"]'));
    expect((await page.getByRole('button', { name: /^Arrange/ }).count()) === 0, 'menus still shown');
    const [tab] = await Promise.all([context.waitForEvent('page'), page.locator('.tile', { hasText: 'Hacker News' }).click()]);
    await tab.close();
    await settled();
    await page.reload();
    await page.locator('[data-area-id]', { hasText: 'WORK' }).waitFor({ timeout: 5000 });
    expect(JSON.stringify(await tilesIn('main')) === '["Hacker News","Mail & more","MDN"]', `NAV after reload: ${await tilesIn('main')}`);
    // The dashboard is up before the rain (it no longer waits for it): the screenshot waits for both.
    await page.locator('.wallpaper-canvas[data-ready]').waitFor({ state: 'attached', timeout: 5000 });
    await page.waitForTimeout(300);
    await shot('12-locked-with-area');
    // Folding an area works when locked too.
    await page.getByRole('button', { name: /^WORK/ }).click();
    await page.waitForFunction(() => document.querySelector('.area')?.classList.contains('collapsed'));
    await page.getByRole('button', { name: /^WORK/ }).click();
  });

  await path('CHROME ORDER asks first, then puts everything back where Chrome has it', async () => {
    await page.getByRole('button', { name: 'EDIT', exact: true }).click();
    await editBar().getByRole('button', { name: 'CHROME ORDER' }).click();
    await page.getByText('RELOAD CHROME ORDER?').waitFor();
    await page.getByRole('button', { name: 'RELOAD', exact: true }).click();
    await page.waitForFunction(() => !document.querySelector('[data-area-id]'));
    const order = await tilesIn('main');
    expect(JSON.stringify(order) === '["GitHub","Mail & more","Hacker News"]', `after CHROME ORDER: ${order}`);
    await page.keyboard.press('Escape'); // Esc locks it again
    await page.waitForFunction(() => !document.querySelector('[role="toolbar"]'));
    await settled();
  });

  // --- Modules (app/modules/): SEARCH, QUICK LAUNCH, TIME ---
  /** A module's panel, by its kind's name. */
  const mod = (name) => page.getByRole('region', { name, exact: true });
  /** Opens a module's ⋯ ▸ SETTINGS (edit mode). */
  const settingsOf = async (name) => {
    await page.getByRole('button', { name: `${name} module options` }).click();
    await page.getByRole('menuitem', { name: 'SETTINGS…' }).click();
    await page.getByRole('dialog', { name: `${name} · SETTINGS` }).waitFor();
  };
  /** Every request off this page's own server gets a blank page (searches, tiles): the walk stays offline. */
  // (globalThis.URL: this file's own URL is the page's address.)
  const offline = (route) => (new globalThis.URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.fulfill({ body: 'ok', contentType: 'text/plain' }));

  await path('+ MODULE adds SEARCH, QUICK LAUNCH and TIME, each at a free spot, with the keyboard on its grip', async () => {
    await page.getByRole('button', { name: 'EDIT', exact: true }).click();
    for (const name of ['SEARCH', 'QUICK LAUNCH', 'TIME']) {
      await editBar().getByRole('button', { name: '+ MODULE' }).click();
      await page.getByRole('menu', { name: 'Add a module' }).waitFor();
      await page.getByRole('menuitem', { name }).click();
      await mod(name).waitFor();
      await page.waitForFunction((n) => document.activeElement?.getAttribute('aria-label')?.startsWith(`Move the ${n} module`), name);
    }
    const tops = await page.locator('.module').evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
    expect(tops.length === 3 && tops[0] < tops[1] && tops[1] < tops[2], `modules at ${tops}`);
    // Beside NAV on a 1920 px screen, not over it.
    const nav = await page.locator('.deck-area').boundingBox();
    const left = await page.locator('.module').first().boundingBox();
    expect(left.x >= nav.x + nav.width - 4, `SEARCH overlaps NAV (${left.x} < ${nav.x + nav.width})`);
    await shot('18-modules-edit');
  });

  await path('modules move (drag, arrow keys) and resize (arrow keys), undoably', async () => {
    const time = page.locator('.module[data-kind="time"]');
    const t0 = await time.boundingBox();
    const grip = await page.getByRole('button', { name: /^Move the TIME module/ }).boundingBox();
    await page.mouse.move(grip.x + 8, grip.y + 8);
    await page.mouse.down();
    await page.mouse.move(grip.x - 300, grip.y + 60, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(150);
    const t1 = await time.boundingBox();
    expect(Math.abs(t1.x - (t0.x - 308)) < 4 && Math.abs(t1.y - (t0.y + 52)) < 4, `TIME moved by ${t1.x - t0.x}, ${t1.y - t0.y}`);
    await page.getByRole('button', { name: /^Move the TIME module/ }).focus();
    await page.keyboard.press('Shift+ArrowUp');
    await page.waitForTimeout(100);
    expect((await time.boundingBox()).y < t1.y - 40, 'the arrow keys didn’t move TIME');
    await page.getByRole('button', { name: /^Resize the TIME module/ }).focus();
    await page.keyboard.press('Shift+ArrowRight');
    await page.waitForTimeout(100);
    expect((await time.boundingBox()).width > t1.width + 40, 'TIME didn’t widen');
    for (let i = 0; i < 3; i++) await editBar().getByRole('button', { name: 'UNDO' }).click();
    await page.waitForTimeout(100);
    const back = await time.boundingBox();
    expect(Math.abs(back.x - t0.x) < 2 && Math.abs(back.y - t0.y) < 2 && Math.abs(back.width - t0.width) < 2, 'UNDO didn’t put TIME back');
  });

  await path('a dropped panel settles flush beside NAV (within 8 px), undoably', async () => {
    const time = page.locator('.module[data-kind="time"]');
    const nav = await page.locator('.deck-area').boundingBox();
    const t0 = await time.boundingBox();
    const grip = await page.getByRole('button', { name: /^Move the TIME module/ }).boundingBox();
    // Aim 5 px right of the spot beside NAV (its right edge + the 8 px gap), and a little down.
    const dx = nav.x + nav.width + 8 + 5 - t0.x;
    await page.mouse.move(grip.x + 8, grip.y + 8);
    await page.mouse.down();
    await page.mouse.move(grip.x + 8 + dx, grip.y + 8 + 40, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(150);
    const t1 = await time.boundingBox();
    expect(Math.abs(t1.x - (nav.x + nav.width + 8)) < 1.5, `TIME settled at ${t1.x}, not beside NAV at ${nav.x + nav.width + 8}`);
    await editBar().getByRole('button', { name: 'UNDO' }).click();
    await page.waitForTimeout(100);
    expect(Math.abs((await time.boundingBox()).x - t0.x) < 2, 'UNDO didn’t put TIME back');
  });

  await path('SETTINGS: SEARCH takes a custom engine, QUICK LAUNCH a tile, TIME a countdown', async () => {
    await settingsOf('SEARCH');
    const field = page.getByLabel(/^CUSTOM ENGINE/);
    await field.fill('search.example/?q=%s');
    expect(await page.getByRole('button', { name: 'USE IT' }).isDisabled(), 'an address without https:// was taken');
    await field.fill('https://search.example/?q=%s');
    await page.getByRole('button', { name: 'USE IT' }).click();
    await page.getByRole('radio', { name: /^CUSTOM/ }).waitFor();
    expect(await page.getByRole('radio', { name: /^CUSTOM/ }).isChecked(), 'the custom engine isn’t chosen');
    await page.keyboard.press('Escape');
    await mod('SEARCH').getByText('CUSTOM', { exact: true }).waitFor();

    await settingsOf('QUICK LAUNCH');
    await page.getByLabel('+ TILE · ADDRESS').fill('example.com');
    await page.getByLabel('TITLE (OPTIONAL)').fill('Example');
    await page.getByRole('button', { name: '+ TILE', exact: true }).click();
    await page.locator('.tile-list-row', { hasText: 'Example' }).waitFor();
    await page.keyboard.press('Escape');

    await settingsOf('TIME');
    const inTwelve = await page.evaluate(() => {
      const d = new Date();
      d.setDate(d.getDate() + 12);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
    await page.getByLabel('+ COUNTDOWN · LABEL').fill('launch');
    await page.getByLabel('DATE', { exact: true }).fill(inTwelve);
    await page.getByRole('button', { name: '+ COUNTDOWN' }).click();
    await page.locator('.tile-list-row', { hasText: 'LAUNCH' }).waitFor();
    await shot('19-module-settings');
    await audit('TIME’s settings');
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'detached' });
    // Esc closed SETTINGS only: still editing.
    await editBar().waitFor();
    await mod('TIME').getByText('12 DAYS').waitFor();
  });

  await path('a bookmark’s ⋯ ▸ PIN TO QUICK LAUNCH makes it a tile', async () => {
    await page.getByRole('button', { name: 'Arrange Hacker News' }).click();
    await page.getByRole('menuitem', { name: 'PIN TO QUICK LAUNCH' }).click();
    await mod('QUICK LAUNCH').locator('.launch-tile', { hasText: 'Hacker News' }).waitFor();
    // Pinned once: the menu doesn't offer it again.
    await page.getByRole('button', { name: 'Arrange Hacker News' }).click();
    expect((await page.getByRole('menuitem', { name: 'PIN TO QUICK LAUNCH' }).count()) === 0, 'PIN offered twice');
    await page.keyboard.press('Escape');
  });

  await path('⋯ ▸ REMOVE takes a module away; UNDO brings it back', async () => {
    await page.getByRole('button', { name: 'TIME module options' }).click();
    await page.getByRole('menuitem', { name: 'REMOVE' }).click();
    await mod('TIME').waitFor({ state: 'detached' });
    expect(await page.evaluate(() => document.activeElement?.textContent?.includes('+ MODULE')), 'the keyboard isn’t on + MODULE');
    await editBar().getByRole('button', { name: 'UNDO' }).click();
    await mod('TIME').getByText('12 DAYS').waitFor();
  });

  await path('the brand panel is optional: ⋯ ▸ REMOVE takes it away, + MODULE ▸ BRAND PANEL brings it back', async () => {
    await page.getByRole('button', { name: 'Brand panel options' }).click();
    await page.getByRole('menuitem', { name: 'REMOVE' }).click();
    await page.locator('.hud-brand').waitFor({ state: 'detached' });
    await audit('the brand panel removed');
    await editBar().getByRole('button', { name: '+ MODULE' }).click();
    await page.getByRole('menuitem', { name: 'BRAND PANEL' }).click();
    await page.locator('.hud-brand').waitFor();
    // Removed again, UNDO brings it back too; and only one: + MODULE doesn't offer it while it's there.
    await editBar().getByRole('button', { name: '+ MODULE' }).click();
    expect((await page.getByRole('menuitem', { name: 'BRAND PANEL' }).count()) === 0, 'BRAND PANEL offered while shown');
    await page.keyboard.press('Escape');
  });

  await path('modules are drawn 30% smaller; the brand panel keeps its size; items show names, not addresses', async () => {
    const search = page.locator('.module[data-kind="search"]');
    const w = await search.evaluate((el) => el.getBoundingClientRect().width);
    const stored = await page.evaluate(() => window.__cyberdeck.layout().modules.find((m) => m.kind === 'search').place.w);
    expect(Math.abs(w - stored * 0.7) < 2, `SEARCH drawn ${w} px wide for a width of ${stored}`);
    const brandSize = await page.locator('.hud-brand .brand-name').evaluate((el) => getComputedStyle(el).fontSize);
    expect(brandSize === '11px', `the brand name is ${brandSize}`);
    expect((await page.locator('.tile .link-host, .row-link .link-host, .launch-tile .link-host, .finder-host').count()) === 0, 'an address is shown');
  });

  await path('no accessibility violations with modules, editing and locked', async () => {
    // (The page was reloaded since axe was added.)
    await page.addScriptTag({ path: join(root, 'node_modules/axe-core/axe.min.js') });
    await audit('modules in edit mode');
    await page.getByRole('button', { name: 'DONE' }).click();
    await page.waitForFunction(() => !document.querySelector('[role="toolbar"]'));
    await audit('modules');
    await shot('20-modules');
  });

  await path('locked: SEARCH opens the engine in a new tab; a tile, its key (1–9) and the finder’s web search open too', async () => {
    await context.route('**/*', offline);
    try {
      const box = mod('SEARCH').getByRole('searchbox');
      await box.fill('hello world');
      const [found] = await Promise.all([context.waitForEvent('page'), box.press('Enter')]);
      expect(found.url() === 'https://search.example/?q=hello%20world', `searched ${found.url()}`);
      await found.close();
      expect((await box.inputValue()) === '', 'the field wasn’t cleared');
      const [tile] = await Promise.all([context.waitForEvent('page'), mod('QUICK LAUNCH').locator('.launch-tile', { hasText: 'Example' }).click()]);
      expect(tile.url() === 'https://example.com/', `the tile opened ${tile.url()}`);
      await tile.close();
      await page.locator('body').click({ position: { x: 5, y: 600 } });
      const [keyed] = await Promise.all([context.waitForEvent('page'), page.keyboard.press('2')]);
      expect(keyed.url().includes('ycombinator'), `key 2 opened ${keyed.url()}`);
      await keyed.close();
      await page.keyboard.press('/');
      await page.keyboard.type('zzqqxx');
      await page.getByRole('option', { name: /SEARCH CUSTOM FOR/ }).waitFor();
      const [web] = await Promise.all([context.waitForEvent('page'), page.keyboard.press('Enter')]);
      expect(web.url() === 'https://search.example/?q=zzqqxx', `the finder searched ${web.url()}`);
      await web.close();
    } finally {
      await context.unroute('**/*', offline);
    }
  });

  await path('TIME: the timer counts down, pauses and resets; the stopwatch runs', async () => {
    // In front again after the tabs the last path opened: TIME stands still while its tab is in the background.
    await page.bringToFront();
    expect(await page.evaluate(() => document.visibilityState === 'visible'), 'the dashboard isn’t visible');
    const time = mod('TIME');
    // No calendar; the timer and stopwatch are folded away under the clock until opened.
    expect((await time.locator('table').count()) === 0, 'TIME still has a calendar');
    const fold = time.getByRole('button', { name: 'TIMER · STOPWATCH' });
    expect((await fold.getAttribute('aria-expanded')) === 'false', 'the fold starts open');
    await fold.click();
    await page.waitForFunction(() => document.querySelector('.time-fold.open'));
    await audit('TIME’s timer and stopwatch open');
    const timer = time.locator('.time-tool', { hasText: 'TIMER' }).getByRole('timer');
    expect((await timer.innerText()) === '25:00', `the timer shows ${await timer.innerText()}`);
    await time.getByRole('button', { name: 'START' }).first().click();
    // Counting: it moves on from 25:00 within 2 s. Waited for as "moved on", not one exact second, and
    // up to 6 s: a machine that stalls for a few seconds can skip past a second.
    expect((await timer.innerText()) <= '25:00', `the timer started at ${await timer.innerText()}`);
    await page.waitForFunction(() => document.querySelector('.module[data-kind="time"] .time-tool [role="timer"]')?.textContent < '25:00', null, { timeout: 6000 });
    await time.getByRole('button', { name: 'PAUSE' }).click();
    await time.getByRole('button', { name: 'RESUME' }).waitFor();
    await time.getByRole('button', { name: 'RESET' }).first().click();
    expect((await timer.innerText()) === '25:00', 'RESET didn’t reset the timer');
    const watch = time.locator('.time-tool', { hasText: 'STOPWATCH' });
    await watch.getByRole('button', { name: 'START' }).click();
    await page.waitForFunction(() => [...document.querySelectorAll('.module[data-kind="time"] [role="timer"]')].at(-1)?.textContent > '00:00', null, { timeout: 6000 });
    await watch.getByRole('button', { name: 'STOP' }).click();
    // Today is lit in the month.
  });

  await path('the finder knows the modules: FOCUS SEARCH, START / STOP TIMER', async () => {
    const run = async (words) => {
      await page.locator('body').click({ position: { x: 5, y: 600 } });
      await page.keyboard.press('/');
      // Typed only once the finder's field has the keyboard (else a letter could be a shortcut: F, S).
      await page.waitForFunction(() => document.activeElement?.matches('.finder input'));
      await page.keyboard.type(words);
      await page.getByRole('option', { name: new RegExp(`^.?\\s*${words}`, 'i') }).first().waitFor();
      await page.keyboard.press('Enter');
      await page.getByRole('dialog', { name: 'Find' }).waitFor({ state: 'detached' });
    };
    await run('focus search');
    await page.waitForFunction(() => document.activeElement?.closest('.module[data-kind="search"]'));
    // Esc in the search box: clears what's typed, then leaves it.
    await page.keyboard.type('abc');
    await page.keyboard.press('Escape');
    expect((await mod('SEARCH').getByRole('searchbox').inputValue()) === '', 'Esc didn’t clear the search');
    await page.keyboard.press('Escape');
    expect(!(await page.evaluate(() => document.activeElement?.closest('.module[data-kind="search"]'))), 'Esc didn’t leave the search box');
    const timer = mod('TIME').locator('.time-tool', { hasText: 'TIMER' });
    await run('start timer');
    await timer.getByRole('button', { name: 'PAUSE' }).waitFor();
    await run('stop timer');
    await timer.getByRole('button', { name: 'RESUME' }).waitFor();
    await timer.getByRole('button', { name: 'RESET' }).click();
  });

  await path('keyboard: the arrows move between QUICK LAUNCH’s tiles; Tab reaches the key hints last', async () => {
    const tiles = mod('QUICK LAUNCH').locator('.launch-tile');
    await tiles.first().focus();
    await page.keyboard.press('ArrowRight');
    expect(await tiles.nth(1).evaluate((el) => el === document.activeElement), 'ArrowRight didn’t move to the next tile');
    // In the page: the brand panel, NAV, the modules (top to bottom), then the key hints.
    const order = await page.evaluate(() => [...document.querySelector('.ui-layer').children].map((el) => el.className.split(' ')[0]).filter((c) => ['masthead', 'deck-area', 'module', 'hud-keys'].includes(c)));
    expect(order.at(-1) === 'hud-keys' && order.indexOf('deck-area') < order.indexOf('module'), `page order: ${order.join(', ')}`);
  });

  await path('modules and their settings survive a reload', async () => {
    await settled();
    await page.reload();
    await mod('TIME').getByText('12 DAYS').waitFor({ timeout: 5000 });
    // Bare: no header, the engine named in the field's placeholder.
    await mod('SEARCH').getByPlaceholder('SEARCH CUSTOM').waitFor();
    expect((await mod('SEARCH').locator('.module-head').count()) === 0, 'SEARCH has a header outside edit mode');
    expect((await mod('QUICK LAUNCH').locator('.launch-tile').count()) === 2, 'QUICK LAUNCH lost a tile');
    expect((await mod('TIME').getByRole('button', { name: 'TIMER · STOPWATCH' }).getAttribute('aria-expanded')) === 'true', 'TIME’s fold didn’t stay open');
  });

  await path('the rain moves', async () => {
    const a = (await rain()).sig;
    await page.waitForTimeout(500);
    expect(a !== (await rain()).sig, 'the canvas did not change in 500 ms');
  });

  await path('F: fullscreen with every piece of UI hidden; F again brings it back', async () => {
    await page.mouse.click(960, 540); // the page has the keyboard
    await page.keyboard.press('f');
    await page.waitForFunction(() => !!document.fullscreenElement, null, { timeout: 3000 });
    const layer = page.locator('.ui-layer');
    await page.waitForFunction(() => document.querySelector('.ui-layer').hasAttribute('data-hidden'));
    expect(await layer.evaluate((el) => el.inert), 'UI layer is not inert');
    await page.waitForTimeout(500); // the fade-out
    expect((await layer.evaluate((el) => getComputedStyle(el).opacity)) === '0', 'UI layer still visible');
    await shot('02-immersive');
    // S does nothing while immersive (the UI is hidden).
    await page.keyboard.press('s');
    expect((await page.getByRole('dialog').count()) === 0, 'SYSTEM opened in immersive mode');
    await page.keyboard.press('f');
    await page.waitForFunction(() => !document.fullscreenElement, null, { timeout: 3000 });
    await page.waitForFunction(() => !document.querySelector('.ui-layer').hasAttribute('data-hidden'));
  });

  await path('leaving fullscreen another way (Esc / the browser) brings the UI back too', async () => {
    await page.keyboard.press('F');
    await page.waitForFunction(() => !!document.fullscreenElement, null, { timeout: 3000 });
    await page.evaluate(() => document.exitFullscreen());
    await page.waitForFunction(() => !document.querySelector('.ui-layer').hasAttribute('data-hidden'), null, { timeout: 3000 });
  });

  await path('the FULLSCREEN button does what F does', async () => {
    await page.getByRole('button', { name: 'FULLSCREEN' }).click();
    await page.waitForFunction(() => !!document.fullscreenElement, null, { timeout: 3000 });
    await page.keyboard.press('f');
    await page.waitForFunction(() => !document.fullscreenElement, null, { timeout: 3000 });
  });

  await path('S opens SYSTEM; Esc closes it; F is ignored while it is open', async () => {
    await page.keyboard.press('s');
    await page.getByRole('dialog', { name: 'SYSTEM' }).waitFor();
    await page.keyboard.press('f');
    await page.waitForTimeout(300);
    expect(!(await page.evaluate(() => !!document.fullscreenElement)), 'F went fullscreen behind the panel');
    await shot('03-system');
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'detached' });
  });

  await path('S straight after Esc reopens SYSTEM with the keyboard in it, and Esc still closes it', async () => {
    await page.keyboard.press('s');
    await page.getByRole('dialog', { name: 'SYSTEM' }).waitFor();
    await page.keyboard.press('Escape');
    await page.keyboard.press('s'); // within the fade-out
    await page.waitForTimeout(250);
    expect(await page.evaluate(() => !!document.querySelector('.dialog')?.contains(document.activeElement)), 'the keyboard isn’t in the reopened panel');
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'detached' });
  });

  await path('EXPORT BACKUP downloads a valid backup and records it', async () => {
    await page.keyboard.press('s');
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'EXPORT BACKUP' }).click()]);
    expect(/^cyberdeck_terminal-backup-\d{4}-\d{2}-\d{2}-\d{4}\.json$/.test(download.suggestedFilename()), `file name ${download.suggestedFilename()}`);
    backupPath = join(shots, 'backup.json');
    await download.saveAs(backupPath);
    const file = JSON.parse(readFileSync(backupPath, 'utf8'));
    expect(file.format === 'cyberdeck_terminal-backup' && file.layout?.schemaVersion === 4, 'not a backup file');
    expect(file.layout.modules?.length === 3, 'the backup has no modules');
    expect(file.layout.prefs.backupReminderDays === 14 && file.layout.prefs.rainGlow === 'high', 'unexpected layout in backup');
    await page.locator('.toast', { hasText: 'BACKUP EXPORTED' }).waitFor();
    // LAST EXPORT updates the next time the panel opens.
    await page.keyboard.press('Escape');
    await page.keyboard.press('s');
    await page.locator('.setting', { hasText: 'LAST EXPORT' }).getByText('TODAY').waitFor();
  });

  await path('IMPORT: a changed layout is replaced by the backup, after a preview; the old one is snapshotted', async () => {
    await reminder().selectOption('30');
    await settled();
    await page.getByLabel('Backup file to import').setInputFiles(backupPath);
    const preview = page.getByRole('group', { name: 'Backup to import' });
    await preview.waitFor();
    await preview.getByText('3 MODULES').waitFor();
    await preview.getByText('WALLPAPER MATRIX-RAIN · REMIND 14D').waitFor();
    await shot('04-import-preview');
    await preview.getByRole('button', { name: 'REPLACE LAYOUT' }).click();
    await page.locator('.toast', { hasText: 'BACKUP IMPORTED' }).waitFor();
    expect((await reminder().inputValue()) === '14', 'the backup’s setting was not applied');
    const newest = page.locator('.snapshot').first();
    await newest.getByText('BEFORE IMPORT').waitFor();
    await newest.getByText('REMIND 30D').waitFor();
  });

  await path('IMPORT refuses a file that is not a backup, and says why', async () => {
    await page.getByLabel('Backup file to import').setInputFiles({ name: 'notes.json', mimeType: 'application/json', buffer: Buffer.from('{"hello": 1}') });
    await page.getByRole('alert').getByText('isn’t a cyberdeck_terminal backup').waitFor();
    expect((await reminder().inputValue()) === '14', 'the layout changed');
  });

  await path('RESTORE brings back a snapshot after CONFIRM, and snapshots the current layout first', async () => {
    await reminder().selectOption('7');
    await page.evaluate(() => window.__cyberdeck.flushSnapshot());
    await reminder().selectOption('90');
    await settled();
    const target = page.locator('.snapshot', { hasText: 'REMIND 7D' }).first();
    await target.getByRole('button', { name: /^Restore the snapshot/ }).click();
    await shot('05-restore-confirm');
    await target.getByRole('button', { name: 'CONFIRM' }).click();
    await page.locator('.toast', { hasText: 'RESTORED' }).waitFor();
    expect((await reminder().inputValue()) === '7', 'the snapshot was not restored');
    const newest = page.locator('.snapshot').first();
    await newest.getByText('BEFORE RESTORE').waitFor();
    await newest.getByText('REMIND 90D').waitFor();
  });

  await path('the layout and its snapshots survive a reload', async () => {
    await settled();
    const before = await page.locator('.snapshot').count();
    await page.reload();
    await page.locator('.brand').waitFor();
    await page.keyboard.press('s');
    expect((await reminder().inputValue()) === '7', 'the layout was not kept');
    expect((await page.locator('.snapshot').count()) >= before, 'snapshots were lost');
    await page.keyboard.press('Escape');
  });

  await path('GLOW: a level is saved with the layout (and as the start-up hint), the rain keeps drawing, and it survives a reload', async () => {
    const glow = () => page.getByRole('radiogroup', { name: 'GLOW' });
    const hint = () => page.evaluate(() => localStorage.getItem('cyberdeck_terminal:glow'));
    await page.keyboard.press('s');
    expect((await glow().getByRole('radio', { checked: true }).getAttribute('value')) === 'high', 'HIGH isn’t the default');
    // A click on the visible label, as a person would.
    await glow().locator('label', { hasText: 'MAX' }).click();
    await settled();
    expect((await hint()) === 'max', `start-up hint ${await hint()}`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    expect((await litPixels()) > 0.01, 'the rain stopped drawing after the glow changed');
    await page.reload();
    await page.locator('.brand').waitFor();
    await page.keyboard.press('s');
    expect((await glow().getByRole('radio', { checked: true }).getAttribute('value')) === 'max', 'MAX was not kept');
    // The arrow keys move through the levels, like any radio group.
    await glow().getByRole('radio', { name: 'MAX' }).focus();
    await page.keyboard.press('ArrowLeft');
    await settled();
    expect((await glow().getByRole('radio', { checked: true }).getAttribute('value')) === 'high', 'ArrowLeft didn’t choose HIGH');
    expect((await hint()) === 'high', `start-up hint ${await hint()}`);
    await page.keyboard.press('Escape');
  });

  await path('APPEARANCE: the dashboard and the wallpaper each take their own palette; the neural net, VELOCITY, DATA FLOW, MEGACITY, HORIZON and SUNSET run in the worker; all survive a reload', async () => {
    const accent = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
    const wallAccent = () => page.evaluate(() => getComputedStyle(document.querySelector('.wallpaper')).getPropertyValue('--accent').trim());
    const swatch = (group, name) => page.getByRole('radiogroup', { name: group }).locator('.swatch', { hasText: name });
    await page.keyboard.press('s');
    // APPEARANCE comes first in SYSTEM.
    expect((await page.locator('.settings-group').first().getAttribute('aria-label')) === 'Appearance', 'APPEARANCE isn’t first');
    await swatch('DASHBOARD COLOURS', 'BLOOD').click();
    await swatch('WALLPAPER COLOURS', 'ICE').click();
    expect((await accent()) === '#ff3040', `--accent is ${await accent()}`);
    expect((await wallAccent()) === '#1ee8ff', `the wallpaper's --accent is ${await wallAccent()}`);
    await page.getByRole('radio', { name: 'NEURAL NET' }).check({ force: true });
    await settled();
    expect((await page.evaluate(() => localStorage.getItem('cyberdeck_terminal:palette'))) === 'blood', 'the palette hint wasn’t saved');
    expect((await page.evaluate(() => localStorage.getItem('cyberdeck_terminal:wallpaper-palette'))) === 'ice', 'the wallpaper palette hint wasn’t saved');
    await page.keyboard.press('Escape');
    await page.reload();
    await page.locator('.brand').waitFor();
    await page.locator('.wallpaper-canvas[data-ready]').waitFor({ state: 'attached', timeout: 5000 });
    expect((await accent()) === '#ff3040', 'the palette wasn’t kept');
    expect((await wallAccent()) === '#1ee8ff', 'the wallpaper’s palette wasn’t kept');
    expect((await page.evaluate(() => document.querySelector('.wallpaper')?.getAttribute('data-wallpaper'))) === 'neural-net', 'the neural net isn’t showing');
    expect((await page.evaluate(() => window.__cyberdeckRain.mode())) === 'worker', 'the neural net isn’t in the worker');
    const a = await rain();
    await page.waitForTimeout(600);
    const b = await rain();
    expect(a.lit > 0.002, `the network is only ${(a.lit * 100).toFixed(2)}% lit`);
    expect(a.sig !== b.sig, 'the neural net doesn’t move');
    // VELOCITY: light in motion, in the same worker; it lights the screen and moves.
    await page.keyboard.press('s');
    await page.getByRole('radio', { name: 'VELOCITY' }).check({ force: true });
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.querySelector('.wallpaper')?.getAttribute('data-wallpaper') === 'velocity');
    await page.locator('.wallpaper-canvas[data-ready]').waitFor({ state: 'attached', timeout: 10000 });
    expect((await page.evaluate(() => window.__cyberdeckRain.mode())) === 'worker', 'VELOCITY isn’t in the worker');
    const v1 = await rain();
    await page.waitForTimeout(600);
    const v2 = await rain();
    expect(v1.lit > 0.05, `VELOCITY is only ${(v1.lit * 100).toFixed(1)}% lit`);
    expect(v1.sig !== v2.sig, 'VELOCITY doesn’t move');
    await shot('14-velocity');
    // DATA FLOW: the circuit board, in the same worker; it lights the screen and its data runs.
    await page.keyboard.press('s');
    await page.getByRole('radio', { name: 'DATA FLOW' }).check({ force: true });
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.querySelector('.wallpaper')?.getAttribute('data-wallpaper') === 'data-flow');
    await page.locator('.wallpaper-canvas[data-ready]').waitFor({ state: 'attached', timeout: 10000 });
    expect((await page.evaluate(() => window.__cyberdeckRain.mode())) === 'worker', 'DATA FLOW isn’t in the worker');
    const f1 = await rain();
    await page.waitForTimeout(600);
    const f2 = await rain();
    expect(f1.lit > 0.02, `DATA FLOW is only ${(f1.lit * 100).toFixed(1)}% lit`);
    expect(f1.sig !== f2.sig, 'DATA FLOW doesn’t move');
    await shot('15-data-flow');
    // MEGACITY: the city drawn by the graphics card, in the same worker; it fills the screen and its lights move.
    await page.keyboard.press('s');
    await page.getByRole('radio', { name: 'MEGACITY' }).check({ force: true });
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.querySelector('.wallpaper')?.getAttribute('data-wallpaper') === 'megacity');
    await page.locator('.wallpaper-canvas[data-ready]').waitFor({ state: 'attached', timeout: 10000 });
    expect((await page.evaluate(() => window.__cyberdeckRain.mode())) === 'worker', 'MEGACITY isn’t in the worker');
    const m1 = await rain();
    await page.waitForTimeout(800);
    const m2 = await rain();
    expect(m1.lit > 0.5, `MEGACITY is only ${(m1.lit * 100).toFixed(1)}% lit`);
    expect(m1.w === 1920 && m1.h === 1080, `MEGACITY's canvas is ${m1.w}×${m1.h}`);
    expect(m1.sig !== m2.sig, 'MEGACITY doesn’t move');
    await shot('17-megacity');
    // HORIZON: the wireframe land and its glow, drawn by the graphics card in the same worker; it fills the screen and glides.
    await page.keyboard.press('s');
    await page.getByRole('radio', { name: 'HORIZON' }).check({ force: true });
    await page.getByRole('radiogroup', { name: 'WALLPAPER COLOURS' }).getByRole('radio', { name: 'SYNTH' }).check({ force: true });
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.querySelector('.wallpaper')?.getAttribute('data-wallpaper') === 'horizon');
    await page.locator('.wallpaper-canvas[data-ready]').waitFor({ state: 'attached', timeout: 10000 });
    expect((await page.evaluate(() => window.__cyberdeckRain.mode())) === 'worker', 'HORIZON isn’t in the worker');
    const z1 = await rain();
    await page.waitForTimeout(800);
    const z2 = await rain();
    expect(z1.lit > 0.15, `HORIZON is only ${(z1.lit * 100).toFixed(1)}% lit`);
    expect(z1.w === 1920 && z1.h === 1080, `HORIZON's canvas is ${z1.w}×${z1.h}`);
    expect(z1.sig !== z2.sig, 'HORIZON doesn’t move');
    await shot('18b-horizon');
    // SUNSET: the outrun sun over its grid; the sky drawn once, the grid gliding.
    await page.keyboard.press('s');
    await page.getByRole('radio', { name: 'SUNSET' }).check({ force: true });
    await page.getByRole('radiogroup', { name: 'WALLPAPER COLOURS' }).getByRole('radio', { name: 'OUTRUN' }).check({ force: true });
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.querySelector('.wallpaper')?.getAttribute('data-wallpaper') === 'sunset');
    await page.locator('.wallpaper-canvas[data-ready]').waitFor({ state: 'attached', timeout: 10000 });
    expect((await page.evaluate(() => window.__cyberdeckRain.mode())) === 'worker', 'SUNSET isn’t in the worker');
    const u1 = await rain();
    await page.waitForTimeout(800);
    const u2 = await rain();
    expect(u1.lit > 0.2, `SUNSET is only ${(u1.lit * 100).toFixed(1)}% lit`);
    expect(u1.w === 1920 && u1.h === 1080, `SUNSET's canvas is ${u1.w}×${u1.h}`);
    expect(u1.sig !== u2.sig, 'SUNSET doesn’t move');
    await shot('18c-sunset');
    // Accessibility in another palette (contrast especially), with SYSTEM open.
    await page.addScriptTag({ path: join(root, 'node_modules/axe-core/axe.min.js') });
    await page.keyboard.press('s');
    await page.getByRole('radiogroup', { name: 'DASHBOARD COLOURS' }).waitFor();
    await shot('13-appearance');
    await audit('SYSTEM in BLOOD, over DATA FLOW');
    // Back to the defaults for the paths after this one.
    await swatch('DASHBOARD COLOURS', 'PHOSPHOR').click();
    await swatch('WALLPAPER COLOURS', 'PHOSPHOR').click();
    await page.getByRole('radio', { name: 'MATRIX RAIN' }).check({ force: true });
    await settled();
    await page.keyboard.press('Escape');
  });

  await path('ZOOM: each wallpaper keeps its own zoom (and opens at it after a reload); zoomed, the canvas is as sharp; + − 0 work with the panel shut', async () => {
    const zoom = () => page.evaluate(() => window.__cyberdeckRain.zoom());
    const shown = (id) => page.waitForFunction((want) => document.querySelector('.wallpaper')?.getAttribute('data-wallpaper') === want, id);
    const before = await rain();
    await page.keyboard.press('s');
    const stepper = page.getByRole('group', { name: 'ZOOM · MATRIX RAIN' });
    expect((await stepper.getByRole('button', { name: 'Reset the zoom to 100%' }).isDisabled()) === true, 'RESET is enabled at 100%');
    await stepper.getByRole('button', { name: 'Zoom the wallpaper in' }).click();
    await stepper.getByRole('button', { name: 'Zoom the wallpaper in' }).click();
    await stepper.getByText('125%').waitFor();
    await settled();
    expect((await zoom()) === 1.25, `the rain's zoom is ${await zoom()}`);
    await page.waitForTimeout(600);
    const zoomed = await rain();
    // Zoomed, the canvas keeps every pixel (laid out smaller, drawn larger: not scaled up).
    expect(zoomed.w === before.w && zoomed.h === before.h, `zoomed, the canvas is ${zoomed.w}×${zoomed.h}, was ${before.w}×${before.h}`);
    expect(zoomed.lit > 0.05, `zoomed, the rain is only ${(zoomed.lit * 100).toFixed(1)}% lit`);
    await page.keyboard.press('Escape');
    await shot('16-zoom-rain-125');
    await page.keyboard.press('s');
    // Another wallpaper keeps its own (100%), and the keys zoom it with the panel shut.
    await page.getByRole('radio', { name: 'DATA FLOW' }).check({ force: true });
    await shown('data-flow');
    await page.getByRole('group', { name: 'ZOOM · DATA FLOW' }).getByText('100%').waitFor();
    expect((await zoom()) === 1, 'DATA FLOW took the rain’s zoom');
    await page.keyboard.press('Escape');
    await page.keyboard.press('+');
    await page.waitForFunction(() => window.__cyberdeckRain.zoom() === 1.1);
    await page.keyboard.press('-');
    await page.keyboard.press('-');
    await page.waitForFunction(() => window.__cyberdeckRain.zoom() === 0.9);
    await page.keyboard.press('0');
    await page.waitForFunction(() => window.__cyberdeckRain.zoom() === 1);
    // Back to the rain: at its own zoom again; after a reload too (the hint starts it there at once).
    await page.keyboard.press('s');
    await page.getByRole('radio', { name: 'MATRIX RAIN' }).check({ force: true });
    await shown('matrix-rain');
    expect((await zoom()) === 1.25, `back on the rain, its zoom is ${await zoom()}`);
    await settled();
    expect((await page.evaluate(() => localStorage.getItem('cyberdeck_terminal:zoom'))) === '{"matrix-rain":1.25}', 'the zoom hint wasn’t saved');
    await page.keyboard.press('Escape');
    await page.reload();
    await page.locator('.brand').waitFor();
    expect((await zoom()) === 1.25, `after a reload the rain's zoom is ${await zoom()}`);
    await page.locator('.wallpaper-canvas[data-ready]').waitFor({ state: 'attached', timeout: 5000 });
    // RESET: back to 100% for the paths after this one.
    await page.keyboard.press('s');
    await page.getByRole('group', { name: 'ZOOM · MATRIX RAIN' }).getByRole('button', { name: 'Reset the zoom to 100%' }).click();
    await page.waitForFunction(() => window.__cyberdeckRain.zoom() === 1);
    await settled();
    expect((await page.evaluate(() => localStorage.getItem('cyberdeck_terminal:zoom'))) === '{}', 'RESET left a zoom behind');
    await page.keyboard.press('Escape');
  });

  await path('UI SCALE: the dashboard (not the wallpaper) drawn bigger, SYSTEM in the window, a drag follows the pointer; TEXT and MODULE SIZE; kept after a reload; [ ] step it', async () => {
    const rootZoom = () => page.evaluate(() => getComputedStyle(document.getElementById('root')).zoom);
    const near = (a, b, by = 3) => Math.abs(a - b) <= by;
    const time = page.locator('.module[data-kind="time"]');
    const nav = page.locator('.deck-area');
    const [t0, n0, canvas0] = [await time.boundingBox(), await nav.boundingBox(), await rain()];
    await page.keyboard.press('s');
    // Headless Chromium is at 100%: the readout says so.
    await page.getByText('CHROME ZOOM · AT 100%').waitFor();
    // The preset's visible label (the radio itself is visually hidden).
    await page.getByRole('radiogroup', { name: 'UI scale presets' }).getByText('150%', { exact: true }).click();
    await page.getByRole('group', { name: 'UI SCALE' }).getByText('150%').waitFor();
    expect((await rootZoom()) === '1.5', `#root's zoom is ${await rootZoom()}`);
    const d = await page.getByRole('dialog').boundingBox();
    expect(d.x >= 0 && d.x + d.width <= 1920 && d.y >= 0 && d.y + d.height <= 1080, `SYSTEM at 150% is ${JSON.stringify(d)}`);
    await shot('21a-ui-scale-system');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
    const [t1, n1, canvas1] = [await time.boundingBox(), await nav.boundingBox(), await rain()];
    expect(near(n1.width, n0.width * 1.5) && near(t1.width, t0.width * 1.5), `at 150%, NAV is ${n1.width} wide (was ${n0.width}), TIME ${t1.width} (was ${t0.width})`);
    expect(t1.x >= 0 && t1.x + t1.width <= 1921, `TIME is off screen: ${JSON.stringify(t1)}`);
    expect(canvas1.w === canvas0.w && canvas1.h === canvas0.h, 'UI SCALE changed the wallpaper’s canvas');
    await shot('21b-ui-scale-150');
    // A drag at 150%: the panel follows the pointer exactly (screen px in, the UI's own px kept).
    // Edit mode from the finder: grown, QUICK LAUNCH covers NAV's EDIT (panels keep their places, not their gaps).
    const finderCommand = async (text, label) => {
      await page.keyboard.press('/');
      await page.getByRole('dialog', { name: 'Find' }).waitFor();
      await page.keyboard.type(text);
      await page.getByRole('option', { name: label }).waitFor();
      await page.keyboard.press('Enter');
      await page.getByRole('dialog', { name: 'Find' }).waitFor({ state: 'detached' });
    };
    await finderCommand('edit the layout', /EDIT THE LAYOUT/);
    await page.getByRole('toolbar', { name: 'Edit layout' }).waitFor();
    const grip = await page.getByRole('button', { name: /^Move the TIME module/ }).boundingBox();
    const dx = t1.x > 960 ? -200 : 200;
    await page.mouse.move(grip.x + 8, grip.y + 8);
    await page.mouse.down();
    await page.mouse.move(grip.x + 8 + dx, grip.y + 48, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(150);
    const t2 = await time.boundingBox();
    expect(near(t2.x - t1.x, dx, 4) && near(t2.y - t1.y, 40, 4) && near(t2.width, t1.width), `at 150%, TIME moved by ${t2.x - t1.x}, ${t2.y - t1.y} for ${dx}, 40 (width ${t2.width}, was ${t1.width})`);
    // UNDO from the keyboard (QUICK LAUNCH covers the bar's right end at 150% too).
    await page.getByRole('toolbar', { name: 'Edit layout' }).getByRole('button', { name: 'UNDO' }).focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction((x) => Math.abs(document.querySelector('.module[data-kind="time"]').getBoundingClientRect().x - x) < 2, t1.x);
    await finderCommand('lock the layout', /LOCK THE LAYOUT/);
    await page.getByRole('toolbar', { name: 'Edit layout' }).waitFor({ state: 'detached' });
    // TEXT SIZE and MODULE SIZE.
    await page.keyboard.press('s');
    const textUp = page.getByRole('group', { name: 'TEXT SIZE' }).getByRole('button', { name: 'Make the text bigger' });
    await textUp.click();
    await textUp.click();
    await page.getByRole('group', { name: 'TEXT SIZE' }).getByText('120%').waitFor();
    const modulesUp = page.getByRole('group', { name: 'MODULE SIZE' }).getByRole('button', { name: 'Make the modules bigger' });
    for (let i = 0; i < 3; i++) await modulesUp.click();
    await page.getByRole('group', { name: 'MODULE SIZE' }).getByText('100%').waitFor();
    const vars = await page.evaluate(() => [document.documentElement.style.getPropertyValue('--text-scale'), document.documentElement.style.getPropertyValue('--module-scale')]);
    expect(vars[0] === '1.2' && vars[1] === '1', `the size variables are ${vars}`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
    const t3 = await time.boundingBox();
    expect(near(t3.width, (t1.width / 0.7) * 1, 4) || t3.width >= 1900, `at MODULE SIZE 100%, TIME is ${t3.width} wide (was ${t1.width} at 70%)`);
    // Kept after a reload, drawn at it from the start (the hint).
    await page.reload();
    expect((await rootZoom()) === '1.5', `after a reload #root's zoom is ${await rootZoom()}`);
    await page.locator('.brand').waitFor();
    // [ and ] step it, and say so.
    await page.keyboard.press(']');
    await page.locator('.toast', { hasText: 'UI SCALE 175%' }).waitFor();
    await page.keyboard.press('[');
    await page.keyboard.press('[');
    await page.waitForFunction(() => getComputedStyle(document.getElementById('root')).zoom === '1.25');
    // Back to the usual sizes for the paths after this one.
    await page.keyboard.press('s');
    await page.getByRole('button', { name: 'Reset the UI scale to 100%' }).click();
    await page.getByRole('button', { name: 'Reset the text size to 100%' }).click();
    await page.getByRole('button', { name: 'Reset the module size to 70%' }).click();
    await page.waitForFunction(() => getComputedStyle(document.getElementById('root')).zoom === '1');
    await settled();
    await page.keyboard.press('Escape');
    const t4 = await time.boundingBox();
    expect(near(t4.width, t0.width) && near(t4.x, t0.x), `reset, TIME is ${JSON.stringify(t4)}, was ${JSON.stringify(t0)}`);
  });

  await path('no accessibility violations (axe: WCAG 2.2 A/AA and best practice), with and without SYSTEM', async () => {
    await page.addScriptTag({ path: join(root, 'node_modules/axe-core/axe.min.js') });
    await audit('the page');
    await page.keyboard.press('s');
    await page.getByRole('dialog').waitFor();
    await audit('SYSTEM');
    await page.keyboard.press('Escape');
  });

  await path('a narrow window keeps the HUD on screen', async () => {
    await page.setViewportSize({ width: 420, height: 800 });
    await page.waitForTimeout(400);
    const box = await page.locator('.hud-brand').boundingBox();
    expect(box && box.x >= 0 && box.x + box.width <= 420, 'the brand panel overflows');
    // The modules stack under NAV, inside the window.
    const mods = await page.locator('.module.stacked').evaluateAll((els) => els.map((el) => el.getBoundingClientRect()).map((r) => [r.left, r.right]));
    expect(mods.length === 3 && mods.every(([l, r]) => l >= 0 && r <= 420), `stacked modules: ${JSON.stringify(mods)}`);
    await shot('06-narrow');
    await audit('a narrow window with modules');
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  await path('SYSTEM ▸ COPY DIAGNOSTICS copies the browser, screen, wallpaper and layout figures, and no address', async () => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new globalThis.URL(URL).origin });
    await page.keyboard.press('s');
    await page.getByRole('button', { name: 'COPY DIAGNOSTICS' }).click();
    await page.locator('.toast', { hasText: 'DIAGNOSTICS COPIED' }).waitFor();
    const text = await page.evaluate(() => navigator.clipboard.readText());
    for (const part of ['=== cyberdeck_terminal DIAGNOSTICS ===', '--- WALLPAPER ---', 'sharpness: drawn at', 'frames: ', '--- STARTUP', 'dashboard on screen', '--- LAYOUT ---', 'modules: SEARCH', '=== END ===']) {
      expect(text.includes(part), `the diagnostics have no “${part}”`);
    }
    expect(!/https?:|www\./.test(text), 'the diagnostics carry an address');
    await page.keyboard.press('Escape');
  });

  await path('Chrome at 175% (simulated): the UI and the wallpaper both draw as at 100%; CHROME ZOOM ▸ APPLY lets the zoom work again', async () => {
    // As Chrome at 175% on a 1920 × 1080 screen at 100%: the page 1097 CSS px wide at a 1.75 pixel ratio,
    // the window 1920 wide, and the screen in screen px (Chrome's doesn't follow its zoom).
    const zoomed = await browser.newContext({ viewport: { width: 1097, height: 617 }, deviceScaleFactor: 1.75, screen: { width: 1920, height: 1080 }, serviceWorkers: 'block' });
    try {
      await zoomed.addInitScript(() => Object.defineProperty(window, 'outerWidth', { get: () => 1920 }));
      const p = await zoomed.newPage();
      await p.goto(URL);
      await p.locator('.wallpaper-canvas[data-ready]').waitFor({ state: 'attached', timeout: 8000 });
      const look = () =>
        p.evaluate(async () => {
          const r = document.querySelector('.wallpaper-canvas').getBoundingClientRect();
          return { px: await window.__cyberdeckRain.pixels(), css: [r.width, r.height], root: getComputedStyle(document.getElementById('root')).zoom };
        });
      const a = await look();
      // The canvas: 1920 × 1080 px, as on that screen at 100%, laid over exactly the window (1920 ÷ 1.75 CSS px).
      expect(a.px.w === 1920 && a.px.h === 1080, `at 175%, the wallpaper draws ${a.px.w} × ${a.px.h} px`);
      expect(Math.abs(a.css[0] - 1920 / 1.75) < 1 && Math.abs(a.css[1] - 1080 / 1.75) < 1, `at 175%, the canvas is ${a.css} CSS px`);
      expect(Math.abs(Number(a.root) - 1 / 1.75) < 0.001, `at 175%, #root's zoom is ${a.root}`);
      // APPLY: Chrome's zoom works on the UI and the wallpaper again (the wallpaper as before 0.17.1).
      await p.keyboard.press('s');
      await p.getByRole('radiogroup', { name: /CHROME ZOOM/ }).getByText('APPLY', { exact: true }).click();
      await p.waitForFunction(async () => (await window.__cyberdeckRain.pixels()).w === 3360, null, { timeout: 5000 });
      expect((await look()).root === '1', 'APPLY left the UI zoomed');
      await p.getByRole('radiogroup', { name: /CHROME ZOOM/ }).getByText('IGNORE', { exact: true }).click();
      await p.waitForFunction(async () => (await window.__cyberdeckRain.pixels()).w === 1920, null, { timeout: 5000 });
    } finally {
      await zoomed.close();
    }
  });

  await path('a sharper screen (2.5×) draws at its own ratio; the guard steps back to 2× when frames are slow, and TRY AGAIN undoes that', async () => {
    const sharp = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2.5, serviceWorkers: 'block' });
    try {
      const p = await sharp.newPage();
      await p.goto(URL);
      await p.locator('.wallpaper-canvas[data-ready]').waitFor({ state: 'attached', timeout: 8000 });
      const s0 = await p.evaluate(() => window.__cyberdeckRain.sharpness());
      expect(s0.drawnDpr === 2.5 && s0.safeDpr === 2, `drawn at ${s0.drawnDpr}× (safe ${s0.safeDpr}×)`);
      const w0 = (await p.evaluate(() => window.__cyberdeckRain.pixels())).w;
      const css = await p.evaluate(() => Math.max(screen.width, innerWidth));
      expect(w0 === Math.round(css * 2.5), `the canvas is ${w0} px for ${css} CSS px`);
      // The tests' knob: a budget no frame can meet, so the guard steps back after its watch.
      await p.evaluate(() => localStorage.setItem('cyberdeck_terminal:sharp-budget', '0'));
      await p.evaluate(() => localStorage.removeItem('cyberdeck_terminal:sharp'));
      await p.reload();
      await p.locator('.wallpaper-canvas[data-ready]').waitFor({ state: 'attached', timeout: 8000 });
      await p.waitForFunction(() => window.__cyberdeckRain.sharpness()?.verdict === 'safe', null, { timeout: 10000 });
      await p.waitForFunction(async () => (await window.__cyberdeckRain.pixels()).w === Math.round(Math.max(screen.width, innerWidth) * 2), null, { timeout: 5000 });
      // SYSTEM says so, and TRY AGAIN goes back to full sharpness (and watches again).
      await p.keyboard.press('s');
      await p.locator('.setting', { hasText: 'SHARPNESS' }).getByText(/STEPPED BACK FROM 2\.5×/).waitFor();
      await p.getByRole('button', { name: 'TRY AGAIN' }).click();
      expect((await p.evaluate(() => window.__cyberdeckRain.sharpness())).drawnDpr === 2.5, 'TRY AGAIN didn’t go back to 2.5×');
    } finally {
      await sharp.close();
    }
  });

  await path('Reduce Motion: one still frame of rain, already full', async () => {
    const still = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
    try {
      const p = await still.newPage();
      await p.goto(URL);
      await p.locator('.wallpaper-canvas[data-ready]').waitFor({ state: 'attached', timeout: 5000 });
      // The faint part is painted after the canvas shows: wait for the whole pre-warm.
      await p.waitForFunction(() => performance.getEntriesByName('rain-prewarm').length > 0, null, { timeout: 5000 });
      const a = await p.evaluate(() => window.__cyberdeckRain.pixels());
      await p.waitForTimeout(600);
      const b = await p.evaluate(() => window.__cyberdeckRain.pixels());
      expect(a.lit > 0.02, `the still frame is only ${(a.lit * 100).toFixed(2)}% lit`);
      expect(a.sig === b.sig, 'the rain moved under Reduce Motion');
    } finally {
      await still.close();
    }
  });

  await path('where a canvas can’t go to a worker, the rain runs on the page instead', async () => {
    const plain = await browser.newContext({ viewport: { width: 1280, height: 720 }, serviceWorkers: 'block' });
    // As in a browser that can't hand a canvas to a worker.
    await plain.addInitScript(() => delete HTMLCanvasElement.prototype.transferControlToOffscreen);
    try {
      const p = await plain.newPage();
      const pageErrors = [];
      p.on('pageerror', (e) => pageErrors.push(e.message));
      await p.goto(URL);
      await p.locator('.wallpaper-canvas[data-ready]').waitFor({ state: 'attached', timeout: 5000 });
      expect((await p.evaluate(() => window.__cyberdeckRain.mode())) === 'page', 'the rain isn’t running on the page');
      const a = await p.evaluate(() => window.__cyberdeckRain.pixels());
      await p.waitForTimeout(600);
      const b = await p.evaluate(() => window.__cyberdeckRain.pixels());
      expect(a.lit > 0.02, `only ${(a.lit * 100).toFixed(2)}% lit`);
      expect(a.sig !== b.sig, 'the rain on the page doesn’t move');
      expect(!pageErrors.length, `page errors: ${pageErrors.join(' | ')}`);
    } finally {
      await plain.close();
    }
  });

  await path('the rain’s frames at 4× CPU slowdown, and what it costs the page (reported, not asserted)', async () => {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Performance.enable');
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const script = async () => (await cdp.send('Performance.getMetrics')).metrics.find((m) => m.name === 'ScriptDuration').value;
    const before = await script();
    const { gaps, busy } = await page.evaluate(() => window.__cyberdeckRain.frames(3000));
    const pageScript = ((await script()) - before) * 1000;
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    const sorted = [...gaps].sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    console.log(
      `  (rain: ${gaps.length} frames in 3 s; median ${sorted[sorted.length >> 1].toFixed(1)} ms, p95 ${p95.toFixed(1)} ms, dropped >25 ms: ${gaps.filter((g) => g > 25).length}; ` +
        `drawing ${(busy / 3).toFixed(1)} ms/s in its worker, page script ${(pageScript / 3).toFixed(1)} ms/s)`,
    );
  });
} finally {
  await browser.close();
  server.kill();
  if (tempRoot) rmSync(tempRoot, { recursive: true, force: true });
}
writeFileSync(join(shots, '.last-run'), new Date().toISOString());
console.log(failed ? `\n${failed} path(s) failed` : '\nall paths passed');
process.exit(failed ? 1 : 0);
