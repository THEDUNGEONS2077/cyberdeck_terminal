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
/** Lit pixels on the wallpaper canvas (alpha above a faint residue). */
const litPixels = () =>
  page.evaluate(() => {
    const c = document.querySelector('.wallpaper-canvas');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 40) n++;
    return n / (d.length / 4);
  });
/** axe-core: WCAG 2.2 A/AA and best practice, the same gate as quest_log_desktop. */
const audit = async (state) => {
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
    console.log(`  (first full frame within ${Date.now() - opened} ms; ${(lit * 100).toFixed(1)}% of pixels lit)`);
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

  await path('the rain moves', async () => {
    const grab = () => page.evaluate(() => document.querySelector('.wallpaper-canvas').toDataURL());
    const a = await grab();
    await page.waitForTimeout(500);
    expect(a !== (await grab()), 'the canvas did not change in 500 ms');
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

  await path('EXPORT BACKUP downloads a valid backup and records it', async () => {
    await page.keyboard.press('s');
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'EXPORT BACKUP' }).click()]);
    expect(/^cyberdeck_terminal-backup-\d{4}-\d{2}-\d{2}-\d{4}\.json$/.test(download.suggestedFilename()), `file name ${download.suggestedFilename()}`);
    backupPath = join(shots, 'backup.json');
    await download.saveAs(backupPath);
    const file = JSON.parse(readFileSync(backupPath, 'utf8'));
    expect(file.format === 'cyberdeck_terminal-backup' && file.layout?.schemaVersion === 2, 'not a backup file');
    expect(file.layout.prefs.backupReminderDays === 14, 'unexpected layout in backup');
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
    await shot('06-narrow');
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  await path('frame cost at 4× CPU slowdown (reported, not asserted)', async () => {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const gaps = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const times = [];
          const tick = (t) => {
            times.push(t);
            if (t - times[0] < 3000) requestAnimationFrame(tick);
            else resolve(times.slice(1).map((x, i) => x - times[i]));
          };
          requestAnimationFrame(tick);
        }),
    );
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    const sorted = [...gaps].sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    console.log(`  (${gaps.length} frames in 3 s; median ${sorted[sorted.length >> 1].toFixed(1)} ms, p95 ${p95.toFixed(1)} ms, dropped >25 ms: ${gaps.filter((g) => g > 25).length})`);
  });
} finally {
  await browser.close();
  server.kill();
  if (tempRoot) rmSync(tempRoot, { recursive: true, force: true });
}
writeFileSync(join(shots, '.last-run'), new Date().toISOString());
console.log(failed ? `\n${failed} path(s) failed` : '\nall paths passed');
process.exit(failed ? 1 : 0);
