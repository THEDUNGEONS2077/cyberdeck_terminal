# Architecture

## Layers
| Folder | What | May import |
|---|---|---|
| `src/lib/` | Pure rules: the layout document, migrations, backup files, snapshot keeping, the reminder | nothing outside `lib` |
| `src/store/` | State and storage: `persist.ts` (startup), `layout.ts` (layout store), `ui.ts` (screen state), `idbKV.ts` / `kv.ts` (storage) | `lib` |
| `src/wallpaper/` | Animated wallpapers on a canvas, plus `WallpaperLayer.tsx`, which owns the canvas | `lib` (ids only) |
| `src/bridge/` | `client.ts`: messaging with the bridge extension (Chrome's externally_connectable API) | `lib` |
| `bridge/` | The **CYBERDECK BRIDGE** extension itself (MV3, plain JS), zipped into the build as `cyberdeck-bridge.zip` | nothing |
| `src/app/` | React UI: `App`, `Hud`, `SystemPanel`, `Dialog`, `Toast`, shortcuts, fullscreen; the deck in `Bookmarks.tsx` + `deck/`; `arrangeDrag.ts`, `panels.tsx` | everything |

## Startup
`index.html` holds the wallpaper's canvas as plain HTML.
1. `src/main.tsx`, the first chunk (about 13 KB), starts it at once (`wallpaper/host.ts`, with the choice remembered in localStorage).
2. It then `import()`s `src/start.tsx` (storage + React + dashboard, about 250 KB), which loads in parallel.
3. The rain's font is preloaded.

The pre-warm records the simulation into typed arrays and paints each visible glyph once. Time to rain: about 0.18 s at normal CPU speed and about 0.7 s at 4× slowdown (`e2e/motion.mjs`).

## The page
```
<WallpaperLayer>   fixed, z 0: haze · canvas · fade to black at the bottom
<main.ui-layer>    fixed, z 1: HUD, toast. Fades out and goes inert in immersive mode
<SystemPanel>      modal dialog (S)
```
**Immersive mode (F):**
- `toggleFullscreen()` calls the Fullscreen API.
- `useFullscreenSync()` copies `document.fullscreenElement` into `ui.immersive` on every `fullscreenchange`. Esc and the browser's own controls therefore stay in sync.
- While immersive, `useIdleCursor` hides a still pointer.

## Bookmarks
```
bridge/background.js ──(externally_connectable)──▶ src/bridge/client.ts ──▶ store/bookmarks.ts ──▶ app/Bookmarks.tsx
 chrome.bookmarks        hello · bar · port "changed"   useBridge (app/useBridge.ts)   status · bar          deck / CONNECT prompt
```
**The bridge.**
- It answers three messages:
  - `hello`: its version and `features` (`favicons`, `open`; bridge 1.1.0 and later);
  - `bar`: the bookmarks bar, reduced by `bridge/tree.js` to id, title, url and children;
  - `open`: `ntp` or `bookmarks` opens Chrome's New Tab page or Bookmark manager in a new tab next to the dashboard. Only these two pages.
- **New Tab** (`bridge/newtab.js`): if a dashboard tab is open in the same window, the new tab switches to it and closes itself; otherwise it becomes the dashboard (`location.replace`). Finding dashboard tabs uses `host_permissions` for the dashboard's address only, not the `tabs` permission.
- **Site icons** load as `<img>` from `chrome-extension://<id>/_favicon/?pageUrl=…&size=16|32` (Chrome's icon cache). That needs the bridge's `favicon` permission, plus `web_accessible_resources` for the dashboard's origin.
- Over a long-lived port it posts `changed`, debounced by 150 ms.
- Chrome stops idle extension workers, which closes the port. The page then reconnects, with back-off from 1 to 30 s, paused while the page is hidden, and asks for the bar again.
- **Id:** `mbjnlinjocmaalhodjhpkadlpifnelic`, fixed by the manifest's public `key`. The private key was never kept, since an unpacked extension doesn't need it.

**Which bar shows:**
1. The bridge's live bar.
2. While the bridge is first being asked, the cached bar.
3. With no bridge, the imported copy (`layout.bookmarks.imported`).
4. With none of these, the CONNECT prompt.

**Folders:** which are open is stored in `layout.bookmarks.open`, keyed by folder path (`lib/bookmarks.ts` `folderKey`), so the same folder matches across the live bar and an imported copy. A folder's contents are first rendered when it first opens.

**Links:** only http(s) links are clickable, because Chrome blocks webpages from opening chrome://, file:// and javascript:. They open in a new tab (`target=_blank`, `rel=noopener noreferrer`), so the dashboard never navigates away and its animation is never caught frozen mid-handoff.

**`bookmarks.html` import:** `lib/bookmarks.ts` `parseBookmarksHtml` reads the Netscape export without a DOM and takes the folder marked `PERSONAL_TOOLBAR_FOLDER`.

## Arranging (edit mode)
- **`lib/arrange.ts`** (pure) holds your `Arrangement`: `order` (NAV), `areas` and `hidden`, plus the `Panels` places. Both are stored in the layout document (schema 3), so backups and snapshots cover them.
- **Item keys** are `l:<url>` (`#2`… for repeats) and `f:<folder path>`.
- **`arrange(bar, arrangement)`** works out NAV, the areas, the hidden items, and what folders leave out. Unplaced items follow Chrome's order (`mergeOrder`).
- **`store/edit.ts`:** `begin` takes a BEFORE EDIT snapshot. `apply` pushes an undo step and saves at once. `undoLast` / `revert` step back. `done` locks and snapshots.
- **`app/arrangeDrag.ts`:** pointer drags past a 5 px threshold. Targets are read from `data-drop-section`, `data-item-key`, `data-kind`, `data-section` and `data-area-id`; Esc cancels. Panels move live through CSS variables and are saved on drop.
- **Keyboard alternatives:** the ⋯ menus (`deck/ArrangeMenu.tsx`), ↑ / ↓ on area grips, and arrow keys on panel grips.
- **Panels** are placed with `left`/`top` from shares of the window, clamped on screen. There are no transforms, so text stays crisp, and narrow windows ignore the places.

## Storage and recovery
IndexedDB, database `cyberdeck_terminal`, store `kv`. quest_log_desktop shares the origin, so the name is this app's own. The keys:

| Key | Holds |
|---|---|
| `layout.v1` | The layout document (`lib/layout.ts`) |
| `meta.backup.v1` | Last export, reminder snooze, first run |
| `bookmarks.cache.v1` | The bridge's last bookmarks bar: a cache for an instant first draw. Not in the layout or backups |
| `snapshot.<ms>` | Automatic snapshots: `{ at, reason, summary, layout }` |
| `corrupt.<ms>` | Data that couldn't be read, kept rather than overwritten |

**Startup (`store/persist.ts` `boot`):**
1. Load the layout.
2. Migrate and validate it.
3. If it can't be read, copy it to `corrupt.*`, start fresh, and show a notice.
   - A layout from a newer version is copied but left in place.
4. Take a startup snapshot if the layout differs from the newest snapshot.

**Saving and snapshots (`store/layout.ts`):**
- Every change is saved at once.
- A snapshot follows once the layout has been still for 30 s.
- Import and restore snapshot the current layout first, so they can be undone.

**Keeping snapshots (`lib/snapshots.ts`):**
- The newest 20 are kept.
- So is the newest of each of the last 7 days.
- A copy identical to the newest snapshot is never stored.

**Backup files (`lib/backup.ts`):**
- Shape: `{ format: 'cyberdeck_terminal-backup', version: 1, exportedAt, app, layout }`.
- Import parses, migrates and validates, then shows a preview before anything is replaced.
- The reminder (`lib/reminder.ts`) offers EXPORT / LATER once the last export is older than the interval. It stays quiet while the layout still has nothing of its own.

## Wallpapers
The contract is `src/wallpaper/types.ts`: `create(canvas, { palette, still })` → `{ resize, start, stop, setStill, destroy }`.

- The palette is read from theme.css tokens, so a wallpaper uses the UI's colours.
- `WallpaperLayer` handles three things:
  - resizing, debounced by 150 ms;
  - the device pixel ratio;
  - visibility (stopped while the tab is hidden) and Reduce Motion (a still frame).

**To add a wallpaper:** create a folder under `src/wallpaper/`, export a `Wallpaper` from it, and add it to `WALLPAPERS` in `registry.ts`. Its `id` is stored in layouts and backups, so it must never change once released.

### Matrix rain (`src/wallpaper/matrix-rain/`)
- **`params.ts`** holds every tunable number, matched to the reference wallpaper.
- **`glyphAtlas.ts`** pre-draws every glyph, with its glow, once per layer into a sprite sheet.
  - Its rows are HEAD, BODY and DIM.
  - Katakana are used only if a system font can draw them (`canDraw`).
- **`engine.ts`** never repaints the whole canvas. Each frame it does three things:
  1. fades one set of interleaved 2 px stripes, a twelfth of the screen. Each pixel is still faded once per 0.2 s, but no frame fades everything, so there's no whole-screen dimming pulse and no expensive frame. The fills are plain solid rectangles, the cheap path on both GPU and CPU canvases (a pattern fill measured many times slower on a CPU canvas);
  2. copies in the glyphs that drops moved onto;
  3. re-rolls a few glyphs inside trails (the flicker).
- **Drops:** each column of each layer has one drop slot. A drop falls to a random depth, then waits at the top. The wait sets the layer's occupancy.
- **Startup:** 18 s of rain are simulated before the canvas is shown, so it opens full.
  - Only the last 9 s are drawn. Earlier glyphs would have faded to under 5% anyway.
  - The work runs in slices of up to 10 ms per frame, so the page never stalls.
  - `onReady` then fades the canvas in.
- **Resize:** the drawn pixels are copied across and columns are added or removed, so entering fullscreen doesn't restart the rain.
  - The canvas's CSS size always matches its pixels, so it's never shown stretched.
  - Fullscreen changes apply at once; window drags are debounced.

`npm run e2e:motion` measures frame gaps, script time per second (normal CPU and 4× slower), the worst stall while loading, and the frame just after a resize. Compare a change against a copy of the old `dist/` with `MOTION_DIST`.
