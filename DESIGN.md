# Design

## Origin
The design system comes from **quest_log_desktop**: `src/styles/theme.css` was copied, and the components come from its `app.css`. Its rules hold here.

- **Colour.** Green on black. Brightness shows importance: `--text-dim`, then `--text`, then `--accent`, then `--text-bright`. Every text colour passes WCAG AA on every background.
- **Type.** One family, JetBrains Mono. Labels and headings are UPPERCASE with 0.5–1.5 px letter-spacing.
- **The one effect** is a soft green glow, used for state: focus, selection and the brand. It's never decoration.
- **Motion** moves `transform` and `opacity` only. Endless loops use `animation-play-state: var(--loops)`, so Reduce Motion pauses them. Prefer a one-shot accent to a loop: a running loop makes the page draw every frame, and costs more the more bookmarks are on it.
- **Icons** are text glyphs (`src/app/glyphs.ts`), not images.
- **Components** use tokens only, never raw colours. That includes the wallpaper engines, which read their palette from the tokens.
- **Palettes** (SYSTEM ▸ APPEARANCE ▸ DASHBOARD COLOURS and WALLPAPER COLOURS, chosen apart; `src/lib/palettes.ts`): PHOSPHOR (the original green), AMBER, ICE, NEON, BLOOD, AZURE (deep blues). A palette sets only the base tokens (`--bg`, the surfaces, `--line`, `--line-lit`, `--xp-wash`, the four text tones, `--accent-deep`, and `--cool`, a contrasting hue for two-tone wallpapers). Every glow, tint, rule and scanline is mixed from those in theme.css (`color-mix`), so nothing stays green. Each palette keeps the colour rule above, and a unit test checks it (dim, text, accent and bright text at 4.5:1 or better on the background and both surfaces; bright text on the wash). The swatches in SYSTEM preview each palette in its own colours.

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

## The neural net's look
Reference: `neural net pape.jpg`, a plexus: glowing nodes joined by long thin lines, with out-of-focus particles, a deep teal sky and a strong red glow rising from the bottom right. Measured from it, at 1920×1080:

| Property | Reference | How it's matched |
|---|---|---|
| Nodes | About 100 visible; cores about 2 px; a few bigger hubs; more on the right half | 26 per million px² over an area 14% past every edge, half scattered and half round four loose clusters; hubs (up to 9 links) are the biggest |
| Links | Long, straight, 1 px; most faint, a few bright; they cross and run off the screen | Each node links to 2–4 (hubs more) picked at random from its nearer neighbours, up to 42% of the diagonal; longer is fainter; each link has its own brightness |
| Colour | Teal lines and nodes above, pale in the middle, red below | `--cool` (lifted towards white) to `--text-bright` to `--accent` along a diagonal weighted to the height |
| Background | Teal-navy, about rgb(16,31,44) at the top; red up to about rgb(226,2,15) in the bottom right | CSS under the canvas: `--cool` mixed into `--bg` from the top, and the `--accent` glowing from the bottom right. Matched within a few percent per sixteenth of the screen (BLOOD) in 0.6.0, then softened at the user's request (0.6.1): the corner glow is about half as strong |
| Bokeh | Soft discs, teal above, red and denser below | Soft sprites drifting upwards, brighter towards the glow |

The motion is its own (drawn on every frame the screen shows, each link at its exact opacity, so nothing steps or pops): each node drifts round its home on a slow loop (10–38 px, 26–70 s), the bokeh drift upwards, and about once a second a signal runs along one to four links and lights each node it reaches. The glow levels set the nodes' halos and a soft second stroke on the links. With BLOOD it looks like the reference; with any other palette it takes that palette's two hues.

## Velocity's look
Reference: `wallhaven-ox7v2l.jpg`, light caught in motion (a long exposure).

