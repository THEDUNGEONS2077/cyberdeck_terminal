// e2e/perf.mjs: the optimization pass's measurements (`npm run e2e:perf`,
// after `npm run build`).
//
// What it measures, in headless Chromium at 1920×1080:
//   A. Opening the page as it's really opened: the first visit, then
//      repeat visits through the service worker (a New Tab page is mostly
//      repeat visits), with every response from the server delayed DELAY_MS
//      (a network round trip). At normal CPU speed and 4× slower.
//      For each: when the rain is ready, and when the dashboard is up.
//   B. The rain with no frame-rate limit (as on a 120–240 Hz screen):
//      its drawing time per second, in its worker since 0.5.0 (from the
//      host's probe; there, with no limit, animation callbacks come
//      thousands of times a second and the engine draws at most 72 of
//      them, so a callback rate means nothing), and the page's frames and
//      main-thread script time per second (before 0.5.0, the rain's).
//   C. Opening with a lot stored: 27 snapshots of a layout holding a
//      2,000-link imported bar. How long loading the layout takes.
//   D. Edit mode on a big bar (that 2,000-link bar, five folders open):
//      frame gaps while dragging a tile.
// Nothing is asserted (timings on a shared machine are noisy): it's for
// comparing before and after. PERF_DIST measures another build; PERF_GLOW
// (low, medium, high, max) sets SYSTEM ▸ WALLPAPER ▸ GLOW before B;
// PERF_ONLY runs some scenarios only (letters, e.g. `D` or `AB`; C and D
// share their setup, so either runs both); PERF_REPEAT runs D that many
// times (one row each), for a steadier comparison.
//
// Serves the build with its own small server (so responses can be
// delayed), on 127.0.0.1 only, and always stops it.
import { readFileSync, statSync } from "node:fs";
import http from "node:http";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, process.env.PERF_DIST ?? "dist");
const GLOW = process.env.PERF_GLOW;
const PORT = 8171;
const PAGE = `http://127.0.0.1:${PORT}/`;
const DELAY_MS = Number(process.env.PERF_DELAY ?? 120);
const ONLY = (process.env.PERF_ONLY ?? "ABCD").toUpperCase();
const REPEAT = Math.max(1, Number(process.env.PERF_REPEAT ?? 1));
/** Is scenario `letter` to run (PERF_ONLY)? */
const runs = (...letters) => letters.some((l) => ONLY.includes(l));
const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
  ".zip": "application/zip",
  ".json": "application/json",
};

// The server: dist/ with every response delayed; the page itself and sw.js must be revalidated
// each time (no-cache), hashed assets may be cached briefly, as GitHub Pages does.
const server = http.createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, PAGE).pathname);
  let file = join(dist, path === "/" ? "index.html" : path);
  try {
    if (statSync(file).isDirectory()) file = join(file, "index.html");
  } catch {
    file = "";
  }
  setTimeout(() => {
    if (!file) {
      res.writeHead(404).end();
      return;
    }
    const hashed = /assets\//.test(path);
    res.writeHead(200, {
      "Content-Type": TYPES[extname(file)] ?? "application/octet-stream",
      "Cache-Control": hashed ? "max-age=600" : "no-cache",
    });
    res.end(readFileSync(file));
  }, DELAY_MS);
});
await new Promise((r) => server.listen(PORT, "127.0.0.1", r));

/** Records, from the start of navigation: rain ready, dashboard up (the app's marks), and long tasks. */
const timingScript = () => {
  window.__t = {};
  const seen = (name, test) => {
    const check = () => {
      if (window.__t[name] === undefined && test())
        window.__t[name] = Math.round(performance.now());
    };
    new MutationObserver(check).observe(document, {
      subtree: true,
      childList: true,
      attributes: true,
    });
    check();
  };
  seen("rain", () => !!document.querySelector(".wallpaper-canvas[data-ready]"));
  seen("nav", () => !!document.querySelector(".deck"));
  window.__long = 0;
  window.__longest = 0;
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) {
      window.__long += e.duration;
      window.__longest = Math.max(window.__longest, e.duration);
    }
  }).observe({ type: "longtask", buffered: true });
};

