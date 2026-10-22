# Changelog

## 0.2.0 (build 3)
Your bookmarks bar on the dashboard.
- **The bookmarks deck** mirrors the bookmarks bar. Its links are tiles; its folders are cards that fold open, with nested folders folding inside them. Links open in the same tab (Ctrl or middle-click for a new one). Links a webpage can't open (chrome://, bookmarklets) are listed but inert. Which folders are open is saved in the layout and its backups.
- **The CYBERDECK BRIDGE extension** is optional, downloaded from the page as `cyberdeck-bridge.zip` and loaded unpacked.
  - It keeps the deck live: changes in Chrome show up at once.
  - It opens the dashboard on every new tab.
  - It's read-only, shares only the bookmarks bar, and only with this page.
- **Without the bridge,** you can import Chrome's `bookmarks.html` export as a copy. The copy is kept in the layout, so it's backed up too.
- **SYSTEM ▸ BOOKMARKS** shows the source and the bridge version, offers the download and any update, and can import or remove the copy.
- **Instant on open:** the last live bar is cached, so the deck appears at once while the bridge answers.
- **Layout schema 2:** older layouts and backups migrate automatically.

## 0.1.1 (build 2)
Smoother, at the same running cost (measured with `npm run e2e:motion`):
- The trails fade in thin interleaved stripes, a slice every frame, instead of the whole screen at once five times a second. That removes a faint whole-screen flicker and the one expensive frame in every twelve.
- Opening the page no longer stalls. The screen-filling pre-warm runs in slices of up to 10 ms per frame and skips drawing what would have faded anyway, then the rain fades in. The worst stall while loading fell from about 570 ms to about 50 ms.
- Going fullscreen no longer stretches the rain for a moment: the canvas resizes at once, and its CSS size always matches its pixels.

## 0.1.0 (build 1)
- The foundation: a full-screen matrix-rain wallpaper (three depth layers, tuned to the reference wallpaper), drawn on a canvas that only paints what moved.
- F: immersive fullscreen. Only the wallpaper shows; F or Esc brings the UI back. The pointer hides after 2 s still.
- S: the SYSTEM panel: export and import backup files (with a preview), restore automatic snapshots, the backup reminder, the wallpaper.
- The layout is a versioned document with migrations; damaged data is kept aside, never overwritten.
