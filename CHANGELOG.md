# Changelog

## 0.3.0 (build 5)
**Faster start.** The rain is on screen about 3× sooner: about 0.18 s after the page opens, where it was 0.5 s (0.7 s from 1.9 s on a slow CPU).
- **Cheaper pre-warm:** the screen-filling pre-warm runs the simulation on numbers only and then paints each visible glyph once. It used to draw and fade the canvas hundreds of times.
- **Earlier start:** the wallpaper is plain HTML, started by a tiny first script before storage, React and the dashboard load (in parallel). Its font is preloaded.
- **Quicker fade-in:** the rain fades in over 200 ms.

**An editable layout.** EDIT in NAV's header unlocks it; DONE (or Esc) locks it again.
- **Areas:** your own named sections. Rename them in place; they fold, move up and down, and can be deleted (their bookmarks go back where Chrome has them).
- **Drag** bookmarks and folders into areas, reorder them, or pull a bookmark out of a folder. A glowing line shows where it lands.
- **Every item has a ⋯ menu** that does the same from the keyboard: move earlier or later, move to NAV or an area (or a new one), back to Chrome's place, hide.
- **A HIDDEN tray** holds what you've hidden: drop things on it, and SHOW brings them back.
- **Panels:** move NAV and the brand panel (drag the grip, or arrow keys), and resize NAV's width. RESET PANELS puts them back.
- **CHROME ORDER** reloads Chrome's own order, removing your custom order and areas (it asks first).
- **UNDO** (Ctrl+Z) and **REVERT** (back to how it was when editing started). Changes save as you go, a snapshot is taken when editing starts, and another when you lock it.
- **New bookmarks** from Chrome show up where Chrome has them.
- **Layout schema 3:** older layouts and backups migrate automatically.

## 0.2.1 (build 4)
- **Links open in a new tab.** The dashboard stays where it is, and sites aren't told where you came from (`noreferrer`). With the dashboard staying put, the rain no longer sits frozen while the next site loads.
- **Site icons:** each link shows its site's icon from Chrome's own icon cache, through the bridge, sharp on high-density screens.
- **CHROME NEW TAB** opens Chrome's own New Tab page, with your bookmarks bar, to edit there. **EDIT BOOKMARKS** opens the Bookmark manager. Both open in a new tab.
- The deck is titled **NAV**.
- **Smaller, crisper type:** tiles and rows use 12 px titles and 10 px hosts. The deck and toasts are centred without transforms, so text sits on whole pixels.
- **One dashboard per window:** with the dashboard already open, a new tab switches back to it and closes itself. Chrome's own New Tab page is the CHROME NEW TAB button.
- **Bridge 1.1.0** adds the `favicon` permission and opening those two Chrome pages. It also gets host permission for the dashboard's address, so it can find an open dashboard tab and see no other tab's address. SYSTEM offers the update, and the deck shows an UPDATE BRIDGE chip until it's installed.

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