| Property | Reference | How it's matched |
|---|---|---|
| The bright panel | A big pale-blue panel of light leaning left, about a fifth of the width, about rgb(190, 226, 252), crisp edges, faint horizontal texture | One PALE panel: `--cool` lifted towards white (its blue kept up), soft at the edges, a faint striation, a wide faint spill of light round it |
| Red light | A translucent dark-red band in the middle, darker red beyond, strongest at the top | Three RED panels in `--accent`, faint, brighter at the top, striated |
| Streaks and lines | Thin bright red streaks across the top; long faint lines through everything | Streaks racing across (mostly near the top) with fading tails; ten long faint lines that flicker |
| The flare | A blue flare in the bottom-right corner | A soft bloom and an arc of light, breathing |
| The dark | Near-black, a little cool light on the left, a dark red haze top right | CSS under the canvas |

Everything is light, drawn additively. The motion is its own: the panels drift across at different speeds and come round again with new shapes, the streaks race, the lines flicker, the flare breathes.

## Data flow's look
There's no reference image this time (the user's choice of idea, 2026-10-23: circuit-board traces at right angles with pulses of light running along them). The look is a printed circuit board's at night:

| Part | How it looks |
|---|---|
| The board | A fine dot grid, brightest round the main chip and fading out; the `--accent` glowing softly round the main chip, `--cool` rising from the bottom left (CSS under the canvas) |
| Traces | Thin lines on the grid, straight runs joined by 45° bends. They leave the chips in parallel buses that bend like ribbons, and run off the screen. Loose traces and small buses fill the rest, ending in vias (rings) and pads (squares). About a third of them are in `--cool`, the rest warm (`--text-dim` over `--line`) |
| Chips | Dark bodies with pin stubs and a pin-1 mark. The big main chip shows its die: an inner square with a fine grid |
| Data | Packets of light running along the traces and round the bends, with a soft halo and a tail fading towards the back. A trace that just carried one keeps an afterglow; a via reached flashes; a chip glows as data arrives; now and then a whole bus fires a volley |

The glow levels set the board's soft glow and the packets' halo and head. With BLOOD it reads red and blue; with every palette it takes that palette's two hues.

