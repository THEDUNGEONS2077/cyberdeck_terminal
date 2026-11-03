# Architecture

How cyberdeck_terminal is built, part by part, and why each part is the way it is. Read it with [DESIGN.md](DESIGN.md) (what everything looks like, each wallpaper against its reference), [WORKING.md](WORKING.md) (how the work is done with the user) and [PLAYBOOK.md](PLAYBOOK.md) (the lessons, written to be reused in other projects). The hard rules are in [CLAUDE.md](CLAUDE.md).

1. [Purpose and constraints](#1-purpose-and-constraints)
2. [The code at a glance](#2-the-code-at-a-glance)
3. [Startup](#3-startup)
4. [The service worker](#4-the-service-worker)
5. [The wallpaper host](#5-the-wallpaper-host)
6. [The ten wallpapers](#6-the-ten-wallpapers)
7. [Palettes and sizes](#7-palettes-and-sizes)
8. [The layout document and storage](#8-the-layout-document-and-storage)
9. [The stores](#9-the-stores)
10. [Bookmarks and the bridge](#10-bookmarks-and-the-bridge)
11. [The page](#11-the-page)
12. [Arranging (edit mode)](#12-arranging-edit-mode)
13. [Modules](#13-modules)
14. [Recovery](#14-recovery)
15. [Testing and verification](#15-testing-and-verification)
16. [Build and deploy](#16-build-and-deploy)
17. [Measurements](#17-measurements)
18. [Known limits and next steps](#18-known-limits-and-next-steps)

---

## 1. Purpose and constraints
cyberdeck_terminal is a terminal-style start page for Chrome: a static webpage the user sets as Chrome's homepage and startup page, served from GitHub Pages at https://thedungeons2077.github.io/cyberdeck_terminal/. With its optional extension it is the New Tab page too. An animated wallpaper fills the screen, and the dashboard sits on top:
- **NAV:** the bookmarks bar, arranged into areas;
- **modules:** panels placed by hand (SEARCH, QUICK LAUNCH, TIME, CLOCK, COUNTDOWN);
- **the brand panel:** a clock.

The same wallpapers run on the user's phone as live wallpapers in the sister project **fluid_motion** (`~/projects/fluid_motion`), and some of their shaders are shared byte for byte (§6).

The constraints that shape everything below:
- **Nothing to install.** It's a webpage. What a webpage can't do is done by an optional extension, the bridge (§10), and everything works without it:
  - read the bookmarks;
  - be the New Tab page;
  - focus a tab that's already open.
- **The layout can never be lost.** Everything about the arrangement is one versioned document. It's saved at once, snapshotted, exportable, migrated on load, and kept aside when damaged. A crash shows a way back, never a blank page (§8, §14).
- **Smoothness first, then sharpness, then detail** (WORKING.md). The user's PC is fast (an Intel Core Ultra 7), so the web keeps full fidelity, but nothing may stutter:
  - the wallpapers run off the page's main thread (§5);
  - nothing ticks while unseen;
  - every speed change is measured before and after (§17).
- **No network code and no analytics.** The site is static files. The layout stays in the browser (IndexedDB); the only way out is a backup file the user exports.
- **A shared origin.** quest_log_desktop, another of the user's apps, is served from the same origin (`thedungeons2077.github.io`). Storage, caches and Chrome's per-site zoom are shared ground (§7.3, §8.8).
- **Colours only from the palette.** There are nine palettes, and in each one every text colour passes WCAG AA (§7).

## 2. The code at a glance
```
src/
  main.tsx        first stage: styles, palette, sizes, the wallpaper (tiny; §3)
  start.tsx       second stage: storage, the stores, React, the page (its own chunk)
  palette.ts      the dashboard's palette on <html>, with a start-up hint (§7.1)
  scale.ts        the dashboard's sizes on <html>; cancels Chrome's zoom (§7.3)
  lib/            pure rules (no React, no browser APIs), unit tested: the layout document and its
                  migrations, backups, snapshots, profiles, the reminder, arranging, modules and each
                  kind's rules, bookmarks, the finder's search, palettes, sizes, sharpness, diagnostics
  store/          state and storage: kv (the interface), idbKV (IndexedDB), persist (startup, saving,
                  snapshots), layout, edit, bookmarks, ui (zustand vanilla stores), instance
  bridge/         client.ts: talking to the bridge extension
  wallpaper/      host (the page's side), worker (the wallpaper's thread), types (the contract),
                  catalog (names), registry (engines), probe; one folder per wallpaper
  app/            React: App, Hud, Bookmarks + deck/, Finder, SystemPanel, Dialog, Toast, PopupMenu,
                  Recovery, panels, arrangeDrag, modules/, the shortcuts and hooks
  styles/         theme.css (the tokens), app.css (layout and components)
  __tests__/      Vitest: 21 files, 266 tests
bridge/           the CYBERDECK BRIDGE extension (MV3, plain JS), zipped into the build
e2e/              Playwright: walk.mjs (the browser walk), bridge.mjs, motion.mjs, perf.mjs
scripts/          deploy.sh, zip.ts (the bridge's zip), make-bridge-icons.py
index.html        the wallpaper's canvas as plain HTML, and the font preloads
vite.config.ts    the build, the service worker, the bridge zip, the app's preload, Vitest
```

**The layers:**

| Folder | What | May import |
|---|---|---|
| `src/lib/` | Pure rules: the layout document, migrations, backup files, snapshot keeping, profiles, the reminder, arranging, modules, palettes, sizes, sharpness | nothing outside `lib` |
| `src/store/` | State and storage: `persist.ts` (startup), `layout.ts` (the layout store), `edit.ts`, `bookmarks.ts`, `ui.ts`, `idbKV.ts` / `kv.ts` (storage) | `lib` (and the bridge client's types) |
| `src/wallpaper/` | Canvas code: the host, the worker, the engines | `lib` (layout constants, palettes, sharpness) and `src/scale.ts` |
| `src/bridge/` | `client.ts`: messaging with the bridge extension (Chrome's `externally_connectable` API) | `lib` |
| `src/app/` | React UI | everything |
| `bridge/` | The extension itself, zipped into the build as `cyberdeck-bridge.zip` | nothing (`tree.js` is pure, so the unit tests run it too) |

**Imports go downward:** `app` → `store` → `lib`. `wallpaper/` uses no stores and no React, and `lib` stays pure. `palette.ts` and `scale.ts` are entry-point helpers (DOM, but no React and no stores), so `main.tsx` can run them before the app has loaded. The TypeScript is `strict` with no `any`, and ESLint includes the React Compiler's rules (CLAUDE.md).

## 3. Startup
`index.html` holds the wallpaper's canvas as plain HTML (`.wallpaper`: haze, canvas, floor), black before any CSS arrives, and preloads both fonts. The build adds the first chunks, the stylesheet and the app's chunk as a `modulepreload` (vite.config.ts `preloadApp`), so the browser fetches everything the start needs at once.

1. **`src/main.tsx`** (the first stage) applies the palette and sizes from their start-up hints, then starts the wallpaper (`wallpaper/host.ts` `showWallpaper`). The host hands the canvas to the wallpaper's worker, which is inlined in the host's chunk, so there's no extra request. The worker loads its font, draws its sprite sheets, pre-warms and animates, all off the main thread.
2. It then `import()`s **`src/start.tsx`** (the second stage, its own chunk), which:
   - loads storage before the first render, with top-level `await` (ES2022), so the page never flashes a default layout. It reads `store/persist.ts` `boot` from IndexedDB; if the browser blocks storage, it runs from memory, with a sticky notice that changes won't be kept;
   - creates the layout store (a failed save shows a sticky toast pointing at EXPORT BACKUP), then the bookmarks store with the bridge's cached bar, so NAV draws at once while the bridge is asked again;
   - takes a pending change snapshot on `pagehide`;
   - registers the service worker (production builds only);
   - renders `App` inside the page's `CrashGuard` (§14).

**Start-up hints** (localStorage, one key each, all prefixed `cyberdeck_terminal:`). The layout is read later, from IndexedDB, so these let the first frame be right. They're written by the app whenever the layout's choices change, and losing one costs only a flash:

| Key | Holds | Read by |
|---|---|---|
| `palette` | the dashboard's palette | `palette.ts` |
| `sizes` | UI SCALE, TEXT SIZE, MODULE SIZE, CHROME ZOOM | `scale.ts` |
| `wallpaper` | which wallpaper | `wallpaper/host.ts` |
| `wallpaper-palette` | the wallpaper's palette | host |
| `glow` | the glow level | host |
| `zoom` | each wallpaper's zoom (a JSON map) | host |
| `sharp` | the sharpness guard's verdicts, per wallpaper (§5.4) | host |
| `sharp-budget` | the guard's budget, for the browser tests only | host |

**The chunks** (the 1.0 build; sizes as Vite prints them, kB = 1000 bytes):

| Chunk | Size (gzipped) | Holds | When it loads |
|---|---|---|---|
| `index-*.js` | 1.0 kB (0.6) | `main.tsx` | first |
| `host-*.js` | 147.8 kB (52.4) | the host and its worker, inlined: every engine | with it, preloaded |
| `catalog-*.js` | 13.6 kB (5.5) | what the host, the app and the fallback share: the layout's constants, palettes, the wallpaper catalog | with it, preloaded |
| `start-*.js` | 357.4 kB (109.6) | storage, React, the dashboard | preloaded; run once the wallpaper has started |
| `registry-*.js` | 131.7 kB (46.7) | every engine again, for the page fallback | only when a worker can't run (§5.1) |
| `index-*.css` | 47.1 kB (8.7) | theme.css and app.css | first |
| the fonts | 37.3 and 38.3 kB | JetBrains Mono Regular and Bold | preloaded |
| `cyberdeck-bridge.zip` | 16.2 kB | the bridge | on DOWNLOAD BRIDGE |

- **Why the worker stays inlined:** one fewer round trip before the rain.
- **Why the module kinds aren't split off** (`app/modules/catalog.ts`): split off, they saved about 5 KB gzipped, but the bundler then cut their shared code into seven small chunks, and a first visit came about 130 ms later.

**The rain's pre-warm** records 18 s of the simulation into typed arrays, then paints each visible glyph once. The bright ones go first (the canvas fades in then); the faint rest and the heads' leftover glows follow during the fade (§6.1).

**Timing marks:** `app:start`, `app:booted` and `app:ui` (performance marks) time the app's stages. The wallpaper's `rain-atlas` and `rain-prewarm` measures come from its worker into the page's timeline, and `wallpaper:ready` marks its first full frame. `npm run e2e:perf` reads them (§17).

## 4. The service worker
`sw.js` is generated after each build by `vite.config.ts` (`serviceWorker`). The page is a homepage, a startup page and a New Tab page, opened all day, so it should open from this computer, not the network.
- **The page is served from the cache first:** no network round trip before it can start. Other files are named by their content, so they come from the cache first too.
- **Updates still arrive.** The browser checks `sw.js` itself on every open. A new build installs in the background, fetching every file with `cache: 'reload'` (past the HTTP cache, so it can never store a stale copy), and shows from the next open.
- **The previous build's cache is kept** (only older ones are deleted), so a page still open on the old build can load the rest of its files.
- **Cache names** are `cyberdeck_terminal-<build time>-<hash of the files>`, so they sort oldest first.
- **Only this app's files:** the worker answers only for its own path, and deletes only caches with its own prefix. quest_log_desktop shares the origin and has its own worker.

## 5. The wallpaper host
### 5.1 The page's side and the worker's
`wallpaper/host.ts` owns the canvas from the first moment of loading.
- **The worker.** The host transfers the canvas (`transferControlToOffscreen`) to `worker.ts` with the app's font URL, the palette, the glow, the size and the zoom. It then forwards resize (with the zoom), start, stop, Reduce Motion and glow as messages. The worker answers:
  - `ready`, when the first full frame is drawn (the canvas fades in);
  - the wallpaper's performance measures;
  - the probes (§5.5).

  So the dashboard starts while the rain is still filling, and a frame of rain costs the page nothing. Drawn on the page, every frame had re-run the page's paint steps, more with every bookmark on it (optimization pass 2, 2026-10-22).
- **The fallback.** If a canvas can't go to a worker, or the worker fails, the same wallpaper runs on the page, on a fresh canvas. Its engine (`registry.ts`) is loaded only then, so the page's own scripts don't carry it.
- **A new wallpaper gets a fresh canvas**: a canvas handed to a worker, or one that drew 2D, can't be handed to another.
- **Visibility.** It stops while the tab is hidden and starts again when it's shown.
- **Reduce Motion** gives a still frame, but only through the page's own override (`data-reduce-motion="on"`). The OS setting is ignored since 1.0.1: index.html sets the override off, because Windows' "Adjust for best performance" switches animations off and Chrome passes that on as Reduce Motion, freezing the wallpaper (the user: "just have it be exactly as before").
- **React tells the host only about changes** (`app/App.tsx`): the wallpaper, its glow, its palette, the zooms.

### 5.2 The contract
`wallpaper/types.ts`:
- `create(canvas, { palette, glow, still, onReady })` returns `{ resize(w, h, dpr, zoom), start, stop, setStill, setGlow, setPalette, destroy }`.
- A wallpaper runs in a worker on an OffscreenCanvas, or on the page, so its code may use only what both have: OffscreenCanvas, the font set, `requestAnimationFrame`. No DOM.
- `create` may finish setting up later (fonts), and calls made before then are remembered.
- **The palette** an engine gets is the wallpaper's own (§7.2): `bg`, `line`, `dim`, `text`, `accent`, `bright`, `cool`.
- **The names:** `catalog.ts` names the wallpapers for the page (SYSTEM's list, checking ids, each one's safe pixel cap). `registry.ts` holds their engines, for the worker or the fallback. A unit test checks that every id has an engine.

**To add a wallpaper:**
1. Create a folder under `src/wallpaper/` and export a `Wallpaper` from it.
2. Add it to `WALLPAPERS` in `registry.ts`, and its name card to `catalog.ts`.
3. If it's WebGL, add it to the walk's lost-context path (§5.6).

Its `id` is stored in layouts and backups, so it must never change once released. An unknown id (a layout from a newer build) shows the default, MATRIX RAIN.

### 5.3 Sizes and zoom
- **The canvas is the size of the screen**, or of the window where that's bigger (zoomed out, or a window across two screens). It is not the window's size, so resizing the window or going fullscreen doesn't touch it: the window just shows more or less of it. Only a new screen size, zoom or pixel ratio resizes it, debounced by 150 ms. (0.15.1 sized it to the screen at the page's browser zoom; the user preferred the old way, back in 0.15.2.)
- **Chrome's zoom is cancelled for the wallpaper too** (0.17.1, with SYSTEM ▸ CHROME ZOOM on IGNORE, the default). `wantedSize` works the size out as at 100%:
  - the window's CSS px times the zoom being cancelled (`src/scale.ts` `cancelledZoomNow`), since Chrome's `screen.width` doesn't follow its zoom;
  - the pixel ratio divided by that zoom;
  - the canvas's CSS size is that size ÷ the zoom, so it still covers the window exactly.

  A wallpaper then looks the same at any Chrome zoom, and only SYSTEM ▸ ZOOM zooms it. `onBrowserZoom` resizes it at once when the zoom, or IGNORE/APPLY, changes.
- **ZOOM** (`prefs.wallpaperZoom`). Each wallpaper keeps its own, by id, stored only where it isn't 100%. The steps, `lib/layout.ts` `ZOOM_STEPS`, are Chrome's levels from 50% to 200%.
  - **How a wallpaper zooms:** the zoom is part of the size, `resize(w, h, dpr, zoom)`. Most lay themselves out with `zoomedSize`: for a screen 1/zoom as big, drawn zoom times as large, as browser zoom would do for the wallpaper alone. The pixel ratio is capped first (§5.4), then zoomed, so the canvas keeps its pixels at any zoom: sharp, never scaled up. MEGACITY's ledge keeps its place on the screen.
  - **VELOCITY** is laid out in shares of the screen, so `zoomedSize` would change nothing. It scales its sizes instead (the panels' widths and drift, the streaks, the fine lines, the flare and its arc, about the flare's corner), and the panels keep their slant.
  - **The host** keeps every wallpaper's zoom and a start-up hint, so a wallpaper opens at its zoom before the layout is read. `setWallpaperZooms` resizes the running one when its zoom changes.
  - **The controls:** SYSTEM ▸ APPEARANCE ▸ ZOOM (− value + RESET), the keys + − 0 (`app/zoom.ts`; in fullscreen too) and three finder commands. A zoom step is a layout change, saved and backed up like the glow.

### 5.4 Sharpness (0.14.0, `lib/sharpness.ts`)
- **The cap.** The host passes each engine the pixel ratio in force: the screen's own, up to `SHARP_DPR` (3). Each engine's own `MAX_DPR` is that ceiling.
- **The safe cap.** Each wallpaper has one (`catalog.ts` `safeDpr`: 2, VELOCITY 1.5, what it drew at before), which applies once the guard has stepped back. On the page (no worker), it's always the safe cap.
- **The guard.** Where full sharpness would draw more than the safe cap, the host waits `GUARD_SETTLE_MS` (1 s) after `ready`, then reads the worker's frame ring over `GUARD_WATCH_MS` (3 s, at least 30 frames).
  - The ring is each frame's start and drawing time, the last 512, two numbers each, with no allocation. The `stats` probe reads it.
  - If p95 drawing is over `GUARD_BUDGET_MS` (8 ms, half a 60 Hz frame), the guard steps back to the safe cap and resizes.
  - It never goes below the safe cap: the web never lowers quality.
  - The verdicts are a hint (`cyberdeck_terminal:sharp`), per wallpaper. `retrySharpness` (SYSTEM's TRY AGAIN) forgets them. A new screen (another pixel ratio) is watched again.
  - The browser tests set `cyberdeck_terminal:sharp-budget` to 0 to see it step back.
- **NEURAL NET goes further** (§6.2): it supersamples, as sharp as the machine keeps smooth.

### 5.5 The probe and diagnostics
- **`window.__cyberdeckRain`** is the tests' probe. The page can't read a canvas it handed to a worker, so the worker answers:
  - `pixels()`: the share of the canvas that's lit, a fingerprint, and its size in pixels (`wallpaper/probe.ts`; it reads 2D and WebGL canvases alike);
  - `frames(ms)`: the frame gaps and drawing time in the worker;
  - `mode()`: `worker` or `page`;
  - `zoom()`: the running wallpaper's zoom;
  - `sharpness()`: the ratio in force, and the guard's verdict.
- **COPY DIAGNOSTICS** (SYSTEM's foot; `app/diagnostics.ts` gathers, `lib/diagnostics.ts` formats, tested) copies, as text to paste back while tuning:
  - the browser and OS (Client Hints);
  - the GPU (a throwaway WebGL context's renderer);
  - the screen and window;
  - the wallpaper's sharpness and its last 3 s of frames (`wallpaperReport`);
  - the start-up marks;
  - the layout's counts.

  Never an address, a title or a bookmark. Nothing is sent: the clipboard is the only way out.

### 5.6 Lost graphics contexts (1.0)
Every WebGL wallpaper listens for two events:
- **`webglcontextlost`:** it calls `preventDefault()`, so Chrome may give the context back.
- **`webglcontextrestored`:** it sets everything up again (programs, buffers, textures) and draws.

Until 1.0 they listened for `contextlost`, the 2D canvas's event, which WebGL never fires: after a driver reset or a wake from sleep, the wallpaper stayed dark until a reload.

The walk loses and restores each one's context on the page (`WEBGL_lose_context`), then checks that it draws and moves again. It keeps the extension object from before the loss, since `getExtension` returns null on a lost context.

## 6. The ten wallpapers
| Wallpaper | Drawn with | Made once (per size, palette, glow or zoom) | Each frame | Shared with fluid_motion |
|---|---|---|---|---|
| MATRIX RAIN (`matrix-rain/`) | Canvas 2D | the glyph sheets | a twelfth of the screen faded, moved glyphs copied, a few re-rolled | ported (its own GL) |
| NEURAL NET (`neural-net/`) | WebGL 2 (2D fallback) | the scene | every link and node, two passes | fragment shaders and colour, byte for byte |
| VELOCITY (`velocity/`) | Canvas 2D | the striation pattern (a small tile) | a few big gradient fills, additive | ported |
| DATA FLOW (`data-flow/`) | Canvas 2D | the board, as a layer | a copy of it and a few hundred strokes of light | ported, board rule for rule |
| MEGACITY (`megacity/`) | WebGL 2 | the city's skylines, a texture | the city from a cache (redrawn once a second), signs, lights | shaders byte for byte, city rule for rule |
| HORIZON (`horizon/`) | WebGL 2 | the sky; the land's mesh | the bottom half: the land and the haze wall | shaders byte for byte (the phone dithers its own sky) |
| SUNSET (`sunset/`) | WebGL 2 | the sky | the ground, one short shader | shaders byte for byte |
| PRISM (`prism/`) | WebGL 2 | the field | two draw calls | shaders byte for byte; the web's is final |
| QUANTUM KERNEL (`quantum-kernel/`) | Canvas 2D sheets, laid together in WebGL 2 | each depth's sheet | one pass on the graphics card | ported (its own renderer) |
| SUMMIT (`summit/`) | Canvas 2D | each layer's strip | copies of the strips | not yet ported |

What each looks like, against its reference, is in DESIGN.md § 5.
- **Frame rates:** NEURAL NET and DATA FLOW draw on every frame the screen shows (the user asked for them as smooth as possible, 2026-10-23). The others draw up to about 72 frames a second (`MIN_FRAME_MS`).
- **Motion by elapsed time:** every engine moves by the time since its last frame, with a step capped at 0.1 s (`MAX_FRAME_STEP`), so a stall doesn't make it leap.

### 6.1 MATRIX RAIN (`matrix-rain/`)
- **Its light layers are CSS** (app.css), around the canvas: `.wallpaper-haze` behind it (a faint accent wash) and `.wallpaper-floor` over it (the darkening toward the bottom).
  - Since 0.17.6 both span the full height along smooth curves, with a stop every 10%: the haze is (1 + cos πt) / 2 of 7% accent, the floor t³ of the background.
  - Before, the floor covered only the bottom 16% and the haze had corners at 55% and 95%; their edges read as lines across the screen.
  - fluid_motion's `rain_composite.frag` works out the same curves per pixel.
- **`params.ts`** holds every tunable number, matched to the reference wallpaper.
- **`glyphAtlas.ts`** pre-draws every glyph, with its glow, once per layer into a sprite sheet (an OffscreenCanvas).
  - Its rows are HEAD, BODY and DIM, plus two more. ERASE is each glyph's bare shape, a touch bolder. HALO is a head with its shape cut out: the glow a head leaves behind. ERASE and HALO aren't needed for the first paint, so they're drawn right after it (`finish`).
  - Each row's slots are the cell plus as far as that row's glow reaches (`GLOW_REACH`), so big head glows aren't cut off and the far more frequent body copies stay small.
  - **The glow** (SYSTEM ▸ WALLPAPER ▸ GLOW, `prefs.rainGlow`): `params.ts` `GLOW` sets the glow colour's strength and the heads' and bodies' blur for LOW, MEDIUM, HIGH (the default) and MAX. A change rebuilds the sheets while the rain carries on, so the new glow rains in.
  - Katakana are used only if a system font can draw them (`canDraw`).
- **`engine.ts` never repaints the whole canvas.** Each frame it does three things:
  1. It fades one set of interleaved 2 px stripes, a twelfth of the screen. Each pixel is still faded once per 0.2 s, but no frame fades everything, so there's no whole-screen dimming pulse and no expensive frame. The fills are plain solid rectangles, the cheap path on GPU and CPU canvases alike (a pattern fill measured many times slower on a CPU canvas).
  2. It copies in the glyphs that drops moved onto.
  3. It re-rolls a few glyphs inside trails (the flicker).
- **Changing a glyph in place** (a head turning into body, the flicker) first cuts the old glyph out by its own shape (the ERASE row, `destination-out`), never by clearing its cell, which punched dark boxes into the glow around it. `glyphAt` keeps each cell's glyph for that.
- **Heads leave a glow.** A head's glow stays behind as it moves on, so lit trails glow as streaks. The pre-warm records where (`halo`) and paints it (the HALO row).
- **Drops:** each column of each layer has one drop slot. A drop falls to a random depth, then waits at the top, and the wait sets the layer's occupancy.
- **Startup:** 18 s of rain are simulated before the canvas is shown, so it opens full.
  - Only glyphs still at least 5% bright are painted.
  - In the worker the work runs in big slices (`PREWARM_WORKER_BUDGET_MS`, 250 ms), stopping once after the bright glyphs so that frame shows. On the page (the fallback) it's 16 ms a frame, then 6 ms once the canvas shows, so the dashboard isn't kept waiting.
  - `onReady` fades the canvas in after the bright part.
- **A resize** (rare: the canvas is screen-sized) copies the drawn pixels across and adds or removes columns.

### 6.2 NEURAL NET (`neural-net/`)
- **`params.ts`** holds every tunable number, matched to its reference.
- **`engine.ts` builds a scene per screen size** (`scene`):
  - node homes: a scatter plus clusters, past the screen's edges;
  - links (`linkNodes`): each node's picks from its nearer neighbours, so some reach far.

  It moves the scene on (`advance`) and redraws all of it on every frame the screen shows (no frame-rate cap). Colour goes by place along a diagonal (`shade`): `--cool`, `--text-bright`, `--accent`. The big glow behind is CSS (app.css `.wallpaper[data-wallpaper='neural-net']`).
- **Drawn with WebGL 2 since 0.22.0** (`gl.ts`), as fluid_motion draws it. The 2D canvas stroked each link 0.9 px wide, and Chrome's GPU-drawn canvas (the worker's) anti-aliases strokes thinner than a pixel poorly: the links stepped on the user's screen, though not in tests (headless Chromium draws canvases in software). Now:
  - **each link is a quad** (`shaders/link.vert`) whose fragment shader gives it a one-pixel soft edge at any angle, in two passes (a wide faint glow, then the line); each node and signal is a sprite worked out per pixel (`spark.vert`);
  - **shared with the phone, byte for byte:** `shaders/link.frag`, `spark.frag` and `shade.glsl` are fluid_motion's `neural_link.frag`, `neural_spark.frag` and `neural_shade.glsl`. The vertex shaders are the web's own: they take each link's ends and each sprite per instance (`engine.ts` `pack`, into arrays reused frame to frame), since a big desktop screen holds more nodes than the phone's uniform arrays (128);
  - **the cost:** the drawing script fell from about 36 to 4 ms a second, and the GPU's work is a few hundred quads.
- **Supersampled, as sharp as the machine keeps smooth** (0.23.2 at a fixed 2×; tuned since 0.23.3 by `tuner.ts`, pure and tested). Thin links were still a little jagged at the screen's own resolution, most in the lower half where the red links are brightest.
  - **How:** with WebGL it draws at 1, 1.5, 2, 3 or 4 times the screen's pixels each way, and the browser shrinks the canvas to the screen, averaging the extra pixels.
  - **Climbing:** it starts at 2×. After each 2 s window of frames it climbs a level while frames stay smooth. The 0.6 s after a change are ignored, since a resized canvas hitches once.
  - **Stepping back:** once the slowest tenth of frame gaps runs 1.4× the smoothest the screen has shown, it steps one back, for good this session. The user: "as much as possible but limit it to the threshold when performance starts dropping".
  - No canvas goes over 8192 px either way (`MAX_CANVAS`). In headless Chromium (software GL) it settles at 1.5×.
  - Its links are 1.3 CSS px wide since 0.23.1; the phone keeps 0.9.
- **Without WebGL 2** the 2D drawing (`draw2d`: strokes and pre-drawn sprites, one per colour step) stands in.
- No pre-warm: the first frame is the whole picture.

### 6.3 VELOCITY (`velocity/`)
- **`engine.ts` redraws everything each frame**, additively (`lighter`) on a clear canvas over the dark CSS background:
  - each panel is one rectangle drawn through a skew (its lean, which costs nothing), with a soft gradient and a striation pattern;
  - streaks are thin gradient rectangles;
  - the flare is a radial gradient and an arc.

  Up to about 72 frames a second, at up to 1.5 device px per CSS px (its safe cap).
- **Colours** come from the wallpaper's palette (`tones`): the pale light from `--cool`, the red from `--accent`.
- **ZOOM scales its sizes** (§5.3).

### 6.4 DATA FLOW (`data-flow/`)
- **`params.ts`** holds every tunable number. There's no reference image: the look is a printed circuit board's (DESIGN.md).
- **`board.ts` lays out the board**, pure and seeded (unit tested; fluid_motion's Kotlin port lays it out the same way):
  - **the grid:** points are `PITCH` apart, a few past every edge of the screen, and traces run in the eight directions 45° apart;
  - **chips:** the main chip sits a little right of the middle; side chips are spread out (each the farthest of several tries from the others); each has a clear ring with pins every 2 points;
  - **buses:** neighbouring pins run out together on one route (`plan`). Before a 90° bend the outer traces run on further, so a bus bends like a ribbon. A trace blocked at once isn't laid;
  - **loose traces** fill the rest, some as small buses from a row of vias, until `COVERAGE` of the screen's points carry one;
  - **spacing:** traces never cross or touch. A point holds one trace at most, no diagonal step passes between two taken points, and every trace keeps one free point beside it;
  - **two colours, always** (0.26.0): at least a fifth of every board's traces are in `--cool`. A board that falls short turns its smallest warm buses over until it doesn't, so the rest is laid out exactly as before.
- **`engine.ts` draws the still board once into a layer of its own** (per size, palette and glow): the dot grid, the traces (with the glow level's soft glow), vias, pads and chips.
  - **Each frame** copies that layer and adds the light (`lighter`): packets running along the traces (a halo, a tail brightening in six slices, a glowing head sprite), the afterglow of traces that just carried one, vias flashing, chips glowing as data arrives. It's a few hundred small strokes, whatever the screen size.
  - **Rate and opening:** it draws on every frame the screen shows, and 2.5 s of packets are simulated before the first frame.
- **Colours** come from the wallpaper's palette (`flowTones`): warm traces and packets from `--text-dim` / `--accent`, cool ones from `--cool`. The glow round the main chip is CSS.

### 6.5 MEGACITY (`megacity/`)
The first wallpaper in WebGL 2, because its city has tens of thousands of windows.
- **One pass per pixel.** `city.ts` lays the city out once, per layer of towers: a skyline (per column, the top there and which tower it is), packed into a float texture. `shaders/city.frag` walks the layers near to far and stops at the first tower a pixel is inside.
  - A tower's face, its lit roof edge, its edge strip and its windows all come from its seed, and the windows go on and off by the clock.
  - Nothing is drawn twice, and nothing about the city is sent per frame.
- **Its cache** (0.13.1). The city's clock only switches windows, so the city is drawn into a cache once a second (the clock in whole seconds) and copied each frame. A new city, size, palette or glow draws it again at once. On the phone that took a frame's graphics work from 5.09 ms to 0.93 ms (fluid_motion 0.7.0).
- **Small draws on top:** the signs, haze patches, beacons and drones (`sim.ts`, a few kilobytes a frame), then the foreground (`city.ts` foreground: the railing and the ledge).
- **Shared with fluid_motion.** Its shaders are fluid_motion's too (`assets/shaders/mc_*`, byte for byte), and its layout is ported rule for rule (`lib/megacity`, with a golden test there).
- **Without WebGL 2**, a still 2D picture (the haze and the ledge).

### 6.6 HORIZON (`horizon/`)
WebGL 2, with a depth buffer.
- **The sky** is per pixel (`shaders/sky.frag`): the haze, the glow and its core. It never changes, so it's drawn only when the size, palette or glow changes, and the canvas keeps it (`preserveDrawingBuffer`).
- **The land** (`land.ts`) is made once per layout size: a field 64 units deep, cut into cells that follow the layout's height. A cell is 1 unit at 1080 CSS px, smaller for a bigger layout (so more triangles zoomed out, as the other wallpapers' detail), from 0.5 to 1.2. That's about 12 000 triangles at 1080 px, plus a far wall of haze that fills the band up to the horizon.
  - Every pixel below the horizon is redrawn each frame (scissored to the bottom half), and the sky above is left alone.
  - Each strip of triangles is placed by the shader at its distance from the camera now (`uCamZ`, the only per-frame number). A strip passing behind the near clip comes round at the far end, deep in the haze, so the land never ends and never pops.
  - Strips are drawn nearest first (two ranges of the buffer), so the depth test drops hidden fragments early. The haze amount is per vertex; its colour is worked out only where there is haze.
- **Edges** (0.17.4) come from each triangle's corner weights and their gradient's length, not `fwidth`, which over-reads slanted edges and draws them thinner, in steps. So every line is the same width at any distance and angle.
  - The core is a soft bell, with a wider glow round it (a Gaussian bloom and a long tail, its strength per GLOW level).
  - The far land fades into the same `haze()` the sky draws (one function, written into both shaders).
- **No multisampling.** `antialias: true` smoothed the hills' outlines but made it laggy on the user's machine (0.17.4; off again in 0.17.5). The outlines a near hill draws over the land behind stay slightly stepped.
- **Shared with fluid_motion** (its 0.8.0): the shaders are its `assets/shaders/hz_*`, byte for byte. The phone frames HORIZON through uniforms and its own mesh: smaller cells on an upright screen, strips far end first with no depth buffer, within a triangle budget. It draws the sky with its own dithered copy, because the dashboard's HORIZON is never changed for the phone (the user, 2026-10-29).
- **Without WebGL 2**, a still 2D picture (the sky and its glow).

### 6.7 SUNSET (`sunset/`)
WebGL 2, and the lightest of them: no geometry, textures or depth buffer, just two full-screen triangles' worth of per-pixel shader.
- **The sky** (`shaders/sky.frag`: the sky, stars, the striped sun, its glow, the scanlines) is drawn once per size, palette or zoom, and kept (`preserveDrawingBuffer`).
- **Each frame** draws only the ground below the horizon (scissored, `shaders/ground.frag`). Each pixel finds the spot on the ground it sees, then its distance to the nearest grid line from the gradient's length (0.17.3), drawn as a soft bell with a Gaussian glow. The only per-frame input is how far the grid has come, wrapped after whole squares and whole wave cycles.
- **The horizon** (0.17.2–0.17.3). Far off, where squares are a few px, the lines fade into the dark ground with a little of their average light (they once piled up into a bright band). Below the horizon the ground melts into the sky's own colour, over `uMeltH` (5% of the height): the same gradient and sun glow `sky.frag` draws just above. There's no line between them.
- **Shared with fluid_motion** (its 0.8.0): `assets/shaders/ss_*`, byte for byte. `sky.frag` asks for `precision highp int`, because its star hash multiplies 32-bit numbers, which phone GPUs would otherwise do at medium precision.
- **Without WebGL 2**, a still 2D picture (the sky and the sun's disc).

### 6.8 PRISM (`prism/`, 0.23.0)
WebGL 2: smoky glass blocks lit magenta and blue. Two draw calls a frame, with no depth buffer and no textures. **The web's PRISM is final as it is** (the user, 2026-10-28): nothing in it changes. The phone's cheaper versions are its own.
- **The scene** (`field.ts`, pure and tested) is made once from a random source:
  - blocks of 1–3 cells on three layers: the ground fullest, two floating ones sparser. A block goes only over cells whose blocks end below its floor, so none cut through each other;
  - light pools spread evenly over the part in view: one per patch of a 3 × 3 grid there, so every layout has its share.

  (0.23.0 also had neon tubes, pairs of glowing lines; the user had them removed in 0.23.1.)
- **Each frame:** the background (`back.frag`: navy, lighter low down, with wide soft pools), then every block in one instanced draw (`box.vert`/`box.frag`).
- **Glass without a depth buffer.** Blocks are drawn back to front (`sortBackToFront`: an insertion sort into an order kept between frames, nearly sorted already, since the camera only sways). Within a block, its far faces go first: from the camera's high corner every block shows the same three faces, so the cube's buffer lists −x, −y, −z first. The glass is premultiplied: the body blends over what's behind, and the light and the edges add.
- **A face** is tinted by the light pools near it (up to 16, breathing), brighter at grazing angles, and fades into the navy with distance.
- **Its edges** are the distance to the face's edge over its gradient's length (as HORIZON's lines): a soft core 1 px wide and a glow, the same width at any distance and angle.
- **Smooth outlines without multisampling** (0.23.1; the user saw jagged edges). A triangle's edge is a hard step, so the bright glass stepped against the dark. Now each edge line sits wholly inside its face (centred a core-width in), and every face fades out over its last device pixel (`cover`), so the face draws its own anti-aliased outline. Where two faces of a block meet, the two lines leave a hairline between them, like a bevelled glass edge.
- **Nothing new per frame:** the sorted instance data and the lights' uniforms are written into arrays made once.
- **Shared with fluid_motion:** its shaders follow the phone's rules (GLSL ES 3.00, `highp` positions) and are the phone's `pr_*`, byte for byte. The phone draws HIGH and ULTRA with them, and LOW and MEDIUM with cheaper ones of its own.
- **Without WebGL 2**, a still 2D picture (the navy and its light pools).

### 6.9 QUANTUM KERNEL (`quantum-kernel/`, 0.27.0)
Five depths of code scrolling up past each other on true black. Their sheets are drawn with Canvas 2D, and since 1.0 they're laid together with WebGL 2.
- **The code** (`code.ts`, pure and tested) is laid out once per size:
  - lanes of indented blocks, repeating across the width from a random phase per depth. Lines left of the screen are trimmed, so columns stay ≥ 0 (0.27.2: the lanes had started at the left of their share, leaving a strip down the right);
  - each depth is a loop of rows a little taller than the screen;
  - the glyphs are the rain's (`matrix-rain/glyphAtlas.ts`: its font stack, katakana when a font can draw them, mirrored).
- **Sheets.** Text is the slow part, so each depth is drawn once into a sheet, with its glow (a wide haze and a tight bloom: `ctx.filter` blurs) and its focus blur baked in.
  - Its loop is drawn with a margin of wrapped lines, so the glow and blur run across the seam.
  - Blurred depths are drawn smaller (`resolution`): out of focus, they lose nothing.
  - A palette or GLOW change redraws the sheets; the code and the scrolling stay.
- **Each frame (1.0) is one pass on the graphics card** (`shaders/kernel.frag`):
  - each sheet is a premultiplied RGBA texture (uploaded as the canvas keeps it, `UNPACK_PREMULTIPLY_ALPHA_WEBGL`), repeating down (`REPEAT`);
  - each is read at its scroll and laid over the ones behind on black (source-over);
  - the line being run gets its sheet added again inside its patch (the canvas's `lighter`, clamped as the canvas clamps), fading in and out;
  - the canvas copy of each sheet is dropped once it's on the card (they're screen-sized).
- **Why:** copying five screen-sized sheets at fractional rows each frame cost about 0.5 s of every second of the worker's time in the walk's software Chrome, the most of any wallpaper. Whole rows halved it, and the cost stayed in the copies themselves. One pass: about 2 ms a second.
- **The same picture:** the sheets are unchanged. A seeded still frame of the old and new builds (on the page, `Math.random` seeded, Reduce Motion) differs by at most 11 of 255, over 8 on 0.004% of pixels. The GPU frame is about 1 of 255 brighter on average, as it doesn't round down at each of the canvas's five 8-bit blends.
- **Without WebGL 2** the canvas copies the sheets as before (black, each sheet twice, the patch with `lighter`): the same seeded frame matches the old build exactly.
- **On the phone** (fluid_motion 0.13.1) the same layout is drawn at a text scale for the narrow screen, by its own renderer.

### 6.10 SUMMIT (`summit/`, 0.28.0)
Canvas 2D: a low-poly range above a sea of clouds, every layer scrolling right to left at its own speed and looping forever.
- **The shapes** (`terrain.ts`, pure and tested) are laid out once per size. Each layer is a skyline over a lattice of triangles, each triangle shaded flat:
  - a range: peaks' flanks (`PEAK_SKEW` gives a few grand ones, `JAG` the sub-peaks and notches), shaded by its face's normal against a low sun;
  - clouds: round billows, shaded by how far below their crest;
  - the sky: flat, shaded by height.

  Everything loops: the lattice's last column is its first, a loop along, so the facets at the seam join exactly.
- **Strips.** Each layer is drawn once into a strip one loop wide (1.6 screens), plus 4 px of the loop's start again, so its two copies on screen overlap on the same picture. (Copies meeting at a fractional pixel would each half-cover it: a faint dark line.)
  - Its silhouette is filled first in its base colour, then each facet is filled and outlined in its own colour, so no hairline shows between facets.
  - No multisampling is needed: Canvas 2D antialiases the edges.
  - The sky's strip is half resolution.
  - A cloud bank is softened: drawn with a margin, blurred once, then cut to size, so the blur crosses its seam.
  - **Trimming:** each strip stops a few px below where the layers in front cover the whole width (the lowest point of a nearer skyline), since nothing under there is ever seen. That keeps the fill per frame down: in 0.28.2 the taller ranges and clouds had halved the frame rate in software Chrome.
- **The clouds are grey in every palette** (the user, 0.28.1): the background mixed 16–88% toward white (`CLOUD_GREYS`), the far banks hazed toward grey, never the palette's hue.
- **Each frame is only copies:** black, each strip at its scroll (twice where its loop wraps), and the horizon's glow (a small gradient sheet, scaled up) added over the sky. In the walk's software Chrome: 60 fps, about 8 ms of drawing a second.

## 7. Palettes and sizes
### 7.1 The dashboard's palette
- **`src/lib/palettes.ts`** (pure) holds the nine palettes. Each is a set of base colours keyed by token (`PALETTE_TOKENS`), plus WCAG contrast maths for the test that holds every palette to the colour rule (DESIGN.md § 2).
- **`src/palette.ts`** puts the dashboard's palette (`prefs.palette`) on the page. It sets the base tokens on `<html>` as inline custom properties, and remembers the choice (`cyberdeck_terminal:palette`), so `main.tsx` applies it before anything draws and a non-default palette never flashes green first.
- **theme.css mixes every other colour from the base tokens** (`color-mix`), so a palette recolours everything: glows, tints, rules, scanlines.

### 7.2 The wallpaper's palette
- **Two palettes, chosen apart** (the user, 2026-10-23): the dashboard's (`prefs.palette`) and the wallpaper's (`prefs.wallpaperPalette`). A layout from before 0.6.1 starts the second from the first.
- **The host's `setWallpaperColors`** sets the same base tokens on the `.wallpaper` element itself, so the wallpaper's CSS layers (which use only base tokens, mixed in place) take its colours while the page keeps the dashboard's. It sends the colours to the engine, and keeps its own start-up hint (`cyberdeck_terminal:wallpaper-palette`). The engine redraws its sprites and carries on.
- **Per-wallpaper CSS:** the host sets `data-wallpaper` on `.wallpaper`, and app.css styles each wallpaper's background, haze and floor.
- Both palettes are in the layout (no schema bump: a missing one gets PHOSPHOR, or the dashboard's), so backups and snapshots keep them.

### 7.3 Sizes, and cancelling Chrome's zoom (0.17.0)
**`src/scale.ts`** puts the dashboard's sizes on the page (the rules are in `lib/scale.ts`). It sets three variables on `<html>`, plus a start-up hint (`cyberdeck_terminal:sizes`), so the UI never draws at the wrong size first:

| Variable | Is | Set by |
|---|---|---|
| `--ui-zoom` | the CSS `zoom` of `#root`: everything but the wallpaper | UI SCALE (`UI_SCALE_STEPS`, 50–300%) ÷ Chrome's zoom, when that's cancelled |
| `--text-scale` | theme.css's type sizes | TEXT SIZE (`TEXT_SCALE_STEPS`, 80–150%) |
| `--module-scale` | the modules' `--m` | MODULE SIZE (`MODULE_SCALE_STEPS`, 50–100%; 70% until chosen) |

- **Why cancel Chrome's zoom:** Chrome keeps one zoom per site, and quest_log_desktop shares this one, so zooming either zooms both. No page can set or refuse that zoom.
  - `lib/scale.ts` `browserZoom` works the zoom out: roughly, as outer ÷ inner width; exactly, from the pixel ratio, as zoom × an OS display scale, snapped to Chrome's levels.
  - With CHROME ZOOM ▸ IGNORE (the default), the UI is drawn at UI SCALE ÷ that zoom.
  - It's worked out again on every resize, since a zoom resizes the page. The wallpaper cancels the same zoom on its own (§5.3).
- **Inside the zoom:**
  - Chrome zooms `vw`/`vh` too, so app.css uses `--view-w`/`--view-h` (the window in the UI's own px).
  - Screen boxes (`getBoundingClientRect`, the pointer) are screen px, so code turning one into a CSS length divides by `uiZoomNow()`: the ⋯ menus, the deck's glide, the drag label, and `scaleOf` for kept widths.
  - Shares of the window (a panel's place) need nothing.
- **CSS `zoom` is a real relayout,** so text stays crisp at any step (a transform scale would blur it).

## 8. The layout document and storage
### 8.1 The document (`lib/layout.ts`)
Everything about how the dashboard is arranged is one versioned JSON document. Saving, snapshots and backup files all store exactly this document, so anything added to it is backed up and restorable from the day it lands.

| Field | Holds |
|---|---|
| `schemaVersion` | 7 (`LAYOUT_SCHEMA_VERSION`) |
| `wallpaper` | the shown wallpaper's id |
| `prefs` | `backupReminderDays`, `rainGlow`, `palette`, `wallpaperPalette`, `wallpaperZoom` (by id, only where it isn't 100%), `switchTabs` (Chrome match patterns), `uiScale`, `textScale`, `moduleScale`, `cancelBrowserZoom` |
| `bookmarks` | `imported` (a bookmarks bar copy, or null), `importedAt`, `open` (folder keys), `arrangement` (areas, order, hidden) |
| `panels` | where NAV and the brand panel sit (null: the usual place), NAV's width, `brandOff` |
| `modules` | the modules, bottom to top: id, kind, place (with its width), settings, own sizes, title |

**Its versions:**

| Version | Added | Release |
|---|---|---|
| 1 | wallpaper, prefs | 0.1.x |
| 2 | bookmarks: an imported copy of the bar, and which folders are open | 0.2.0 |
| 3 | `bookmarks.arrangement` (areas, order, hidden) and `panels` | 0.3.0 |
| 4 | `modules` | 0.11.0 |
| 5 | a module's own sizes (`modules[].sizes`), and the CLOCK kind | 0.18.0 |
| 6 | a module's own UI SCALE and MODULE SIZE folded into one SIZE (`sizes.scale`) | 0.19.0 |
| 7 | 0.24.0's TIMER becomes a COUNTDOWN | 0.25.0 |

**New prefs don't bump the schema.** A missing or odd one is normalized to its default on load (the palettes, the zooms, the sizes, `brandOff`, a module's `title`), so older documents read as they are and older apps ignore what they don't know.

### 8.2 Migrations (`lib/migrations.ts`)
Every way a layout comes in goes through `migrate` and validation: startup, a snapshot's restore, a backup's import.
- **A shape change:** bump `LAYOUT_SCHEMA_VERSION` and change the types, add `STEPS[n]` (version n → n+1), and add a fixture test with a real version-n document.
- **Worked examples:**
  - The 5 → 6 step (`ownScale`) folds 0.18.0's per-module `uiScale` and `moduleScale` into one `scale`, their product snapped, using the document's own prefs. A module stays as big on screen at the dashboard's UI SCALE. Fixtures of real version-4 and version-5 layouts are in `src/__tests__/clock.test.ts`.
  - The 6 → 7 step (`fromTimer`) turns a TIMER into a COUNTDOWN in the same place and size, its label kept; one that was running counts to the minute it would have ended.
- **What it repairs:**
  - Lists are normalized one entry at a time: `normalizeModules` drops an unknown kind or a malformed entry, never the whole layout.
  - An unknown palette falls back to the default.
  - An unknown wallpaper id (a newer build's) is kept, and the host shows the default for it (§5.2).

### 8.3 The storage keys
IndexedDB, database `cyberdeck_terminal`, store `kv` (`store/idbKV.ts`, through idb-keyval). The database name is this app's own, because quest_log_desktop shares the origin. Every key is in `store/kv.ts` `KEYS`:

| Key | Holds |
|---|---|
| `layout.v1` | the layout document (the open profile's) |
| `meta.backup.v1` | the last export, the reminder's snooze, the first run |
| `bookmarks.cache.v1` | the bridge's last bookmarks bar: a cache for an instant first draw, not part of the layout or backups |
| `snapshot.<ms>` | each automatic snapshot: `{ at, reason, summary, layout }` |
| `snapshots.index.v1` | the snapshots' index: when, why, summary and fingerprint of each, newest first |
| `profiles.v1` | the profiles' list: names, and which is open (missing until a second profile is saved) |
| `profile.<id>` | each profile but the open one: a whole layout document |
| `corrupt.<ms>` | data that couldn't be read, kept rather than overwritten |

`store/persist.ts` works through the small `KV` interface (`store/kv.ts`), so its logic runs in plain Vitest tests against a Map (`memoryKV`).

### 8.4 Startup (`store/persist.ts` `boot`)
Startup reads only the layout, the backup bookkeeping and the snapshots' index (not the snapshots), and never loses data:
1. Load the layout.
2. Migrate and validate it. An older layout is migrated and saved back in the new shape.
3. If it can't be read, copy it to `corrupt.*`, start fresh, and show a notice pointing at RESTORE. A layout from a newer version is copied aside too, but left in place (the newer version can still read it), and nothing overwrites it until the layout is changed here.
4. Take a startup snapshot if the layout differs from the newest snapshot.

Profiles: startup reads their list, never their copies (§8.6).

### 8.5 Saving and snapshots (`store/layout.ts`, `lib/snapshots.ts`)
- **Every change is saved at once.** Changes are rare single clicks, so there's nothing to batch. Storage writes run one at a time, in order, through `queue`.
- **A snapshot is taken:**
  - once the layout has been still for 30 s after a change (`CHANGE_DEBOUNCE_MS`);
  - at startup;
  - before an import or a restore replaces the layout, so replacing can itself be undone;
  - when edit mode starts (BEFORE EDIT), so a whole session can be undone;
  - before a profile switch, and of a profile as it's deleted.

  A copy identical to the newest snapshot is never stored, and a pending one is taken on `pagehide`.
- **Keeping:** the newest 20 (`SNAPSHOT_KEEP`), plus the newest of each of the last 7 days (`DAILY_KEEP_DAYS`).
- **The index.** `snapshots.index.v1` lists each snapshot's time, reason, summary (`summarizeLayout`: `2 AREAS · 3 MODULES · WALLPAPER MATRIX-RAIN · REMIND 14D`) and content fingerprint (`layoutFingerprint`: the length and a cyrb53 hash of the canonical JSON, keys sorted).
  - Startup, the RESTORE list, the "has anything changed?" check and pruning all read only the index. A whole snapshot is read only to restore it (optimization pass, 2026-10-22: startup had read every copy in full).
  - A missing or out-of-step index is rebuilt from the stored copies.

### 8.6 Profiles (0.21.0, C9; `lib/profiles.ts`, `store/layout.ts`)
Whole layouts with names, switched by hand (SYSTEM ▸ PROFILES, or OPEN PROFILE … in the finder). Nothing switches by time or place (the user's call, 2026-10-27).
- **The open profile's layout is `layout.v1`.** Everything else (saving, snapshots, RESTORE, edit mode, backups) works on it as it always did. Each other profile is a stored copy, `profile.<id>`, read only to open it or back it up.
- **Until a second profile is saved** there's one, MAIN, and nothing extra is stored. No schema change: the layout document is untouched.
- **SAVE AS NEW** stores the layout as the open profile's copy, then opens a new profile on the same layout.
- **Switching** (`switchProfile`; the page locks edit mode first, `app/profiles.ts`, since its UNDO steps belong to the layout being left):
  1. snapshot the open layout (`before-switch`);
  2. store it as its profile;
  3. save the other as the layout;
  4. only then, point the list at it and delete its copy.

  A page closed midway never loses a layout: the worst left behind is a spare copy, which startup ignores. A copy that can't be read isn't opened, and is kept under `corrupt.*`.
- **Deleting** one (never the open one) snapshots its layout first (`profile-deleted`, unless the newest snapshot already holds it), so RESTORE can bring it back.
- **Limits:** 12 profiles, names up to 24 characters, upper case and unique.
- Fixture tests: `src/__tests__/profiles.test.ts`.

### 8.7 Backup files (`lib/backup.ts`) and the reminder
- **The shape:** `{ format: 'cyberdeck_terminal-backup', version: 1, exportedAt, app, layout, profile?, profiles? }`, the same shape as quest_log_desktop's backups. Saved as a download (`app/backupFile.ts`) wherever the user likes; never sent anywhere.
- **Profiles ride along** (0.21.0): the open profile's name (`profile`) and every other profile (`profiles`). Both are optional, so the file's version stays 1: older files read as before, and older apps ignore the extras.
- **Import** accepts a backup file or a bare layout document (one copied out of a snapshot, say). It parses, migrates and validates, then shows a preview before anything is replaced.
  - IMPORT replaces the open layout (snapshotted first, as always) and adds the file's other profiles beside the user's.
  - A profile already here by content is skipped, a taken name gets a number, and none of the user's is removed.
  - A profile in the file that can't be read is left out; the rest still import.
- **The reminder** (`lib/reminder.ts`): snapshots live in this browser and die with it (cleared site data, a new PC); only an exported file survives that.
  - It offers EXPORT / LATER (a sticky toast) once the last export is older than the interval (`backupReminderDays`: 14 by default; 0, 7, 14, 30 or 90).
  - LATER snoozes it for 3 days.
  - It stays quiet while the layout still has nothing of its own (`hasCustomContent`).

### 8.8 The shared origin
GitHub Pages serves every repo of a user's site from one origin, so quest_log_desktop can see this app's storage area. To keep the two apart:
- the IndexedDB database is `cyberdeck_terminal`;
- every localStorage key starts `cyberdeck_terminal:`;
- every cache starts `cyberdeck_terminal-`;
- the service worker answers only for this app's path.

This app never touches the other's storage. Chrome's zoom is per site, so it's shared too (§7.3).

## 9. The stores
zustand vanilla stores, made once in `start.tsx` (`store/instance.ts` holds the layout and bookmarks stores; tests make their own with `createLayoutStore`). React reads them through `app/hooks.ts`, re-rendering only when the slice it selects changes. Actions are read without subscribing (`layoutStore().getState().setWallpaper(…)`).

| Store | Holds | Saved |
|---|---|---|
| `store/layout.ts` | the layout document, the backup bookkeeping, the snapshot list, the profiles' list; every action that changes them | yes: at once, and snapshotted (§8.5) |
| `store/edit.ts` | edit mode: unlocked or not, the session's UNDO steps and REVERT point | no (changes go through the layout store) |
| `store/bookmarks.ts` | the bridge's live bar, its status (`checking`, `live`, `absent`), its features, and `fresh` (items just arrived, lit for 4 s) | only the cached bar (`bookmarks.cache.v1`) |
| `store/ui.ts` | what the screen is doing now: `immersive`, `panelOpen`, `finderOpen`, `moduleSettings`, the toast, the screen-reader announcement, `crashTest` | no |

## 10. Bookmarks and the bridge
```
bridge/background.js ──(externally_connectable)──▶ src/bridge/client.ts ──▶ store/bookmarks.ts ──▶ app/Bookmarks.tsx
 chrome.bookmarks        hello · bar · port "changed"   useBridge (app/useBridge.ts)   status · bar          the deck / CONNECT prompt
```
### 10.1 The bridge
**CYBERDECK BRIDGE** (`bridge/`, MV3, plain JS; version 1.3.0, `BRIDGE_VERSION` in `src/bridge/client.ts` must match the manifest's) is loaded unpacked from the zip the page offers.

**How a page reaches it:** an extension that lists a page in `externally_connectable` makes `chrome.runtime` appear on that page, with `sendMessage`/`connect` addressed by the extension's id. No `chrome.runtime` means no bridge (or one installed after this page loaded: a reload picks it up). Its callers are the dashboard on GitHub Pages and `127.0.0.1` for development, enforced by Chrome before any of its code runs.

**Its messages:**
- **`hello`:** its version and `features` (`favicons`, `open`, `switch`).
- **`bar`:** the dashboard's tree (`bridge/tree.js` `dashboardBar`, reduced to id, title, url and children), plus `roots` counts for SYSTEM. The tree is:
  - every bookmarks bar Chrome keeps, joined, the account copy (`syncing`) first. Since 2025 Chrome can keep one in the Google Account and one on the device; bridge 1.2.0 reads both (1.1 read only the first it found, so bookmarks saved to the other never appeared);
  - then Other bookmarks and Mobile bookmarks as folders, when they hold anything. Wherever Chrome saves a new bookmark, it shows up.
- **`open`:** `ntp` or `bookmarks` opens Chrome's New Tab page or Bookmark manager in a new tab next to the dashboard. Only these two pages: a webpage can't open `chrome://` pages itself.
- **`ask`, `forget`, `go`:** SWITCH TO OPEN TAB (§10.3).

**Changes and keep-alive:**
- Over a long-lived port it posts `changed`, debounced by 150 ms; the page then asks for the bar again.
- While the dashboard is visible, the page pings over the port every 20 s, which keeps the extension's worker awake (Chrome stops idle ones after 30 s, and a stopped worker can't pass changes on). When hidden, the pings stop and the worker sleeps.
- If the port closes, the page reconnects with back-off from 1 to 10 s (paused while hidden), and asks again. It also asks again whenever its window regains focus, and when the page is shown again.

**Site icons** load as `<img>` from `chrome-extension://<id>/_favicon/?pageUrl=…&size=16|32` (Chrome's icon cache). That needs the bridge's `favicon` permission, plus `web_accessible_resources` for the dashboard's origin.

**The id** is `mbjnlinjocmaalhodjhpkadlpifnelic`, fixed by the manifest's public `key` (an unpacked extension's id is otherwise a hash of its folder's path). The private key was never kept, since an unpacked extension doesn't need it. A unit test checks the manifest's key and `BRIDGE_ID` stay in step.

**Read-only, always:** the bridge never writes bookmarks, and only id, title, url and children leave it.

**Updating:** bump `version` in the manifest and `BRIDGE_VERSION` together. SYSTEM ▸ BOOKMARKS then offers the update to an older bridge (`lib/versions.ts`), and NAV's header shows an UPDATE BRIDGE chip where a feature needs it.

### 10.2 New Tab
`bridge/newtab.js` is Chrome's New Tab page while the bridge is installed:
- If a dashboard tab is open in the same window, the new tab switches to it and closes itself (the user, 2026-10-22: one dashboard, not a pile of them).
- Otherwise it becomes the dashboard (`location.replace`, so Back doesn't return to the blank forwarding page).

Finding dashboard tabs uses `host_permissions` for the dashboard's address, not the `tabs` permission. Chrome ignores a host permission's path, so this is all of `thedungeons2077.github.io` (checked in a probe, 2026-10-24). Chrome's own New Tab page stays reachable from NAV's CHROME NEW TAB ↗.

### 10.3 SWITCH TO OPEN TAB (bridge 1.3.0; `app/switchTab.ts`, `lib/switching.ts`)
- **What's kept:** `prefs.switchTabs`, a sorted list of places. A place is a Chrome match pattern: a link's origin and its path up to the last `/`, then `*` (`https://thedungeons2077.github.io/quest_log_desktop/*`). The user turns a link's place on from its ⋯ in edit mode. Then a plain left click on any link under it sends `go` instead of opening a tab (a tile, a folder row, QUICK LAUNCH, the finder, keys 1–9). A middle click, or one with a modifier key, is left to the browser.
- **`go {url, pattern}`:** `chrome.tabs.query({ url: pattern })` (the dashboard's window first, then the tab used last), then `tabs.update` + `windows.update`. With no such tab, `tabs.create` next to the dashboard.
  - A site the bridge can't see returns tabs without addresses, so it never matches: a new tab.
  - No answer: the page opens the link itself, still within the click's activation, so no popup blocker gets in the way.
- **`ask {origin: https://host/*}`:** an allowed site answers `granted` at once (the dashboard's own site, so quest_log_desktop's links, always). Otherwise:
  - the bridge opens `grant.html` in a small window and answers `asking`. Only an extension's own page can call `chrome.permissions.request`, and only on a click, which is why the window exists;
  - its ALLOW / CANCEL goes to `background.js`, which posts `{type: 'granted', origin, granted}` on every dashboard port;
  - the page adds the place only then, because the user can take longer than a message waits (3 s).
- **`forget {origin}`** gives the site back once no place needs it. The dashboard's own site can't be given back (Chrome keeps manifest permissions).
- **The manifest:** `optional_host_permissions: https://*/*, http://*/*`. Nothing beyond the dashboard's site is granted until the user says yes, per site.

### 10.4 Which bar shows (`app/useShownBar.ts`)
1. The bridge's live bar.
2. While the bridge is first being asked, the cached bar.
3. With no bridge, the imported copy (`layout.bookmarks.imported`).
4. With none of these, the CONNECT prompt.

NAV and the finder use the same choice.

### 10.5 Folders, links and the import
- **Folders:** which are open is stored in `layout.bookmarks.open`, keyed by folder path (`lib/bookmarks.ts` `folderKey`), so the same folder matches across the live bar and an imported copy. A folder's contents are first rendered when it first opens. An open folder drops down in its own grid cell, one link per row.
- **Links:** only http(s) links are clickable, because Chrome blocks webpages from opening `chrome://`, `file://` and `javascript:`. They open in a new tab (`target=_blank`, `rel=noopener noreferrer`), so the dashboard never navigates away and its animation is never caught frozen mid-handoff (the user's choice, 2026-10-22). Links a webpage can't open are listed, dimmed and inert.
- **Untrusted trees:** a tree from the bridge, the cache or a file is checked (`sanitizeTree`) before use.
- **`bookmarks.html` import:** `lib/bookmarks.ts` `parseBookmarksHtml` reads Chrome's Netscape-format export with a small tokenizer (no DOM, so tests run in Node), and takes the folder marked `PERSONAL_TOOLBAR_FOLDER`. A file that isn't an export is refused, with how to get one.

## 11. The page
### 11.1 The layers
```
.wallpaper         fixed, z 0 (index.html): haze · canvas (screen-sized, drawn by the worker) · floor
<main.ui-layer>    fixed, z 1: the HUD, NAV, the modules, the toast; fades out and goes inert in immersive mode
<SystemPanel>      modal dialog (S)
<ModuleSettings>   modal dialog (a module's ⋯ ▸ SETTINGS)
<Finder>           modal dialog (/)
<CrashPanel>       in place of the page, if it fails to draw (§14)
```
- **Immersive mode (F):** `toggleFullscreen()` calls the Fullscreen API. `useFullscreenSync()` copies `document.fullscreenElement` into `ui.immersive` on every `fullscreenchange`, so Esc, F11 and the browser's own controls stay in sync. While immersive, `useIdleCursor` hides a still pointer.
- **The HUD** (`app/Hud.tsx`): the brand panel (a clock and the date, top left, where it was placed; optional) and the key hints (bottom right). Each hint is a button that does what its key does, so everything works with the mouse too.
- **NAV** (`app/Bookmarks.tsx`, `deck/`): the header (title and state on the left; CHROME NEW TAB ↗, BOOKMARK MANAGER ↗ and EDIT on the right), NAV's tiles and folder cards, then the areas. A deck context (`deck/context.ts`) tells every piece whether it's editing, what's placed elsewhere, and how to start a drag or open a menu. With bridge 1.1+ the header gains the bridge buttons and tiles their site icons.
- **Narrow windows** (`useNarrow`): places are ignored, and the modules stack inside NAV's scrolling area.

### 11.2 Keys and the finder
- **The shortcuts** (`app/useShortcuts.ts`, one window listener, as quest_log_desktop's): F immersive, S SYSTEM, / the finder, + − 0 the wallpaper's zoom, [ ] UI SCALE, 1–9 QUICK LAUNCH.
  - Keys typed into a field never trigger anything, and keys with Ctrl, Alt or Meta are left to the browser (Ctrl+F still finds in the page).
  - While a dialog is open it keeps the keyboard (`blocked`), and its own Esc closes it.
- **The finder** (`/`, `app/Finder.tsx`): a combobox over a listbox (`aria-activedescendant`), the command-palette pattern. The best match is chosen already, so `/` + a few letters + Enter opens a site.
  - **`lib/find.ts` `findEntries`** lists every openable link in dashboard order, skipping hidden items and anything in a hidden folder.
  - **`search` scores each typed word:** title start 100, a word in the title starts with it 80, inside the title 50, host start 40, inside the host 25, a folder's name 15, the title's letters in order 8. Ties go to the shorter title, then dashboard order.
  - **Commands** follow the links: EDIT / LOCK THE LAYOUT, OPEN SYSTEM, FULLSCREEN, EXPORT A BACKUP, OPEN PROFILE …, the wallpaper's zoom (in, out, 100%), UI SCALE (bigger, smaller, 100%), FOCUS SEARCH, START / STOP TIMER, ADD … MODULE, SHOW THE BRAND PANEL, and with the bridge CHROME NEW TAB and BOOKMARK MANAGER.
  - **Last of all,** with anything typed: SEARCH … FOR it (the first SEARCH module's engine, or DuckDuckGo).
  - Enter opens the chosen link in a new tab, or runs the command.
- **Arrow keys** (`deck/useArrowNav.ts`), from a tile, folder heading, link or area heading:
  - ← / → go to the previous / next item in page order;
  - ↑ / ↓ go to the nearest item in the row above or below;
  - Home / End go to the first / last.

  Items inside folded areas or folders are skipped. QUICK LAUNCH's tiles get the same, with their own selector.

### 11.3 Dialogs, toasts and menus
Trimmed from quest_log_desktop's:
- **`Dialog`:** focus moves in as it opens (again if it's reopened mid-fade), Tab cycles inside, Esc / ✕ / the backdrop close it, and it gives the keyboard back at once while fading out.
- **`Toast`:** stays `TOAST_MS` (5 s) with its clock as a shrinking hairline. The clock stops while the pointer or keyboard is on it (WCAG 2.2.1). A sticky toast (the reminder, a failed save) waits for an answer.
- **`PopupMenu` and `deck/ArrangeMenu`** (the ⋯ menus): focus moves in, ↑ / ↓ move, Esc / Tab / a click elsewhere close it, and focus returns to the button.
- **`usePresence`** keeps something on screen a moment after it's gone, so it can animate out.

### 11.4 SYSTEM (`app/SystemPanel.tsx`)
Its sections, in order, each folding (closed every time SYSTEM opens; a closed one says what's set in it):
- **APPEARANCE:** the dashboard's colours and sizes, the wallpaper, its colours, the glow, the zoom, SHARPNESS (TRY AGAIN).
- **PROFILES.**
- **BOOKMARKS:** the source, the bridge download and update, the import.
- **BACKUP:** export, import with a preview, the reminder's interval.
- **RESTORE:** the snapshots, newest first.
- **KEYS.**

COPY DIAGNOSTICS sits at the foot. Everything that replaces the layout asks first and says what will happen, and the layout is snapshotted before it's replaced (`store/layout.ts` `replaceLayout`).

## 12. Arranging (edit mode)
- **`lib/arrange.ts`** (pure) holds the `Arrangement` (`order` for NAV, `areas`, `hidden`) and the `Panels` places. Both are stored in the layout document (since schema 3). Chrome's bookmarks are never changed: this is a layer on top.
- **Item keys** stay the same across reloads, and across the live bar and an imported copy:
  - a link is `l:<url>` (`#2`… for repeats);
  - a folder is `f:<folder path>`.

  A renamed folder or a changed URL is a new item, which shows up where Chrome has it.
- **`arrange(bar, arrangement)`** works out NAV, the areas, the hidden items, and what folders leave out. Unplaced items follow Chrome's order (`mergeOrder`: after the item Chrome puts before them).
- **An edit is an `EditShape`:** the arrangement, the panels and the modules (`store/edit.ts`). `withPlace(shape, id, place)` places any panel, NAV, the brand panel or a module, so the grips and drags share one path.
- **`store/edit.ts`:**
  - `begin` takes a BEFORE EDIT snapshot;
  - `apply` pushes an undo step and saves at once;
  - `undoLast` / `revert` step back;
  - `done` locks and snapshots.
- **`app/arrangeDrag.ts`:** pointer events (a mouse, a pen and a touch screen alike).
  - A press becomes a drag past `DRAG_THRESHOLD` (5 px), so a plain click still clicks.
  - Targets are read from `data-drop-section`, `data-item-key`, `data-kind`, `data-section` and `data-area-id`. NAV scrolls when the pointer nears its edge, and Esc cancels.
  - Panels move live through CSS variables and are saved on drop.
- **Keyboard alternatives:** the ⋯ menus (`deck/ArrangeMenu.tsx`: MOVE EARLIER / LATER, MOVE TO NAV / an area / a new area, BACK TO CHROME'S PLACE, HIDE, PIN TO QUICK LAUNCH, SWITCH TO ITS OPEN TAB), ↑ / ↓ on area grips, and the arrow keys on panel grips (Shift for bigger steps).
- **Glides** (`deck/useFlip.ts`, the FLIP technique). The layout, bookmarks and edit stores' listeners note every item's position before React redraws (store listeners run first, so this is the old layout). After the commit, moved items are animated from their old positions (Web Animations, `id: 'flip'`, transforms only, 220 ms). Items that weren't there fade in.
  - Positions are relative to NAV's scroller, so moving or scrolling NAV doesn't count as items moving.
  - A note older than 250 ms is discarded. Reduce Motion: nothing animates.
- **Feedback:**
  - `store/bookmarks.ts` `fresh` lights arrivals for 4 s;
  - `uiStore.announce` feeds a polite live region (`App.tsx` `Announcer`);
  - drags dim their source (`data-drag-source`) and show `.drop-line` or `.drop-zone`.
- **Snapping** (0.14.0): a dropped panel settles against the window's edges (8 px in), or against another panel's edge within 8 px, lined up or beside it with an 8 px gap (`lib/arrange.ts` `snapBox`, used on drop; arrow-key nudges don't snap).
- **Panels** are placed with `left`/`top` from shares of the window, clamped on screen. There are no transforms, so text stays on whole pixels, crisp. Narrow windows ignore the places.
- **Limits:** 50 areas, area titles up to 40 characters, NAV 360–2400 px wide.

## 13. Modules
- **What they are:** panels added, placed and sized by hand: SEARCH, QUICK LAUNCH, TIME, CLOCK and COUNTDOWN, up to 12 (`MAX_MODULES`). The brand panel is grouped with them as an optional panel: `panels.brandOff` (only written when true, no schema bump) hides it, and + MODULE offers it back.
- **`lib/modules.ts`** (pure) holds the list's rules:
  - `newModule` at a free spot down the right-hand side;
  - `addModule`, `placeModule`, `removeModule`, `setSettings`;
  - `normalizeModules`, which drops unknown kinds, bad ids and malformed entries one by one, never the whole layout.

  Ids are `m…`, so they can't be taken for `nav` or `brand`. Widths run 240–1200 px.
- **Each kind's rules are their own pure file:**
  - `lib/search.ts`: the engines, a custom address with `%s`, and `searchUrl` (the words URL-encoded). The page only opens the address: no request of its own;
  - `lib/launch.ts`: tiles (`cleanUrl` takes only http(s) addresses), add, move, remove, and `launchTargets` for keys 1–9 across modules;
  - `lib/time.ts`: countdowns counted in calendar days (UTC midnights, so clock changes don't matter), `clockText`, and `toolsOpen`. The timer and stopwatch fold is saved straight to the layout like a folder's, not as an undo step;
  - `lib/clock.ts`: what CLOCK shows;
  - `lib/countdown.ts`: COUNTDOWN's target and what's left.
- **Drawn at MODULE SIZE** (`prefs.moduleScale`, 70% until chosen: `MODULE_SCALE`). A module's stored width is in its own sizes: `app/arrangeDrag.ts` `scaleOf` (UI SCALE's zoom × the module's size) divides a drawn width by it when saving (drag, resize, arrow keys). They're kept in `layout.modules`, so saving, snapshots, backups and restore cover them.
- **A module's own sizes** (0.19.0, schema 6). `module.sizes` may hold its own `scale` (SIZE: how big it's drawn against the UI, the same measure as MODULE SIZE, in `MODULE_OWN_STEPS`, 40–200%) and `textScale`. Each replaces the dashboard's for that module only (OWN); a missing one follows the dashboard (DASHBOARD). A `scale` equal to the dashboard's value is still OWN.
  - **Applying them:** `app/modules/Modules.tsx` sets them on the module's frame as CSS variables: `--m` = `lib/modules.ts` `moduleScaleOf` (its own SIZE, else MODULE SIZE) and `--text-scale`. app.css then sizes it as usual, on top of `#root`'s UI SCALE zoom.
  - **History:** 0.18.0 (schema 5) had three own sizes, and two of them (`uiScale`, `moduleScale`) did the same thing. The 5 → 6 step folded them into one (§8.2).
- **SHOW TITLE** (0.27.0): `module.title`, stored only when it differs from the kind's usual (no schema bump). While editing, the header always shows, since its grip and ⋯ live there.
- **The page side:**
  - `app/modules/catalog.ts` names each kind and holds its file (`SearchModule`, `LaunchModule`, `TimeModule`, `ClockModule`, `CountdownModule`, each exporting `Panel` and `Settings`). They load with the app (§3).
  - `app/modules/Modules.tsx` draws the frames: grip, ⋯ (`PopupMenu`), resize edge, the kind's panel (inert while editing), and the SETTINGS dialog (`ui.moduleSettings`). Every change goes through `editStore.apply`, so UNDO and REVERT cover it.
  - `app/modules/actions.ts` is what the rest of the page uses: the finder's web search, keys 1–9 (`useShortcuts`), PIN TO QUICK LAUNCH from a bookmark's ⋯, and the finder's module commands.
- **Nothing loops** (`app/modules/useNow.ts`, shared by TIME, CLOCK and COUNTDOWN).
  - **When they redraw:** the clocks once a second (CLOCK once a minute with seconds hidden), countdowns at midnight, the timer and stopwatch only while they run with their fold open.
  - **When they stop:** all of it pauses while the tab is hidden or the page is immersive, and reads the clock afresh when it's seen again, so nothing drifts.
  - **Ends that matter:** a running timer, and a COUNTDOWN still to come, each have one timeout to their end, so the notice arrives even from a background tab. The COUNTDOWN's timeout is re-armed a day at a time, since a browser's timeout can't wait past about 24 days; one reached over 5 s before the page opened just shows zeros. The running timer and stopwatch aren't saved: a reload starts them over.
- **COUNTDOWN** (0.25.0, schema 7) counts down to a date and time with CLOCK's digits. Its settings are `label`, `date` (`YYYY-MM-DD`, '' for none yet) and `time` (`HH:MM`): a calendar date and wall-clock time in the browser's own zone (`countdownTarget`), so a clock change doesn't move it. Each SETTINGS change is one UNDO step, merged into the settings as they are when it's saved.
- **CLOCK** (0.18.0): its digits are sized from the module's width (a container query, capped so they never overflow), so its resize edge resizes the clock.
- **A new kind:** a case in `lib/modules.ts`, its rules in a pure `lib/<kind>.ts`, an entry in `app/modules/catalog.ts`, and a file exporting `Panel` and `Settings`. Nothing in it may loop or tick while it can't be seen.

## 14. Recovery
Nothing that fails to draw takes the layout with it (1.0, `app/Recovery.tsx`).
- **CrashGuard** is a class component, since React catches errors only there. Once its part throws while drawing, it shows a fallback in that part's place until its `resetKey` changes. React logs the error itself; the guard keeps the component trace for the details.
- **The whole page:** `start.tsx` wraps `App` in one. Its fallback, **CrashPanel**, sits over the wallpaper (which keeps running in its worker) and offers:
  - RELOAD;
  - EXPORT BACKUP;
  - RESTORE, for the five newest snapshots.

  It reads the stores directly, not through the app's hooks (which may be what broke). RESTORE snapshots the layout as it is first (the layout store does that), then reloads into the restored one.
- **Each module** has its own guard round its panel, and another round its SETTINGS. A failure shows a card in its frame with two ways out: RESET SETTINGS (`lib/modules.ts` `resetSettings`, which keeps its place, sizes and title) and REMOVE. The rest of the dashboard is untouched. The module's own object is the reset key, so a reset draws it again.
- **Damaged data** is handled at startup (§8.4), and a failed save shows a sticky toast.
- **Lost graphics contexts** come back (§5.6).
- **Checked on the real page:** `window.__cyberdeck.testCrash(target)` ('app' or a module's id; null: none) makes `CrashTest` throw in that part, for e2e/walk.mjs only. The unit tests (`recovery.test.tsx`, jsdom) cover the guard and the panel's failure path.

## 15. Testing and verification
| Command | What it checks |
|---|---|
| `npm run check` | `tsc -b` (strict), ESLint (with the React Compiler's rules), Vitest: 21 files, 266 tests. Must pass before every commit |
| `npm run build && npm run e2e` | the browser walk: 60 paths, with screenshots in `e2e/screenshots/` |
| `CYBERDECK_BASE=/cyberdeck_terminal/ npm run build && CYBERDECK_BASE=… npm run e2e` | the same walk on the Pages build, at its sub-path |
| `npm run e2e:bridge` | the Pages build with the real bridge loaded |
| `npm run build && npm run e2e:motion` | the rain's smoothness: frame gaps, script time, load stalls, the frame after a resize |
| `npm run build && npm run e2e:perf` | opening (first and repeat visits), the uncapped rain, a big layout, dragging on a big bar |

- **Unit tests** (`src/__tests__/`, Node; jsdom only where a file opts in) cover the pure layers and the stores:
  - migrations, with a real document of every older version (1 to 6, 0.24.0's TIMER among them), a newer one, and an invalid one;
  - backups, snapshots, profiles, and startup against in-memory storage (damaged data kept aside, replacing always undoable);
  - arranging, modules and each kind, the finder;
  - the palettes' contrast;
  - the wallpapers' pure parts (seeded layouts, loops without seams, colours from every palette);
  - the bridge's tree code and its id, and the bridge zip;
  - the sharpness guard and the NEURAL NET tuner;
  - COPY DIAGNOSTICS (never an address);
  - the recovery boundary.
- **The browser walk** (`e2e/walk.mjs`) runs headless Chromium at 1920×1080 against the built `dist/`.
  - **Its server:** the `serve` binary itself (not `npx serve`, whose child process would outlive it), on 127.0.0.1:8163 only, always stopped.
  - **Its paths** (`path(name, fn)`) run in order on one page, each building on the last. A path fails on any page error, with a `FAILED-*` screenshot (`WALK_DEBUG=1` prints Playwright's whole call log).
  - **What they cover:** the CONNECT prompt and the import; the finder; arrow keys; every edit-mode action, with drags; the modules (each kind, their settings, sizes, keys, the timer); recovery (a module's card and the page's panel); immersive mode; SYSTEM (export, import, restore, profiles, glow, palettes, every wallpaper in its worker, zoom, UI SCALE); a narrow window; COPY DIAGNOSTICS; a simulated 175% Chrome zoom and a 2.5× screen (the guard stepping back); the OS's Reduce Motion ignored; the page fallback; the six WebGL wallpapers losing and regaining their context; the rain at 4× slower CPU.
  - **axe-core** (WCAG 2.2 A/AA and best practice) runs in edit mode, with modules, and with and without SYSTEM.
- **The bridge test** (`e2e/bridge.mjs`) runs Playwright's full Chromium (the headless shell can't load extensions), with `bridge/` loaded unpacked in a throwaway profile. The dashboard is served at its real production address from `dist/` by Playwright's request routing: nothing goes to the network, and `externally_connectable` is tested exactly as shipped. Page service workers are blocked, since they'd bypass the routing.
- **The canvas is read through the probe** (§5.5), since the page can't read a canvas it handed to a worker.
- **Scratch tools, not kept in the repo** (made per change in a scratch folder):
  - Playwright scripts for screenshots;
  - frame timing on the built page;
  - seeded still frames (`Math.random` seeded, on the page fallback, Reduce Motion: since 1.0.1 set the page's `data-reduce-motion` to `on` in an init script, as the OS setting is ignored), compared pixel by pixel in Python (`-I`);
  - traces of a startup.

  A/B comparisons run a copy of the old build from a scratch `git worktree` (`MOTION_DIST`, `PERF_DIST`).
- **What headless can't tell:** the test browser has no GPU. Frame times of the WebGL wallpapers mean nothing there, and some canvas operations are far costlier in software than on a GPU. Use it for correctness and relative CPU cost; the user's PC is the judge of smoothness.

## 16. Build and deploy
- **The build** (`npm run build` = `tsc -b && vite build`):
  - Vite 8, React 19, TypeScript 6, target ES2022;
  - `CYBERDECK_BASE` sets the site's path: `/` locally, `/cyberdeck_terminal/` for GitHub Pages;
  - its plugins: `preloadApp` (the app's chunk as a modulepreload), `bridgeZip` (every file in `bridge/` inside a `cyberdeck-bridge/` folder, with fixed timestamps, so the same files always give the same zip: `scripts/zip.ts`, with no dependency), and `serviceWorker` (§4);
  - the version (package.json) and build number (the newest CHANGELOG entry) are shown in SYSTEM and written into backups.
- **The dev server:** `npm run dev`, on 127.0.0.1 only (stop it when done).
- **`npm run deploy`** (`scripts/deploy.sh`, adapted from quest_log_desktop's) is public: it runs only after the user has said yes to this deploy. Any failure stops it before anything is published:
  1. types, lint and unit tests (`npm run check`);
  2. a build at the site root and the full browser walk;
  3. a build for `/cyberdeck_terminal/`, the walk at that path, and the real bridge at its production address (`e2e/bridge.mjs`);
  4. publishing it as the `gh-pages` branch (replacing the old one);
  5. turning on GitHub Pages for that branch the first time.
- **After a deploy,** confirm the live site serves the new build (poll its scripts for the version).
- **Releasing:** bump `version` in package.json, add a `## x.y.z (build N)` section to CHANGELOG.md (N one more than before), commit, then deploy with the user's OK. 1.0.0 (build 52) was also tagged `v1.0.0` with a GitHub release.
- **Licence:** MIT (`LICENSE`); the font, JetBrains Mono, is under the SIL Open Font License (`src/assets/fonts/OFL.txt`). `npm audit` was clean at 1.0 (an `overrides` entry pins `compression`, used by `serve`).

## 17. Measurements
Timings on this machine vary run to run: compare several runs, never one. `npm run e2e:perf` simulates a 120 ms network delay; measures are taken in the page (Playwright's own timing is skewed while the page is busy, 0.3.1).

**The 1.0 figures (2026-10-30)**, the baseline from here on:
- **Opening** (`e2e:perf` A): repeat visits 79–86 ms to the dashboard at normal CPU (the rain 169–191 ms) and 279–301 ms at 4× slower; a first visit 431 ms and 601 ms.
- **The one long task at 4× slower** (94–99 ms) is evaluating the app's chunk once on arrival (`v8.evaluateModule`). A trace of 0.19.0 found it there too (about 80–95 ms); at normal speed it's about a quarter of that, under a long task's 50 ms.
- **Each wallpaper's drawing script in its worker** (ms a second, 1920×1080 at 1×, its own palette):

  | MATRIX RAIN | NEURAL NET | VELOCITY | DATA FLOW | MEGACITY | HORIZON | SUNSET | PRISM | QUANTUM KERNEL | SUMMIT |
  |---|---|---|---|---|---|---|---|---|---|
  | 29 | 4 | 16 | 20 | 5 | 2 | 3 | 1 | 2 (about 540 before its sheets went to the graphics card) | 8 |

  Frame gaps for the WebGL ones mean nothing here (no graphics card).
- **The chunks:** see §3 (the start: 1.0 + 147.8 + 13.6 kB; the app 357.4 kB, 109.6 kB gzipped).

**The C7 baseline (0.19.0, 2026-10-28)**, which earlier speed work compared against. Nothing was cut in C7: each figure was already small, so the pass changed no behaviour.
- **Opening:** repeat visits 88–158 ms to the dashboard at normal CPU and 374–451 ms at 4× slower; a first visit 456 ms and 714 ms. Most of it is the simulated network delay; the app's own script was about 16 ms of start-up at 4× slower.
- **Idle** (the dashboard showing, the rain in its worker): about 0.5–1.9 ms of page script a second, 10–14 ms of main-thread work in all. The brand panel's scanline drift, refresh band and LIVE dot cost 2–4 ms of that and 4 style recalculations a second. They're kept, being the panel's look, and stop with Reduce Motion and in hidden tabs.
- **The rain** (`e2e:motion`): every frame on time at 60 Hz, at normal and 4× slower CPU; 17.5–25 ms a second of drawing in its worker, 0.5–1.7 ms of page script.
- **Drawing script per wallpaper** (ms a second): MATRIX RAIN 22, NEURAL NET 36 (every link its own stroke, twice; 4 since 0.22.0 drew it with WebGL), VELOCITY 16, DATA FLOW 22, MEGACITY 6, HORIZON 2, SUNSET 3.
- **Dragging on the big bar** (`e2e:perf` D at 4× slower, `PERF_REPEAT=4`): median frame 16.7 ms, 10–14 of about 103 frames over 25 ms. The first drag of a page is slower (36 of 111). 0.16.0 measured the same or worse (17–36), so nothing has regressed; 0.3.0's "7 of 108" was a single good run.
- **The chunks then:** the start (`main` + `host`) 103 KB, of which the inlined worker was 92 KB; the app 339 KB (104 KB gzipped: react-dom 202 KB of it, React 8 KB, the app's own code about 120 KB with no file over 14 KB); the page-fallback engines 87 KB.

**Earlier figures** (0.5.0, from `e2e:perf`, repeat visits through the service worker): the rain about 0.15 s and the dashboard about 0.07 s at normal CPU; 0.4 s and 0.27 s at 4× slower. A first visit: the rain about 0.37 s, the dashboard about 0.43 s (the test server's HTTP/1.1 limit of 6 connections delays the app's chunk; GitHub Pages serves HTTP/2).

**Comparing builds:** `MOTION_DIST` and `PERF_DIST` measure another build's `dist/` (older builds are measured by the page's frames). `PERF_GLOW` sets the glow before B, `PERF_ONLY` runs some scenarios only (C and D share their setup), and `PERF_REPEAT` repeats D.

## 18. Known limits and next steps
- **No GPU in the test browser.** WebGL frame times can't be measured here; the user's PC is the judge, and COPY DIAGNOSTICS brings its figures back.
- **The app chunk's one long task** at 4× slower CPU (about 95 ms, §17) is React and the dashboard evaluating once. Splitting it further cost more in requests than it saved (§3).
- **Chrome's zoom is inferred,** not read: no page can. `browserZoom` snaps to Chrome's levels, and the walk checks a simulated 175%.
- **HORIZON's near outlines stay slightly stepped:** multisampling would smooth them but made it laggy (0.17.5).
- **The bridge is unpacked** (Developer mode, no Web Store), so its updates are by hand: download, unzip over the old folder, reload it in `chrome://extensions`. Its New Tab host permission covers the whole `thedungeons2077.github.io` site, because Chrome ignores the path.
- **Storage is per browser.** Snapshots die with the browser's site data; only exported backups survive that, hence the reminder.
- **A running timer or stopwatch** isn't kept through a reload.
- **Next:** SUMMIT's port to fluid_motion (with ALPENGLOW, the phone's ninth palette), after the user has lived with it here.
