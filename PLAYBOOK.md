# Playbook

What cyberdeck_terminal learned, written to be reused: in the next start page or dashboard, the next canvas- or WebGL-heavy web app, the next static site that must never lose its user's data. Each lesson gives the rule, why (with the measurement or the release it came from), and where it lives in this code, so it can be lifted rather than rediscovered.

How this project is laid out is in [ARCHITECTURE.md](ARCHITECTURE.md); what it looks like is in [DESIGN.md](DESIGN.md); how the work is done with the user is in [WORKING.md](WORKING.md). Its sister project, fluid_motion (`~/projects/fluid_motion`), has its own [PLAYBOOK.md](https://github.com/THEDUNGEONS2077/fluid_motion/blob/main/PLAYBOOK.md) for the phone: battery-first rendering, OpenGL ES, porting a web wallpaper to Android.

1. [A start page with no install](#1-a-start-page-with-no-install)
2. [An extension as a bridge](#2-an-extension-as-a-bridge)
3. [Opening fast](#3-opening-fast)
4. [Animation off the main thread](#4-animation-off-the-main-thread)
5. [Canvas 2D: what costs and what doesn't](#5-canvas-2d-what-costs-and-what-doesnt)
6. [WebGL 2 in a browser](#6-webgl-2-in-a-browser)
7. [Sharp without lag](#7-sharp-without-lag)
8. [Data that can't be lost](#8-data-that-cant-be-lost)
9. [Sharing an origin](#9-sharing-an-origin)
10. [Theming with a handful of colours](#10-theming-with-a-handful-of-colours)
11. [React patterns that held up](#11-react-patterns-that-held-up)
12. [Interaction patterns](#12-interaction-patterns)
13. [Testing a canvas-heavy web app](#13-testing-a-canvas-heavy-web-app)
14. [Measuring speed honestly](#14-measuring-speed-honestly)
15. [Shipping a static site](#15-shipping-a-static-site)
16. [Working with the user](#16-working-with-the-user)
17. [Numbers worth remembering](#17-numbers-worth-remembering)
18. [Starting a new project from this one](#18-starting-a-new-project-from-this-one)

---

## 1. A start page with no install
**1.1 A webpage can be a homepage, a startup page and (almost) a New Tab page.** Chrome takes any address for its homepage and startup pages, but won't take one for New Tab. A static page on GitHub Pages covers the first two with nothing to install; an optional extension covers the third (§2). *Where:* README.md "Make it your start page".

**1.2 Everything works without the optional part.** With no extension, bookmarks come from an imported `bookmarks.html` copy (kept in the layout and its backups), and a CONNECT prompt offers both ways in. Design the fallback first, then add the live path. *Where:* `app/useShownBar.ts`, `lib/bookmarks.ts` `parseBookmarksHtml`.

**1.3 Links open in a new tab, so the page never leaves.** A start page that navigates away loses its state and is caught frozen mid-animation by the handoff. `target=_blank rel="noopener noreferrer"` (the user's choice, 2026-10-22). Only http(s) links can be opened by a page at all: list the others (`chrome://`, bookmarklets) dimmed and inert.

**1.4 No network code makes privacy simple.** The page sends nothing: a search is only an address opened in a new tab (`lib/search.ts`), diagnostics go to the clipboard (`lib/diagnostics.ts`), backups to a file the user saves. There's nothing to audit but the files.

## 2. An extension as a bridge
**2.1 `externally_connectable` lets a page talk to an extension.** List the page's origin in the extension's manifest, and `chrome.runtime` appears on that page with `sendMessage`/`connect` addressed by the extension's id. No `chrome.runtime` means no bridge. Chrome enforces the caller list before any extension code runs. *Where:* `bridge/manifest.json`, `src/bridge/client.ts`, `bridge/background.js`.

**2.2 Fix an unpacked extension's id with a public key.** An unpacked extension's id is a hash of its folder's path, so it changes per install. Put a public `key` in the manifest and the id is fixed; the private key isn't needed for an unpacked extension, and wasn't kept. A unit test keeps the page's `BRIDGE_ID` and the manifest's key in step. *Where:* `src/__tests__/bookmarks.test.ts`.

**2.3 Keep the bridge small, read-only and versioned.** It answers a few messages (`hello` with its version and `features`, `bar`, `open`, `ask`, `forget`, `go`), never writes bookmarks, and sends only id, title, url and children. The page gates each feature on `features`, and offers an update when the bridge is older (`lib/versions.ts`). Bump the manifest's version and the page's `BRIDGE_VERSION` together.

**2.4 Keep an MV3 worker awake only while it's needed.** Chrome stops an idle extension worker after 30 s, and a stopped worker can't pass changes on. While the page is visible, ping over a long-lived port every 20 s; when hidden, stop, and ask again on return. If the port closes, reconnect with back-off (1–10 s, paused while hidden). Debounce the bridge's `changed` (150 ms). *Where:* `src/bridge/client.ts`, `app/useBridge.ts`.

**2.5 Ask for permissions per site, from the extension's own page, on a click.** `chrome.permissions.request` works only from an extension page and only in a user gesture, so the bridge opens a small window (`grant.html`) with ALLOW / CANCEL. The answer arrives later over the port: a person can take longer than a message waits (3 s). Grant nothing up front beyond what's essential (`optional_host_permissions`), and give a site back when nothing needs it. *Where:* `bridge/grant.js`, `app/switchTab.ts`, `lib/switching.ts`.

**2.6 Chrome ignores a host permission's path.** A permission for `https://host/app/*` is granted as all of `https://host/*` (checked in a probe, 2026-10-24). Plan for the whole site, and say so in the docs.

**2.7 Seeing another tab's address needs only a host permission, not `tabs`.** With the host permission, `chrome.tabs.query({ url: pattern })` returns matching tabs with their addresses, and tabs of other sites without them. That's enough to find the dashboard's own tab (New Tab switches to it) or a site's open tab (SWITCH TO OPEN TAB). *Where:* `bridge/newtab.js`, `bridge/background.js`.

**2.8 Site icons without a network request:** `chrome-extension://<id>/_favicon/?pageUrl=…&size=16|32` serves Chrome's own icon cache, with the `favicon` permission and `web_accessible_resources` for the page's origin.

**2.9 Test the extension as shipped.** Load it unpacked in Playwright's full Chromium (the headless shell can't load extensions), serve the build at its real production address through request routing, and block page service workers (they'd bypass the routing). `externally_connectable` is then tested exactly as it will run. *Where:* `e2e/bridge.mjs`.

## 3. Opening fast
**3.1 Split the start into a tiny first stage and the app.** The first chunk holds only the styles, the colours, the sizes and the animated background; the app (storage, React, the UI) is `import()`ed at once, in parallel. The background starts drawing while the app is still arriving. *Where:* `src/main.tsx`, `src/start.tsx`.

**3.2 Fetch everything the start needs at once.** Preload the fonts in `index.html`, and list the app's chunk as a `modulepreload` (a small Vite plugin), so it's fetched with the first files instead of after the first script has run: a round trip sooner on a first visit (optimization pass 2, 2026-10-22). Inline the background's worker into its chunk (`?worker&inline`): one fewer request. *Where:* vite.config.ts `preloadApp`, `wallpaper/host.ts`.

**3.3 Don't lazy-load small code that shares a lot.** Split off lazily, the module kinds saved about 5 KB gzipped, but the bundler cut everything they shared into seven small chunks, and a first visit came about 130 ms later (e2e:perf with a 120 ms delay, 2026-10-24). Measure a split before keeping it. *Where:* `app/modules/catalog.ts`.

**3.4 Remember the first frame's choices in localStorage.** The real settings live in IndexedDB and arrive later. A few small hints (the palette, the sizes, the wallpaper, its colours, glow and zoom) let the first frame be right, so a non-default theme never flashes the default first. A lost hint costs only a flash. *Where:* `src/palette.ts`, `src/scale.ts`, `wallpaper/host.ts`.

**3.5 Load storage before the first render.** A top-level `await` of the stored layout (ES2022) means the page never renders a default layout and then jumps. If storage is blocked, run from memory and say so. *Where:* `src/start.tsx`.

**3.6 A cache-first service worker for a page opened all day.** Serve the page itself from the cache (no round trip before it can start), and let updates arrive in the background:
- the browser checks `sw.js` on every open;
- install fetches with `cache: 'reload'`, past the HTTP cache, so a new build can't store a stale file;
- keep the previous build's cache, so a page still open on it can load its remaining chunks;
- name caches `<prefix><build time>-<hash>`, so they sort by age.

*Where:* vite.config.ts `serviceWorker`.

**3.7 Black before the CSS.** One inline `html { background: #000 }` in `index.html`: a dark page never flashes white while its stylesheet loads.

## 4. Animation off the main thread
**4.1 Draw the background in a worker on an OffscreenCanvas.** `transferControlToOffscreen` hands the canvas to a dedicated worker, which loads its font, builds its sprite sheets and draws every frame there. The page's main thread is left to the UI: it starts while the background fills, and a frame of animation costs the page nothing. Drawn on the page, every frame had re-run the page's paint steps, more with every bookmark on it (0.5.0). *Where:* `wallpaper/host.ts`, `wallpaper/worker.ts`.

**4.2 Write engines that run in either place.** Use only what a worker and a page both have (OffscreenCanvas, the font set, `requestAnimationFrame`; no DOM), and keep a page fallback for browsers that can't hand a canvas over, loaded only then. *Where:* `wallpaper/types.ts`, `wallpaper/registry.ts`.

**4.3 Size the canvas to the screen, not the window.** A window resize or fullscreen then touches nothing: the window shows more or less of a canvas that's already big enough. Resize only for a new screen size, zoom or pixel ratio, debounced (150 ms). *Where:* `host.ts` `wantedSize`, `measure`.

**4.4 Stop when hidden; a still frame for Reduce Motion.** `visibilitychange` stops and starts the engine. Reduce Motion gives one full still frame, not a blank. Keep it behind a page-level override (`data-reduce-motion` on `<html>`) that every rule and engine reads: when the user asked for the OS setting to be ignored (Windows' "best performance" turns it on in Chrome), one attribute in index.html did it (1.0.1).

**4.5 Give the tests a probe into the worker.** The page can't read a canvas it gave away, so the worker answers probes: the share of lit pixels and a fingerprint, frame gaps and drawing time, whether it runs in a worker. Keep each frame's start and drawing time in a small ring (two typed arrays, no allocation), so stats are answered at once. *Where:* `window.__cyberdeckRain`, `worker.ts` `RING`, `wallpaper/probe.ts`.

**4.6 Move by elapsed time, capped.** Every engine advances by the time since its last frame, with the step capped (0.1 s), so a stall doesn't make it leap. Cap the frame rate where more frames buy nothing (about 72 a second), and leave it uncapped where the user wants every frame (NEURAL NET, DATA FLOW).

**4.7 Pre-warm a simulation instead of opening empty.** The rain opens full: 18 s of rain are simulated into typed arrays (recording only the last glyph and time per cell), then every cell still visible is painted once at the brightness the fades would have left. It's the same picture as drawing for 18 s, at a fraction of the cost. Paint the bright part first and show it, then fill in the faint rest. In a worker the slices can be big; on the page keep them small, so the UI isn't kept waiting. *Where:* `matrix-rain/engine.ts`, `params.ts` `PREWARM_*`.

## 5. Canvas 2D: what costs and what doesn't
**5.1 Bake text once.** `fillText` with shadows is the slow part of anything made of glyphs. Draw every glyph, glow included, into a sprite sheet once per layer and style, and copy from it with `drawImage`. Size each row's slots by how far its glow reaches, so big glows aren't cut off and the frequent copies stay small. *Where:* `matrix-rain/glyphAtlas.ts`.

**5.2 Never repaint the whole canvas if you can help it.** Keep the canvas's pixels between frames, and change only what moved. The rain fades one set of interleaved 2 px stripes a frame (a twelfth of the screen), so each pixel is faded every 0.2 s, but no frame fades everything: no dimming pulse, no expensive frame.

**5.3 Solid rectangle fills are cheap; pattern fills on a CPU canvas aren't.** A pattern fill measured many times slower on a software canvas than solid rectangles.

**5.4 Erase by shape, not by box.** To change a glyph in place, cut out the old one with its own bare shape (`destination-out`), never by clearing its cell: clearing punched dark boxes into the glow around it. Keep each cell's glyph to know what to cut. *Where:* the rain's ERASE row.

**5.5 Copying big transparent sheets at fractional positions is the expensive part.** QUANTUM KERNEL copied five screen-sized sheets at fractional rows each frame: about 0.5 s of every second of the worker in software Chrome. Whole rows halved it, and the cost stayed in the copies. Laying them together in one WebGL pass took it to about 2 ms a second (1.0, §6.6). Profile the copies, not just the drawing. *Where:* `quantum-kernel/engine.ts`.

**5.6 Bake a static scene into strips and slide them.** SUMMIT draws each layer (sky, ranges, cloud banks) once into a strip one loop wide (1.6 screens), and a frame is only copies. Things to get right:
- **Seams:** draw the strip 4 px longer (the loop's start again), so two copies on screen overlap on the same picture. Copies meeting at a fractional pixel each half-cover it, which shows as a faint dark line.
- **Facets without hairlines:** fill the silhouette in its base colour first, then each facet, filled and outlined in its own colour.
- **Blur across a seam:** draw with a margin, blur once, then cut to size.
- **Soft layers at half resolution** (the sky): they lose nothing.
- **Trim what's never seen:** stop each strip a few px below the lowest point of the layers in front. Taller ranges and clouds had halved the frame rate in software Chrome until then (0.28.2).

*Where:* `summit/engine.ts`, `summit/terrain.ts`.

**5.7 Bake glow and blur once; never blur per frame.** QUANTUM KERNEL bakes each depth's glow and focus blur into its sheet with `ctx.filter`, once per size, palette or glow, so they cost nothing per frame. Draw a looping sheet with a margin of wrapped content, so its blur crosses the seam, and draw out-of-focus layers smaller. Measure which blur to bake with: for the rain's glyphs, a canvas `filter` blur measured slower than per-glyph `shadowBlur`, so its atlas uses shadows.

**5.8 Copying a canvas onto itself copies it whole.** Use a second canvas for any self-copy.

**5.9 Thin strokes alias badly on a GPU-drawn canvas.** Chrome's GPU-drawn canvas (a worker's) anti-aliases strokes thinner than a pixel poorly: NEURAL NET's 0.9 px links stepped on the user's screen but not in tests, because headless Chromium draws canvases in software (0.22.0). For fine lines, use WebGL with the edge worked out in the shader (§6.2), and check on a real GPU.

**5.10 Draw additive light on a clear canvas over a CSS background.** VELOCITY draws everything with `lighter` on a clear canvas, over a dark background that's plain CSS; a skew transform gives a panel its lean for free. CSS also carries the big soft glows behind several wallpapers: cheaper than drawing them, and they take the palette's tokens.

## 6. WebGL 2 in a browser
**6.1 No multisampling.** `antialias: true` smoothed HORIZON's hill outlines but made it "very laggy and choppy" on the user's machine (0.17.4; off again in 0.17.5). Make smooth edges in the shader instead.

**6.2 Smooth lines from the gradient's length, not `fwidth`.** A pixel's distance to a line, divided by how fast that distance changes across the screen (the gradient's length), gives a width in px that holds at any distance and angle. `fwidth` over-reads slanted lines and draws them thinner, in steps. Draw a soft bell-shaped core and a Gaussian glow around it (HORIZON 0.17.4, SUNSET 0.17.3). For solid faces, put each edge line wholly inside its face and fade the face over its last device pixel, so each face draws its own anti-aliased outline (PRISM 0.23.1).

**6.3 Draw what never changes once, and keep it.** HORIZON's and SUNSET's skies are drawn only when the size, palette or glow changes, kept with `preserveDrawingBuffer`, and each frame redraws only the ground, scissored. (On a phone the opposite holds: its screen doesn't keep the picture, and reading a kept copy back costs more than the sums. See fluid_motion's playbook.)

**6.4 Work out a dense scene per pixel from a small texture.** MEGACITY's tens of thousands of windows aren't geometry: each layer's skyline (per column, the top and which tower) is a float texture, and the fragment shader walks the layers near to far, stopping at the first tower a pixel is inside. Windows come from each tower's seed and the clock. Nothing is drawn twice, and nothing is sent per frame. *Where:* `megacity/city.ts`, `shaders/city.frag`.

**6.5 Cache a per-pixel result that changes rarely.** MEGACITY's city changes only when a window switches, so it's drawn into a cache once a second (its clock in whole seconds) and copied each frame. On the phone that took 5.09 ms of GPU to 0.93 ms (fluid_motion 0.7.0).

**6.6 Composite baked canvases on the GPU.** Upload each Canvas 2D sheet as a premultiplied RGBA texture (`UNPACK_PREMULTIPLY_ALPHA_WEBGL`, so it matches what the canvas holds), repeat it down with `REPEAT` (WebGL 2 repeats any size), read each at its scroll, and blend them back to front in one fragment pass. To check the picture didn't change, seed `Math.random`, draw a still frame of the old and new builds, and diff: at most 11 of 255 apart, and about 1 brighter on average, because the GPU doesn't round down at each of the canvas's five 8-bit blends. Drop the canvas copies once they're on the card. *Where:* `quantum-kernel/shaders/kernel.frag`.

**6.7 See-through objects without a depth buffer.** Sort back to front with an insertion sort into an order kept between frames (nearly sorted already, since the camera only sways), and within an object draw its far faces first. From a fixed high angle every box shows the same three faces, so list them first in the buffer. Premultiplied colour throughout: the body blends over, and the light adds. *Where:* `prism/field.ts` `sortBackToFront`, `prism/engine.ts`.

**6.8 Instances for anything numerous.** NEURAL NET draws every link as a quad and every node as a sprite, sent per instance from arrays reused frame to frame, since a big screen holds more than a uniform array would. PRISM draws every block in one instanced draw.

**6.9 Handle a lost context with the right events.** `webglcontextlost` (call `preventDefault()`, or the context never comes back) and `webglcontextrestored` (rebuild programs, buffers and textures). `contextlost` is the 2D canvas's event, and WebGL never fires it: until 1.0 every WebGL wallpaper here stayed dark after a driver reset. To test it, keep the `WEBGL_lose_context` extension object from before the loss, since `getExtension` returns null on a lost context. *Where:* every WebGL engine; the walk's lost-context path.

**6.10 Supersample until the frames say stop.** NEURAL NET draws at 1, 1.5, 2, 3 or 4 times the screen's pixels and lets the browser shrink it. It starts at 2×, climbs a level after each smooth 2 s window, and steps back for good once the slowest tenth of frame gaps runs 1.4× the smoothest the screen has shown, ignoring the 0.6 s after each change (a resized canvas hitches once). "As much as possible but limit it to the threshold when performance starts dropping." Keep it pure (fed gaps and times), so tests drive it. *Where:* `neural-net/tuner.ts`.

**6.11 One shader set for two platforms.** Write shaders to the stricter platform's rules (GLSL ES 3.00, `highp` positions, `precision highp int` for integer hashes) and share them byte for byte; let each platform differ only through uniforms and geometry. A change is made to both in the same step. *Where:* MEGACITY, HORIZON, SUNSET, PRISM and NEURAL NET's fragment shaders, shared with fluid_motion.

## 7. Sharp without lag
**7.1 Cap the pixel ratio, then guard it.** Draw at the screen's own pixel ratio up to 3 (`SHARP_DPR`). Where that's more than a wallpaper's safe cap (2, VELOCITY 1.5), watch its first seconds:
- wait 1 s after its first frame;
- read 3 s of frames (at least 30);
- if p95 drawing time is over 8 ms (half a 60 Hz frame), step back to the safe cap and remember that, per wallpaper.

Never go below the safe cap. Offer TRY AGAIN, and watch again on a new screen. *Where:* `lib/sharpness.ts`, `host.ts` `guard`.

**7.2 Zoom by laying out smaller, not by scaling up.** A wallpaper's ZOOM lays it out for a screen 1/zoom as big and draws it zoom times as large, with the pixel ratio capped first and then zoomed, so the canvas keeps its pixels at any zoom: sharp, never stretched. A scene laid out in shares of the screen scales its sizes instead. *Where:* `wallpaper/types.ts` `zoomedSize`.

## 8. Data that can't be lost
**8.1 One versioned document for everything the user arranges.** Saving, snapshots and backup files all store exactly that document, so anything added to it is backed up and restorable from the day it lands. *Where:* `lib/layout.ts`.

**8.2 Migrate step by step, with real old documents as fixtures.** A shape change bumps the schema and adds one step (version n → n+1), plus a test with a real version-n document. Fold an awkward old shape into the new one by its meaning, using the document's own context: 0.18.0's two per-module scales became one, their product, so a module stays as big on screen. *Where:* `lib/migrations.ts`, `src/__tests__/clock.test.ts`.

**8.3 Normalize additions instead of bumping.** A new pref or optional field gets its default on load, and an older app ignores what it doesn't know. Write optional flags only when they're set (`brandOff: true`), so an unchanged layout stays the same document. Repair lists entry by entry: drop a malformed module, never the layout.

**8.4 Never write over data you couldn't read.** Copy it to `corrupt.<time>` first, then start fresh with a notice. A document from a newer version is copied aside but left in place, since the newer app can still read it. *Where:* `store/persist.ts` `boot`.

**8.5 Snapshots with an index and a fingerprint.**
- **When:** after a change once things have been still for 30 s, at startup, before anything replaces the data (import, restore, switching profiles), when editing starts, of anything deleted, and on `pagehide`.
- **The index:** each snapshot's time, reason, summary and fingerprint (the length and a cyrb53 hash of the canonical JSON, keys sorted). Startup, the list, "has anything changed?" and pruning read only the index; a copy is read only to restore it. Startup had read every copy in full until the optimization pass (2026-10-22).
- **Skip duplicates:** a copy identical to the newest is never stored.
- **Keep:** the newest 20, plus the newest of each of the last 7 days.

*Where:* `lib/snapshots.ts`, `lib/layout.ts` `layoutFingerprint`.

**8.6 Replacing is undoable.** Import, restore and profile switches all snapshot the current data first, and say so. Ask before replacing, and show a preview of what a file holds.

**8.7 Order writes so a page closed midway loses nothing.** For profiles: write a copy before the list points at it, and delete it only after nothing does; the worst left behind is a spare copy, which startup ignores. Run storage writes one at a time, in order, through a queue. *Where:* `store/layout.ts` `switchProfile`, `queue`.

**8.8 Backups the user owns, and a reminder.** Snapshots die with the browser's site data; only an exported file survives a cleared profile or a new PC. Offer EXPORT / LATER once the last export is older than the interval (14 days by default), and stay quiet while there's nothing worth backing up. Keep the file's version stable by making additions optional (profiles rode along in 0.21.0 without a version bump). *Where:* `lib/backup.ts`, `lib/reminder.ts`.

**8.9 Test storage logic against a Map.** A tiny async KV interface over IndexedDB lets startup, snapshots and damaged-data handling run in plain unit tests against memory. *Where:* `store/kv.ts` `memoryKV`.

## 9. Sharing an origin
**9.1 A GitHub Pages user site is one origin for every repo.** quest_log_desktop and this app share `thedungeons2077.github.io`, so they see the same storage area. Each app needs:
- its own IndexedDB database name;
- its own localStorage key prefix;
- its own cache prefix;
- a service worker that answers only for its own path and deletes only its own caches.

Never touch the other app's storage. *Where:* `store/idbKV.ts`, vite.config.ts, the hints.

**9.2 Chrome's zoom is per site, so neighbours share it.** Zooming quest_log zoomed the dashboard too, and no page can set or refuse Chrome's zoom. So cancel it:
- work the zoom out from the window (outer ÷ inner width roughly; the pixel ratio exactly, as zoom × the OS display scale, snapped to Chrome's levels);
- draw the UI at your own scale ÷ that zoom, with CSS `zoom` on the root (a real relayout, so text stays crisp);
- size the canvas as at 100%.

Work it out again on every resize. Inside a CSS-zoomed root, `vw`/`vh` and screen boxes are in different px: convert pointer and `getBoundingClientRect` values by the zoom. *Where:* `lib/scale.ts` `browserZoom`, `src/scale.ts`, `host.ts` `wantedSize`.

## 10. Theming with a handful of colours
**10.1 Twelve base colours per palette; mix everything else.** Glows, tints, rules and scanlines are `color-mix` of the base tokens in one stylesheet, so a new palette is twelve hex values. Nothing else in the CSS or components holds a raw colour. *Where:* `src/styles/theme.css`, `src/lib/palettes.ts`.

**10.2 Test contrast for every palette.** Every text colour must pass WCAG AA on every background it's drawn on; a unit test computes it for each palette, so a new one can't ship unreadable. *Where:* `src/__tests__/appearance.test.ts`.

**10.3 Re-theme a subtree by setting the tokens on it.** The wallpaper's own palette is the same base tokens set on its `.wallpaper` element: its CSS layers take its colours while the page keeps the dashboard's.

**10.4 Let engines take tones, not raw tokens.** Each wallpaper works out its tones from the palette's roles (cool, accent, bright…), so every wallpaper works with every palette; a palette made for one gives its reference's look. Where the user wants a part fixed (SUMMIT's grey clouds), mix it from the background toward white, never from the palette's hue, and test that it stays neutral in every palette.

## 11. React patterns that held up
**11.1 Vanilla zustand stores, read from anywhere.** Stores made outside React can be read by non-React code (the wallpaper host, the shortcuts, the recovery panel) and by React through selector hooks that re-render only on their slice. *Where:* `store/*`, `app/hooks.ts`.

**11.2 React Compiler lint rules from the start.** No `setState` in effects, no refs or impure calls (`Date.now`) during render. It keeps components predictable and catches whole classes of bugs. *Where:* eslint.config.js.

**11.3 Error boundaries at two levels.** One round the whole page, whose fallback reads the stores directly (the app's hooks may be what broke) and offers RELOAD, EXPORT BACKUP and RESTORE. One round each independent part (a module, and its settings dialog), whose fallback is a card in its frame with RESET SETTINGS and REMOVE. Use the part's own data as the reset key, so resetting draws it again. It's a class component: React catches errors only there (`getDerivedStateFromError`, `getDerivedStateFromProps` for the reset, `componentDidCatch` for the trace). *Where:* `app/Recovery.tsx`, `app/modules/Modules.tsx`.

**11.4 A way to break the real page on purpose.** A test hook (`window.__cyberdeck.testCrash(target)`) makes a chosen part throw while drawing, so the browser walk checks the real recovery, not a copy of it.

**11.5 FLIP glides driven by store listeners.** Store listeners run before React redraws, so they can note every item's position (the old layout). After the commit, measure again and animate each moved item from its old place with a transform (Web Animations). Take positions relative to the scrolling box, so scrolling doesn't count as moving, and discard notes older than 250 ms. *Where:* `app/deck/useFlip.ts`.

**11.6 Keep a component a moment after it's gone,** so it can animate out (`usePresence`), and give the keyboard back at once while it fades.

## 12. Interaction patterns
**12.1 Every drag has a keyboard way.** A ⋯ menu that does everything a drag does (move earlier, later, into an area, hide…), arrow keys on grips (Shift for bigger steps), focus following the moved item, and a polite live region announcing the change.

**12.2 A press becomes a drag only past a threshold** (5 px), so a plain click still clicks. Use pointer events, so a mouse, pen and touch screen all work. Esc cancels.

**12.3 Place panels with `left`/`top` from shares of the window, never transforms,** so text stays on whole pixels and places hold as the window changes. Snap a dropped panel to the window's edges and to neighbours within 8 px, with an 8 px gap; don't snap keyboard nudges.

**12.4 The command palette.** `/` opens a combobox over a listbox (`aria-activedescendant`); results as you type, the best match already chosen, so `/` + a few letters + Enter opens a site. Score prefix matches above inner ones, then the site, then folders, then loose letter-order matches; break ties by shorter title, then page order. Commands follow the results; a web search comes last. *Where:* `lib/find.ts`, `app/Finder.tsx`.

**12.5 Nothing ticks while unseen.** Clocks read the time once per change of their display (one timeout at a time, never an interval), only while the page is visible, and read afresh on return so nothing drifts. A deadline that must fire from a background tab gets one timeout to its end, re-armed a day at a time (a browser's timeout can't wait past about 24 days). *Where:* `app/modules/useNow.ts`, `CountdownModule.tsx`.

**12.6 No endless CSS animations over a live background, and no backdrop blur.** A running loop makes Chromium redo work every frame, more the more elements there are (0.5.0). A backdrop blur re-blurs the animating canvas every frame. Use one-shot accents and solid surfaces.

**12.7 Size big readouts from their container.** CLOCK's digits come from a container query on the module's width, capped so they never overflow, so the module's resize edge resizes the clock.

## 13. Testing a canvas-heavy web app
**13.1 Keep the rules pure, and test them in Node.** Layouts, migrations, snapshots, arranging, search, palettes and every wallpaper's layout code (seeded, or fed random numbers) have no DOM, so Vitest runs them in Node; only a file that needs a DOM opts into jsdom. 266 tests run in about 2 s. *Where:* `src/__tests__/`.

**13.2 Seed the randomness, and test what makes a loop seamless.** A layout's tests check it's the same for the same random numbers, stays in bounds, loops with no seam (its shapes the same a loop along), and takes its colours from every palette. *Where:* `summit.test.ts`, `horizon.test.ts`, `prism.test.ts`, `quantum.test.ts`.

**13.3 A browser walk on the built page.** One Playwright script serves `dist/` and walks the app in order on one page, each path building on the last: about 60 paths, screenshots of each screen, and a `FAILED-*` screenshot and non-zero exit on any failure or page error. Serve with the `serve` binary itself on 127.0.0.1 (not `npx serve`, whose child outlives it), and always stop it. *Where:* `e2e/walk.mjs`.

**13.4 Simulate what the test machine doesn't have.** The walk simulates Chrome at 175% zoom, a 2.5× screen with a forced-slow guard budget, Reduce Motion, a browser that can't hand a canvas to a worker, lost WebGL contexts, and 4× slower CPU (CDP throttling). Each is a path, so each keeps working.

**13.5 axe in the walk.** Run axe-core (WCAG 2.2 A/AA and best practice) in each distinct state: edit mode, with modules, with a dialog open and shut.

**13.6 Compare pictures with numbers.** For a change that should look the same, seed `Math.random`, take a still frame of both builds on the page fallback (Reduce Motion), and diff in Python: the largest channel difference, and the share of pixels over a few thresholds. To match a reference, compare brightness by eighths of the height, colour shares and percentiles.

**13.7 Know what headless can't tell you.** Headless Chromium has no GPU: WebGL frame times mean nothing there, canvases draw in software (so GPU-only artefacts, like thin strokes stepping, don't show), and some canvas operations cost far more than on a GPU. Use it for correctness and relative CPU cost; the user's machine is the judge, and a COPY DIAGNOSTICS button brings its figures back.

**13.8 A screenshot is a check, not a formality.** Crop and boost the contrast to find seams and banding: a blurred, eight-times-brightened copy shows a line the eye only half sees.

## 14. Measuring speed honestly
**14.1 Measure before and after, and report the numbers.** A perf script with scenarios (opening with a simulated network delay, first and repeat visits through the service worker; the animation uncapped; a big stored layout; dragging on a big list), at normal and 4× slower CPU. *Where:* `e2e/perf.mjs`, `e2e/motion.mjs`.

**14.2 Time in the page.** Use performance marks and measures taken in the page (`app:start`, `app:booted`, `app:ui`; the worker's own measures copied into the page's timeline). Timing from the test runner is skewed while the page is busy (0.3.1).

**14.3 Compare several runs, never one.** Timings on a shared machine vary run to run: 0.3.0's "7 of 108 frames over 25 ms" was a single good run; repeats later showed 10–14. Repeat a scenario (`PERF_REPEAT`) and compare ranges.

**14.4 A/B against the old build.** Keep a copy of the previous `dist/` (from a scratch `git worktree`) and measure both with the same script (`PERF_DIST`, `MOTION_DIST`).

**14.5 Trace before blaming a change.** A long task seen at 1.0 was traced in older builds too (0.19.0 had it, at about 80–95 ms): evaluating the app's chunk once on arrival, not a regression.

**14.6 Record a baseline with each milestone** (C7 at 0.19.0, then 1.0), so later work compares against numbers, not memory. *Where:* ARCHITECTURE.md § 17.

## 15. Shipping a static site
**15.1 One deploy script that tests everything first.** Types, lint and unit tests; a build at the root and the full walk; a build at the Pages sub-path, the walk there, and the real extension at its production address; then publish the `gh-pages` branch. Any failure stops it before anything is public. *Where:* `scripts/deploy.sh`.

**15.2 Build for the sub-path the host serves.** GitHub Pages serves a project site at `/<repo>/`. Make the base path a build variable (`CYBERDECK_BASE`), and walk the sub-path build too: absolute paths that work at `/` break there.

**15.3 Ask before anything public, then verify it's live.** Every deploy, push and release waits for the user's yes. After a deploy, poll the live site's scripts for the new version before saying it's out.

**15.4 Deterministic artefacts.** The bridge's zip is written by a tiny zip writer with fixed timestamps (Node has deflate and CRC-32 built in), so the same files always give the same zip. *Where:* `scripts/zip.ts`.

**15.5 Version and build number from the source of truth.** The version comes from package.json and the build number from the newest CHANGELOG heading, injected at build time and shown in the app and its backups.

## 16. Working with the user
These held across this project and fluid_motion (WORKING.md has the method in full):
- **Their words are the spec.** Quote them in the changelog and DESIGN.md ("a seamless and smooth gradient", "get rid of that line completely", "have the foreground in the reference be replaced by clouds"), and keep what they asked to keep (the web's PRISM and HORIZON untouched; links in new tabs).
- **A reference image, matched closely and measured.** Brightness by eighths, colours, sizes; leave out only what they ask to drop (HORIZON's slabs, MEGACITY's figure, PRISM's tubes).
- **Screenshots first, then their tweaks.** Check every build by eye before showing it; their next message is the next spec.
- **Smoothness, then sharpness, then detail.** "Aim for maximum smoothness, sharpness yes but detail can be lowered" (HORIZON, 0.15.1).
- **One phase at a time, agreed first.** A numbered roadmap (C1–C10), each phase its own release; ask before anything public.
- **Small and crisp on the web,** names never addresses, a minimal HUD.

## 17. Numbers worth remembering
| What | Value |
|---|---|
| Opening, repeat visit, 120 ms network delay (1.0) | 79–86 ms to the dashboard; 279–301 ms at 4× slower CPU |
| Opening, first visit (1.0) | 431 ms; 601 ms at 4× slower |
| The first stage's chunks (1.0) | 1.0 + 13.6 + 147.8 kB (the worker and every engine inlined) |
| The app's chunk (1.0) | 357.4 kB, 109.6 kB gzipped |
| Lazy module kinds | saved 5 KB gzipped, cost 130 ms on a first visit |
| Drawing script per wallpaper, ms a second at 1920×1080 (1.0) | 1 (PRISM) to 29 (MATRIX RAIN) |
| QUANTUM KERNEL: canvas copies → one GPU pass | about 540 → 2 ms a second |
| NEURAL NET: 2D strokes → WebGL quads | about 36 → 4 ms a second |
| MEGACITY's once-a-second cache (on the phone) | 5.09 → 0.93 ms GPU a frame |
| The sharpness guard | p95 over 8 ms after 1 s settle and 3 s watch → the safe cap |
| Pixel ratio | up to 3; safe caps 2 (VELOCITY 1.5) |
| Frame rate cap | about 72 a second (NEURAL NET and DATA FLOW uncapped) |
| Snapshots kept | the newest 20 + one a day for 7 days; one 30 s after changes stop |
| Unit tests / walk paths (1.0) | 266 / 60 |

## 18. Starting a new project from this one
1. **Copy the skeleton:**
   - the two-stage start (`main.tsx`, `start.tsx`) and the Vite plugins (`serviceWorker`, `preloadApp`);
   - the storage layers (`store/kv.ts`, `idbKV.ts`, `persist.ts`), the versioned document with `lib/migrations.ts`, and `lib/snapshots.ts`, `lib/backup.ts`, `lib/reminder.ts`;
   - `app/Recovery.tsx`;
   - the theme (`theme.css`, `lib/palettes.ts` with its contrast test, `palette.ts`);
   - for an animated background: `wallpaper/host.ts`, `worker.ts`, `types.ts`, `probe.ts` and `lib/sharpness.ts`;
   - the test harness: Vitest config, `e2e/walk.mjs`'s `path()` and server handling, axe.
2. **Keep the layering:** pure `lib` (tested in Node), stores over a KV interface, React on top, canvas code with no DOM.
3. **Name your storage for your app** on a shared origin: database, localStorage prefix, cache prefix, service worker scope.
4. **Measure from the first build:** a perf script, a motion script, and a diagnostics button that copies figures for pasting back.
5. **Write it down as you go:** a WORKING.md for the method, an ARCHITECTURE.md with a measurements history, a DESIGN.md with every reference and how it was matched, a CHANGELOG in the user's words.
6. **Ship through one script** that checks everything and asks first.