## Zoom
SYSTEM ▸ APPEARANCE ▸ ZOOM (user request, 2026-10-23: zoom in, and set each wallpaper's default zoom).

| | |
|---|---|
| What it is | A wallpaper laid out as if the screen were 1/zoom as big, drawn zoom times as large: browser zoom for the wallpaper alone. Bigger glyphs, nodes, traces and chips, fewer of them on the screen; smaller and more of them below 100% |
| Steps | Chrome's own, 50% to 200%: 50 · 67 · 75 · 80 · 90 · 100 · 110 · 125 · 150 · 175 · 200 |
| Kept | Per wallpaper, with the layout and its backups: the zoom a wallpaper opens at from then on |
| Sharpness | The same at every zoom: the canvas keeps its pixels (drawn larger, not scaled up) |
| VELOCITY | Laid out in shares of the screen, so it grows its panels, streaks and flare instead (the flare and its arc about the corner); the panels keep their slant |

fluid_motion's wallpapers zoom the same way.

## Megacity's look
Reference: `IMG-20261023-WA0020_1792792421032.jpg` (the user's, 2026-10-24): a vertical cyberpunk city in blue haze at night, a figure in silhouette on a rooftop ledge looking out over it.

| Property | Reference | How it's matched |
|---|---|---|
| The haze | Azure blue at the top (#4263e9), blue-violet in the middle, violet (#735ef7) low down, a pink glow from below | `--cool` at the top, mixing towards `--accent` lower down, a glow of the accent rising from the bottom (NEON gives the reference's) |
| The towers | Tall slabs in depth, the far ones lost in the haze, the near ones dark blue, some stepping back, spires | Five layers of towers, far to near, each taking less of the haze (fog); setbacks and spires; a lit roof edge, a bright strip down some edges |
| Windows | Small dashes, mostly pale blue, some violet, a few pink and white; some towers nearly dark | A grid of dashes per tower from its seed, lit by floors, a few floors blazing; pale, violet, pink, white |
| Signs | Pink neon signs with glyphs on the middle towers, pale billboards far off | Upright and wide signs in the accent (some in the cool hue) with glyph strokes and a halo, on the middle layers where they can be seen; billboards far off |
| The foreground | A woman in silhouette on a dark ledge with a glass railing | The ledge and its railing only: the figure was left out at the user's wish (0.10.1). On a wide screen the ledge sits lower, clear of NAV |

The motion is our own, and slow: a few windows go on or off every second, each at its own moment; a sign now and then stutters like a failing tube; beacons blink on the roofs; drones cross trailing short tails; patches of haze drift. ZOOM grows the towers and windows; the ledge keeps its place.

## Horizon's look
Reference: `wallhaven-xl61ol.png` (the user's, 2026-10-26): a synthwave scene, a wireframe land running to a pink glow. Kept to its layout, without its four tilted slabs (the user's call, 0.15.1).

| Property | Reference | How it's matched |
|---|---|---|
| The land | Low-poly jagged triangles in perspective, only their edges drawn (teal, thin), dark faces, filling the bottom half; the nearest edges blurred | A field of jittered points with heights, cut into triangles whose size follows the layout (more, smaller ones zoomed out, as the other wallpapers' detail); a pinhole camera 1 unit up, the horizon at the middle; edges 0.5 CSS px from each triangle's corner weights (`fwidth`), the same width at any distance, wider and softer within a few units (the depth of field); `--cool` (SYNTH's teal) |
| The glow | A hot pink glow on the horizon, a small white core just above the middle, a tall dome of haze | The accent, as a glow and a taller dome; a white-hot core with a little bloom |
| The sky | Dark plum, darker at the corners | Dark mixes of the accent, top to bottom; a soft falloff to the corners |
| The haze | The far land lost in pink haze | The land fades by distance into the very same haze the sky draws (one function in both shaders, bloom and corners included, so there's no seam) |

The motion is our own, and slow: the camera glides forward (0.45 units a second), so the hills roll toward you without end. Nothing else moves, so the sky is drawn once (0.15.1, for smoothness: "detail can be lowered"). ZOOM narrows the view and widens the lines. SYNTH (hot pink over teal) was added for it; every palette makes its own HORIZON.

## Sunset's look
Reference: `1541088888512.jpg` (the user's, 2026-10-26): the outrun sunset.

| Property | Reference | How it's matched |
|---|---|---|
| The sun | Big, on the horizon a little above the middle, golden at the top melting through orange to pink, gaps from a third of the way down widening toward the base, a magenta glow | A disc (radius 17% of the height) from `--text-bright` (OUTRUN's gold) to the accent, gaps every 0.15 of its radius from 10% to 50% wide, anti-aliased; the horizon cuts its base; the accent's glow round it |
| The sky | Night, purple on the left, blue on the right, darker up top, fine stars | The accent-and-cool mix to the cool colour across, darker up top; a star in 0.6% of 3 CSS px cells (an integer hash: no streaks), a rare bright one |
| The grid | Squares in perspective, gently rolling, pink and orange on the left, teal on the right, into pink haze at the horizon | Per pixel: the spot on the ground each pixel sees, then px to the nearest line from `fwidth` (1 CSS px lines, a soft glow), the rows waving across; far off, where squares are a few px, the lines blend into their average light; the haze a soft drift of the accent |
| The texture | CRT scanlines | A darker row every 3 CSS px |

The motion is our own, and the only motion: the grid glides toward you (0.6 units a second). Built to be as light as possible: the sky is drawn once; each frame is one short shader over the bottom 39% of the screen. OUTRUN (gold, hot pink, blue) was added for it.

## The bookmarks deck
- **Header bar:** titled **NAV**, in the desktop's centre-header look (scanlines, phosphor, a lit rule underneath).
  - A soft band of light sweeps across it once when NAV appears, and again each time the layout is locked (the brand panel's refresh band, turned sideways). It never loops.
  - It holds the bridge buttons (CHROME NEW TAB ↗, BOOKMARK MANAGER ↗) as 24 px `.small-btn`s, then EDIT.
  - It shows the source only when it isn't simply live: `SYNCING…`, or `COPY <date> · GO LIVE` (no LIVE and no link count since 0.8.1, at the user's request).
- **Small and crisp** (user request 2026-10-22): titles are 12 px (`--fs-meta`) and hosts 10 px (`--fs-micro`). Nothing holding text is centred with a transform, which can put glyphs on half pixels.
- **The bar's own links** are tiles in an auto-fill grid (152 px minimum, 40 px tall). Each shows the site's 16 px icon (with the bridge), or an accent `›` without one, then the title, with the host dimmed underneath. Hover and focus light the frame with `--glow-faint`.
- **Folders** are cards in a second grid. The heading has a turning caret, `▤`, the title (uppercase) and a link count. Contents fold with the desktop sidebar's grid-row fold (`--base`, `--ease-fold`). Nested folders hang off a tree line, and rows light like a selected row (an inset accent edge).
  - An open folder drops down in place, one link per row (user's choice, 2026-10-23: a full-width card with its links in columns read as a row, not a list). The cards below it glide to their new places.
- **Un-openable links** (chrome://, bookmarklets) use `--text-dim`, with a dashed frame on tiles. They're never dimmed with opacity, so text still passes AA.
- **Surfaces are solid.** The rain shows only in the gaps between pieces, and there's no backdrop blur, which would re-blur the animating canvas every frame.

## Principles (UX pass, 2026-10-22)
- **System status is always true.** NAV's header says when the bookmarks aren't live (SYNCING / COPY); the brand panel shows only the time (left) and date (right), and new bookmarks are lit as they arrive (`.fresh`, 4 s).
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

## Modules
- **A module is a panel like NAV's:** a solid frame with scanlines and phosphor, a header with `> TITLE` and a short dimmed note on the right, and a lit rule under it.
- **UI SCALE** (0.17.0): the whole UI (not the wallpaper) is drawn with CSS `zoom` on `#root`, a real relayout, so text stays crisp at any step; TEXT SIZE scales the type tokens alone (`--text-scale`). Panels keep their places as shares of the window, so a much bigger UI can make them overlap: move them in edit mode.
- **A 9 px floor** (0.14.0): the small sizes (`--fs-meta`, `--fs-small`, `--fs-micro`) never go below 9 px in a module; 70% of them was 7–8 px, too small to read.
- **Drawn at 70%** (user request, 2026-10-24; SYSTEM ▸ MODULE SIZE changes it since 0.17.0): `.module` sets the type, spacing and control tokens again, scaled (`--m`, from `--module-scale`), and draws its stored width as `--mw`. No `zoom` or transform of its own, so its grips measure what's drawn. What you click keeps WCAG 2.2's 24 px target (buttons, grip, ⋯, the fold heading). The brand panel and NAV keep their sizes.
- **Bare modules** (SEARCH, QUICK LAUNCH): no header outside EDIT; the frame is only a 3 px scanlined ring round the field or the tiles.
- **In EDIT** its frame turns dashed and lit, as NAV's does. It gets a `⠿` grip on the left, a `⋯` on the right and a resize edge down its right side. Its contents dim and rest: nothing opens mid-arrangement.
- **Where they go:** down the right-hand side, beside NAV. In a narrow window, they stack under NAV.
- **SEARCH:** the field alone, solid, lit on focus like the finder's; the engine is in its placeholder.
- **QUICK LAUNCH:** tiles with the icon and the title in bold (no address), lit along the top on hover. The first nine carry their key in a `kbd` in the corner.
- **TIME:** a terminal readout. The clock is large and bright (tabular figures). Countdowns are rows of label · dotted rule · value. Under them, `▸ TIMER · STOPWATCH` folds the timer and stopwatch open, with the folders' fold. A countdown due today, or a finished timer, is lit in the accent.
- **Names only, everywhere** (user request, 2026-10-24): tiles, folder rows, QUICK LAUNCH and the finder show a bookmark's name, never its address (it's in the tooltip).
- **The brand panel is optional:** in EDIT its corner holds the grip and a ⋯ (REMOVE); + MODULE ▸ BRAND PANEL brings it back.

## The UI over the wallpaper
- **The HUD.** The brand panel (the desktop's `.masthead`: scanlines, corner brackets) sits top left, compact (since 0.8.1: the name at half the title size, 11 px; the panel about 30% smaller; the time on the left and the date on the right). The key hints (`[F] FULLSCREEN`, `[S] SYSTEM`) sit bottom right, and both are buttons.
- **Panels** sit on solid `--surface` / `--surface-raised`, so text never sits directly on the rain.
- **Immersive mode** fades the whole UI layer out over `--slow` with the exit curve.
