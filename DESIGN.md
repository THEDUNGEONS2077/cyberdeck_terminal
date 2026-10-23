# Design

## Origin
The design system comes from **quest_log_desktop**: `src/styles/theme.css` was copied, and the components come from its `app.css`. Its rules hold here.

- **Colour.** Green on black. Brightness shows importance: `--text-dim`, then `--text`, then `--accent`, then `--text-bright`. Every text colour passes WCAG AA on every background.
- **Type.** One family, JetBrains Mono. Labels and headings are UPPERCASE with 0.5–1.5 px letter-spacing.
- **The one effect** is a soft green glow, used for state: focus, selection and the brand. It's never decoration.
- **Motion** moves `transform` and `opacity` only. Endless loops use `animation-play-state: var(--loops)`, so Reduce Motion pauses them. Prefer a one-shot accent to a loop: a running loop makes the page draw every frame, and costs more the more bookmarks are on it.
- **Icons** are text glyphs (`src/app/glyphs.ts`), not images.
- **Components** use tokens only, never raw colours. That includes the wallpaper engine, which reads its palette from the tokens.

## The wallpaper's look
Reference: `wallhaven-01ye3v2.jpg`, a dense matrix rain. Measured from it, at 1920×1080:

| Property | Reference | How it's matched |
|---|---|---|
| Columns | About 280 across, about 7 px each, in several depths | Three layers: 7 / 10 / 14 px pitch, far to near, with denser, dimmer layers at the back |
| Brightness down the screen, green channel by eighths | 21 22 20 19 17 15 13 7 | 23 22 20 18 16 15 12 4 (`END_BIAS`, `TRAIL_SECONDS`, `.wallpaper-floor`) |
| Body glyphs | Muted green, about rgb(70,101,70) | `--text` / `--text-dim`, desaturated 50% (`BODY_DESATURATE`) |
| Heads | Pale, nearly white, glowing | `--text-bright` with an `--accent` glow, on some drops only (`headChance`) |
| Haze | A faint green wash, even down most of the screen | `.wallpaper-haze` (`--accent-05`) |

To re-measure, screenshot the page at 1920×1080 with the UI hidden. Then compare the average brightness of each eighth of the height with the reference.

**The glow** (SYSTEM ▸ WALLPAPER ▸ GLOW; user request 2026-10-22: more glow). The table above is LOW.

| Level | Glow colour (`--accent` alpha) | Heads: blur × layers | Bodies: blur | Mean green, top half, against 0.4 |
|---|---|---|---|---|
| LOW | 0.4 | 5 px × 1 | 2 px | +4% (the look before 0.5) |
| MEDIUM | 0.65 | 7 px × 2 | 3 px | +29% |
| HIGH (default) | 0.8 | 9 px × 2 | 5 px | +43% |
| MAX | 0.9 | 12 px × 3 | 6.5 px | +60% |

- A head's glow stays behind it as it moves on and fades with the trail, so lit trails glow as soft streaks, more so at each level.
- When a glyph changes in place, only its own shape is cut out before the new one is drawn. The glow around it stays continuous: clearing whole cells left dark boxes in it.
- The glyphs stay legible at every level; the bottom still thins out to black.

## The bookmarks deck
- **Header bar:** titled **NAV**, in the desktop's centre-header look (scanlines, phosphor, a lit rule underneath).
  - A soft band of light sweeps across it once when NAV appears, and again each time the layout is locked (the brand panel's refresh band, turned sideways). It never loops.
  - It holds the bridge buttons (CHROME NEW TAB ↗, BOOKMARK MANAGER ↗) as 24 px `.small-btn`s, then EDIT.
  - It shows the source: `● LIVE`, `SYNCING…`, or `COPY <date> · GO LIVE`.
- **Small and crisp** (user request 2026-10-22): titles are 12 px (`--fs-meta`) and hosts 10 px (`--fs-micro`). Nothing holding text is centred with a transform, which can put glyphs on half pixels.
- **The bar's own links** are tiles in an auto-fill grid (152 px minimum, 40 px tall). Each shows the site's 16 px icon (with the bridge), or an accent `›` without one, then the title, with the host dimmed underneath. Hover and focus light the frame with `--glow-faint`.
- **Folders** are cards in a second grid. The heading has a turning caret, `▤`, the title (uppercase) and a link count. Contents fold with the desktop sidebar's grid-row fold (`--base`, `--ease-fold`). Nested folders hang off a tree line, and rows light like a selected row (an inset accent edge).
  - An open folder drops down in place, one link per row (user's choice, 2026-10-23: a full-width card with its links in columns read as a row, not a list). The cards below it glide to their new places.
- **Un-openable links** (chrome://, bookmarklets) use `--text-dim`, with a dashed frame on tiles. They're never dimmed with opacity, so text still passes AA.
- **Surfaces are solid.** The rain shows only in the gaps between pieces, and there's no backdrop blur, which would re-blur the animating canvas every frame.

## Principles (UX pass, 2026-10-22)
- **System status is always true.** The brand's status line shows the real link to Chrome, NAV's header shows LIVE / SYNCING / COPY, and new bookmarks are lit as they arrive (`.fresh`, 4 s).
- **Title and state on the left, actions on the right** (NAV's header). EDIT comes last. Anything that opens elsewhere carries ↗.
- **Motion explains change.**
  - Rearrangements glide: FLIP (`app/deck/useFlip.ts`), 220 ms with the out-cubic ease, transforms only.
  - New items fade in, and the UI fades in after the rain.
  - Nothing moves with Reduce Motion.
  - No glide runs while a drag is in progress; the drop settles.
- **Feedback for every action.**
  - Hover and focus light the frame and a 2 px left edge, and a press washes `--accent-10`.
  - A dragged item dims to 35% in place; drop targets are a glowing line, or a tinted dashed zone for an empty section or the tray.
- **The keyboard is a first-class path.** Every drag has a ⋯ or grip equivalent. Focus follows the moved item. Changes are announced (`.sr-only` live region).
  - **`/` finds** (the command-palette pattern): type a few letters of any bookmark, at any depth, and Enter opens the best match, chosen already. Matched letters are lit. Commands sit below the links. Esc clears, then closes.
  - **Arrow keys** move between tiles, folder headings, links and area headings: ← → in reading order, ↑ ↓ to the nearest item above or below.
- **Small and crisp.** Titles are 12 px, hosts 10 px, and nothing holding text is placed with a transform at rest.

## Edit mode
- **Unlocked:** the header and edit bar frames turn dashed and lit (`--accent-35`), and the edit bar carries a breathing `●`. Tiles and cards get dashed frames, a grab cursor and a `⋯` button.
- **Areas** are section bars with scanlines. In edit mode the title becomes a field, with a `⠿` grip and `✕`.
- **Drops:** a 2 px `--accent` line with `--glow-bright` marks the gap, or a lit outline marks an empty section or the tray. A small label follows the pointer.
- **Destructive actions** (delete area, CHROME ORDER) confirm inline with a `danger` button, and are undoable.

## The UI over the wallpaper
- **The HUD.** The brand panel (the desktop's `.masthead`: scanlines, corner brackets) sits top left. The key hints (`[F] FULLSCREEN`, `[S] SYSTEM`) sit bottom right, and both are buttons.
- **Panels** sit on solid `--surface` / `--surface-raised`, so text never sits directly on the rain.
- **Immersive mode** fades the whole UI layer out over `--slow` with the exit curve.