/** Waits for rain and dashboard, then reads the timings. */
async function timings(page) {
  await page.waitForFunction(
    () => window.__t?.rain !== undefined && window.__t?.nav !== undefined,
    null,
    { timeout: 30000 },
  );
  await page.waitForTimeout(300);
  return page.evaluate(() => {
    const mark = (n) =>
      Math.round(performance.getEntriesByName(n)[0]?.startTime ?? -1);
    return {
      rain: window.__t.rain,
      nav: window.__t.nav,
      booted: mark("app:booted") - mark("app:start"),
      longest: Math.round(window.__longest),
    };
  });
}

const browser = await chromium.launch();
const rows = [];
try {
  // --- A. Opening: first visit, then repeat visits through the service worker. ---
  for (const rate of runs("A") ? [1, 4] : []) {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
    });
    await context.addInitScript(timingScript);
    const open = async (label) => {
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send("Emulation.setCPUThrottlingRate", { rate });
      await page.goto(PAGE);
      const t = await timings(page);
      rows.push({
        scenario: `A ${label} (cpu×${rate})`,
        "rain ms": t.rain,
        "dashboard ms": t.nav,
        "layout load ms": t.booted,
        "longest task ms": t.longest,
      });
      return page;
    };
    const first = await open("first visit");
    // Let the service worker install and take over before the repeat visits.
    await first.evaluate(async () => {
      await navigator.serviceWorker?.ready;
      for (let i = 0; i < 50 && !navigator.serviceWorker.controller; i++)
        await new Promise((r) => setTimeout(r, 100));
    });
    await first.waitForTimeout(1500);
    await first.close();
    for (let i = 1; i <= 2; i++)
      await (await open(`repeat visit ${i}`)).close();
    await context.close();
  }

  // --- B. The rain with no frame-rate limit. ---
  if (runs("B")) {
    const fast = await chromium.launch({
      args: ["--disable-frame-rate-limit", "--disable-gpu-vsync"],
    });
    const page = await fast.newPage({
      viewport: { width: 1920, height: 1080 },
    });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Performance.enable");
    await page.goto(PAGE);
    await page.waitForSelector(".wallpaper-canvas[data-ready]", {
      state: "attached",
    });
    await page.waitForSelector(".ui-layer");
    if (GLOW) {
      // Through SYSTEM, as a person would; then a reload, so the whole screen is drawn with it.
      await page.keyboard.press("s");
      await page
        .getByRole("radiogroup", { name: "GLOW" })
        .locator("label", { hasText: GLOW.toUpperCase() })
        .click();
      await page.keyboard.press("Escape");
      await page.waitForTimeout(1500);
      await page.reload();
      await page.waitForSelector(".wallpaper-canvas[data-ready]", {
        state: "attached",
      });
      await page.waitForSelector(".ui-layer");
    }
    await page.evaluate(
      () => (document.querySelector(".ui-layer").style.display = "none"),
    );
    await page.waitForTimeout(1000);
    const script = async () =>
      (await cdp.send("Performance.getMetrics")).metrics.find(
        (m) => m.name === "ScriptDuration",
      ).value;
    const s0 = await script();
    const { fps, busy } = await page.evaluate(async () => {
      // The page's frames over 3 s, and meanwhile the rain's drawing time in its worker (if it has one).
      const worker =
        window.__cyberdeckRain?.mode?.() === "worker"
          ? window.__cyberdeckRain.frames(3000)
          : null;
      const pageFps = await new Promise((resolve) => {
        let n = 0;
        const t0 = performance.now();
        const tick = (t) => {
          n++;
          if (t - t0 < 3000) requestAnimationFrame(tick);
          else resolve(n / ((t - t0) / 1000));
        };
        requestAnimationFrame(tick);
      });
      return { fps: pageFps, busy: worker ? (await worker).busy / 3 : null };
    });
    const s1 = await script();
    rows.push({
      scenario: `B rain, no frame-rate limit${GLOW ? ` (glow ${GLOW})` : ""}`,
      "page fps": Math.round(fps),
      "rain ms/s (worker)": busy === null ? "n/a" : busy.toFixed(1),
      "page script ms/s": (((s1 - s0) * 1000) / 3).toFixed(1),
    });
    await fast.close();
  }

  // --- C and D. A lot stored: 27 snapshots of a layout with a 2,000-link imported bar. ---
  if (runs("C", "D")) {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      serviceWorkers: "block",
    });
    await context.addInitScript(timingScript);
    const page = await context.newPage();
    await page.goto(PAGE);
    await page.waitForSelector(".deck");
    await page.evaluate(async () => {
      // A big bar: 150 links on the bar, 40 folders of 46 links each (1,990 links).
      const link = (i) => ({
        id: `l${i}`,
        title: `Site number ${i}`,
        url: `https://site${i}.example.com/page`,
      });
      const children = [];
      for (let i = 0; i < 150; i++) children.push(link(i));
      for (let f = 0; f < 40; f++)
        children.push({
          id: `f${f}`,
          title: `Folder ${f}`,
          children: Array.from({ length: 46 }, (_, j) =>
            link(1000 + f * 100 + j),
          ),
        });
      const bar = { id: "1", title: "Bookmarks bar", children };
      const layout = {
        schemaVersion: 3,
        wallpaper: "matrix-rain",
        prefs: { backupReminderDays: 14 },
        bookmarks: {
          imported: bar,
          importedAt: Date.now(),
          open: ["Folder 0", "Folder 1", "Folder 2", "Folder 3", "Folder 4"],
          arrangement: { order: [], areas: [], hidden: [] },
        },
        panels: { nav: null, brand: null },
      };
      const db = await new Promise((res, rej) => {
        const r = indexedDB.open("cyberdeck_terminal");
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
      const tx = db.transaction("kv", "readwrite");
      const store = tx.objectStore("kv");
      store.put(layout, "layout.v1");
      // 27 snapshots, each a slightly different copy.
      for (let i = 0; i < 27; i++) {
        const copy = structuredClone(layout);
        copy.prefs.backupReminderDays = i % 2 ? 7 : 14;
        copy.bookmarks.open = [`Folder ${i}`];
        store.put(
          {
            at: Date.now() - (i + 1) * 3600_000,
            reason: "change",
            summary: "x",
            layout: copy,
          },
          `snapshot.${Date.now() - (i + 1) * 3600_000}`,
        );
      }
      await new Promise((res) => (tx.oncomplete = res));
    });
    // One load first: the seeded data has no snapshot index yet, and building it is a one-time cost.
    await page.reload();
    await timings(page);
    for (const rate of [1, 4]) {
      const cdp = await context.newCDPSession(page);
      await cdp.send("Emulation.setCPUThrottlingRate", { rate });
      await page.reload();
      const t = await timings(page);
      rows.push({
        scenario: `C big layout + 27 snapshots (cpu×${rate})`,
        "rain ms": t.rain,
        "dashboard ms": t.nav,
        "layout load ms": t.booted,
        "longest task ms": t.longest,
      });
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    }

    // D. Dragging a tile across the big bar in edit mode.
    await page.getByRole("button", { name: "EDIT", exact: true }).click();
    await page.waitForSelector('[role="toolbar"]');
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    // Across the visible tiles (not to NAV's edge, where a drag scrolls it).
    const from = await page.locator(".tile").nth(3).boundingBox();
    const to = await page.locator(".tile").nth(60).boundingBox();
    for (let run = 0; run < REPEAT; run++) {
      await page.evaluate(() => {
        window.__gaps = [];
        let prev = 0;
        window.__rec = true;
        const tick = (t) => {
          if (prev) window.__gaps.push(t - prev);
          prev = t;
          if (window.__rec) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      await page.mouse.move(from.x + 20, from.y + 20);
      await page.mouse.down();
      for (let i = 1; i <= 40; i++)
        await page.mouse.move(
          from.x + 20 + ((to.x - from.x) * i) / 40,
          from.y + 20 + ((to.y - from.y) * i) / 40,
        );
      await page.keyboard.press("Escape"); // cancel: measuring the drag, not the drop
      await page.mouse.up();
      const gaps = await page.evaluate(() => {
        window.__rec = false;
        return window.__gaps;
      });
      const s = [...gaps].sort((a, b) => a - b);
      rows.push({
        scenario: "D drag on the big bar (cpu×4)",
        frames: gaps.length,
        "median frame ms": s[s.length >> 1]?.toFixed(1),
        "worst frame ms": s[s.length - 1]?.toFixed(1),
        "frames >25 ms": gaps.filter((g) => g > 25).length,
      });
      await page.waitForTimeout(500);
    }
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}
console.table(rows);
