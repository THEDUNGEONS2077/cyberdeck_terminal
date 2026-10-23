// e2e/motion.mjs: how smoothly the wallpaper runs (`npm run e2e:motion`,
// after `npm run build`).
//
// Headless Chromium at 1920×1080. Records, at normal speed and with the CPU
// slowed 4× (a modest laptop on battery):
//   - every gap between the rain's animation frames: median, p95, p99,
//     worst, and frames over 25 ms ("dropped": a 60 Hz frame is 16.7 ms).
//     Since 0.5.0 the rain runs in its own worker: its frames and its
//     drawing time come from the wallpaper host's probe
//     (window.__cyberdeckRain); builds before that are measured by the
//     page's own frames;
//   - main-thread script time per second (CDP Performance metrics): what
//     the wallpaper costs the page (all of it, before the worker);
//   - the pre-warm (the rain simulated before the first frame), from the
//     engine's `rain-prewarm` performance measure, and drawing the sprite
//     sheets (`rain-atlas`, one per layer), when the canvas was ready,
//     and the worst frame gap while loading (a long one = a stall);
//   - a screenshot 50 ms after the window grows (as entering fullscreen
//     does), to see whether the glyphs stretch before the canvas redraws.
// Nothing is asserted (timing on a shared machine is noisy): it's for
// comparing before and after a change. MOTION_DIST measures another build.
//
// Serves the build with the serve binary itself on 127.0.0.1 only, and always stops it.
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
mkdirSync(join(root, 'e2e/screenshots'), { recursive: true });
const PORT = 8167;
const URL = `http://127.0.0.1:${PORT}/`;
const dist = process.env.MOTION_DIST ?? 'dist';
const server = spawn(join(root, 'node_modules/.bin/serve'), [dist, '-l', `tcp://127.0.0.1:${PORT}`, '--no-port-switching'], { cwd: root, stdio: 'ignore' });
for (let i = 0; i < 50; i++) {
  try {
    await fetch(URL);
    break;
  } catch {
    await new Promise((r) => setTimeout(r, 200));
  }
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const cdp = await page.context().newCDPSession(page);
await cdp.send('Performance.enable');
const rows = [];

/** Main-thread script seconds so far. */
const scriptTime = async () => (await cdp.send('Performance.getMetrics')).metrics.find((m) => m.name === 'ScriptDuration')?.value ?? 0;

/** Records the rain's frame gaps (and, in a worker, its drawing time) for `ms` at a CPU slowdown. */
async function frames(label, rate, ms) {
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  await page.waitForTimeout(500);
  const before = await scriptTime();
  const { gaps, busy } = await page.evaluate((ms) => {
    if (window.__cyberdeckRain?.mode?.() === 'worker') return window.__cyberdeckRain.frames(ms);
    // A build without the worker: the page's own frames (the rain drew in them).
    return new Promise((resolve) => {
      const times = [];
      const tick = (t) => {
        times.push(t);
        if (t - times[0] < ms) requestAnimationFrame(tick);
        else resolve({ gaps: times.slice(1).map((x, i) => x - times[i]), busy: null });
      };
      requestAnimationFrame(tick);
    });
  }, ms);
  const script = (await scriptTime()) - before;
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  const s = [...gaps].sort((a, b) => a - b);
  const at = (q) => s[Math.min(s.length - 1, Math.floor(s.length * q))].toFixed(1);
  rows.push({
    scenario: label,
    frames: gaps.length,
    'median ms': at(0.5),
    'p95 ms': at(0.95),
    'p99 ms': at(0.99),
    'worst ms': s[s.length - 1].toFixed(1),
    dropped: gaps.filter((g) => g > 25).length,
    'rain ms/s (worker)': busy === null ? 'n/a' : (busy / (ms / 1000)).toFixed(1),
    'page script ms/s': ((script * 1000) / (ms / 1000)).toFixed(1),
  });
}

// From the first moment: every frame gap until the rain is ready (the pre-warm runs then), and
// the moment the rain is ready, stamped inside the page (a check from outside, through Playwright,
// lands late exactly when the page is busiest).
await page.addInitScript(() => {
  window.__ready = -1;
  new MutationObserver(() => {
    if (window.__ready < 0 && document.querySelector('.wallpaper-canvas[data-ready]')) window.__ready = Math.round(performance.now());
  }).observe(document, { subtree: true, attributes: true, childList: true });
  window.__loadGaps = [];
  let prev = 0;
  const tick = (t) => {
    if (prev) window.__loadGaps.push(t - prev);
    prev = t;
    if (!document.querySelector('.wallpaper-canvas[data-ready]') && t < 10000) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

try {
  await page.goto(URL);
  await page.locator('.brand').waitFor();
  // Builds before the fade-in have no data-ready: give them time instead.
  const ready = await page
    .waitForSelector('.wallpaper-canvas[data-ready]', { state: 'attached', timeout: 10000 })
    .then(() => page.evaluate(() => window.__ready))
    .catch(async () => {
      await page.waitForTimeout(1500);
      return 'n/a';
    });
  const loadWorst = await page.evaluate(() => Math.max(0, ...window.__loadGaps).toFixed(0));
  // The pre-warm finishes after the canvas shows (the faint part is painted meanwhile).
  await page.waitForFunction(() => performance.getEntriesByName('rain-prewarm').length > 0, null, { timeout: 5000 }).catch(() => {});
  const prewarm = await page.evaluate(() => performance.getEntriesByName('rain-prewarm').map((e) => e.duration.toFixed(0)));
  const atlas = await page.evaluate(() => performance.getEntriesByName('rain-atlas').map((e) => e.duration.toFixed(1)));
  await page.evaluate(() => (document.querySelector('.ui-layer').style.display = 'none'));

  await frames('rain, normal CPU', 1, 5000);
  await frames('rain, 4× slower CPU', 4, 5000);

  // A resize like entering fullscreen (the window grows taller): the frame
  // 50 ms later is saved, to see whether the glyphs stretch before the redraw.
  await page.setViewportSize({ width: 1920, height: 1200 });
  await page.waitForTimeout(50);
  await page.screenshot({ path: join(root, 'e2e/screenshots/motion-resize.png'), clip: { x: 0, y: 0, width: 1920, height: 600 } });
  await page.setViewportSize({ width: 1920, height: 1080 });

  console.table(rows);
  console.log(`pre-warm: ${prewarm.join(', ') || 'not measured'} ms · sprite sheets: ${atlas.join(' + ') || 'not measured'} ms · rain ready at ${ready} ms after navigation · worst frame while loading ${loadWorst} ms`);
  console.log('resize: e2e/screenshots/motion-resize.png (50 ms after growing the window)');
} finally {
  await browser.close();
  server.kill();
}
