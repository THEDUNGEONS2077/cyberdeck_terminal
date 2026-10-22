# Design

## Origin
The design system comes from **quest_log_desktop**: `src/styles/theme.css` was copied, and the components come from its `app.css`. Its rules hold here.

- **Colour.** Green on black. Brightness shows importance: `--text-dim`, then `--text`, then `--accent`, then `--text-bright`. Every text colour passes WCAG AA on every background.
- **Type.** One family, JetBrains Mono. Labels and headings are UPPERCASE with 0.5–1.5 px letter-spacing.
- **The one effect** is a soft green glow, used for state: focus, selection and the brand. It's never decoration.
- **Motion** moves `transform` and `opacity` only. Endless loops use `animation-play-state: var(--loops)`, so Reduce Motion pauses them.
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

## The bookmarks deck
- **Header bar:** the desktop's centre-header look (scanlines, phosphor, a lit rule underneath). It shows the source: `● LIVE`, `SYNCING…`, or `COPY <date> · GO LIVE`.
- **The bar's own links** are tiles in an auto-fill grid. Each shows an accent `›`, the title, and the host dimmed underneath. Hover and focus light the frame with `--glow-faint`.
- **Folders** are cards in a second grid. The heading has a turning caret, `▤`, the title (uppercase) and a link count. Contents fold with the desktop sidebar's grid-row fold (`--base`, `--ease-fold`). Nested folders hang off a tree line, and rows light like a selected row (an inset accent edge).
- **Un-openable links** (chrome://, bookmarklets) use `--text-dim`, with a dashed frame on tiles. They're never dimmed with opacity, so text still passes AA.
- **Surfaces are solid.** The rain shows only in the gaps between pieces, and there's no backdrop blur, which would re-blur the animating canvas every frame.

## The UI over the wallpaper
- **The HUD.** The brand panel (the desktop's `.masthead`: scanlines, corner brackets) sits top left. The key hints (`[F] FULLSCREEN`, `[S] SYSTEM`) sit bottom right, and both are buttons.
- **Panels** sit on solid `--surface` / `--surface-raised`, so text never sits directly on the rain.
- **Immersive mode** fades the whole UI layer out over `--slow` with the exit curve.
