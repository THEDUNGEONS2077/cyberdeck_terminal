# Changelog

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
