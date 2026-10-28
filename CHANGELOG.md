# Changelog

## 0.19.0 (build 35)
- **NEURAL NET has no floating circles any more.** The soft, faint discs that drifted up behind the net are gone, at your request (on the phone too, in fluid_motion). The nodes, links, signals and glow are unchanged.
- **A module's own sizes are simpler.**
  - **One SIZE instead of two:** a module's UI SCALE and MODULE SIZE both just made it bigger or smaller, so they're one **SIZE** now (40–200%), beside **TEXT SIZE**.
  - **DASHBOARD | OWN:** each has a switch. **DASHBOARD** follows SYSTEM ▸ APPEARANCE and shows its value. **OWN** shows − + RESET, starting from the dashboard's value.
  - **No more undoing itself:** in 0.18.0, stepping a size onto the dashboard's value quietly switched it back to following the dashboard. OWN now stays OWN until you pick DASHBOARD.
  - **Your layout:** a module that had its own sizes keeps the same size on screen. Its old UI SCALE and MODULE SIZE become its SIZE, and its TEXT SIZE is kept.
- **Layout schema 6.** Layouts and backups from 0.18.0 and earlier open as they were, as described above.
- **The clocks** (TIME, CLOCK) read the time just after they appear rather than during it (a code-quality fix; no visible change).

## 0.18.0 (build 34)
- **New CLOCK module** (+ MODULE ▸ CLOCK): a big clock with the date under it.
  - **Size:** it fills the module's width, so dragging its right edge makes the clock bigger or smaller.
  - **SETTINGS:** 24- or 12-hour time, seconds shown or hidden, and the date shown or hidden.
  - **Battery:** like TIME, it ticks only while you can see the page (once a minute with seconds hidden).
- **Every module has its own sizes now.**
  - **The three sizes:** each module's ⋯ ▸ SETTINGS has its own **UI SCALE**, **TEXT SIZE** and **MODULE SIZE**.
  - **Default:** each one starts as **· DASHBOARD**, following SYSTEM ▸ APPEARANCE.
  - **Changing one:** pressing − or + gives that module its own value, and the dashboard's setting no longer affects that size for it.
  - **Going back:** **DASHBOARD** makes it follow the dashboard again.
  - **Applies to:** SEARCH, QUICK LAUNCH, TIME and CLOCK. Changes are undoable and are saved in snapshots and backups.
- **Layout schema 5.** Saved layouts and backups from before open as they were, with every module following the dashboard.

## 0.17.6 (build 33)
- **MATRIX RAIN is one smooth gradient now,** greenest at the top and black at the bottom, with no line across the screen.
  - **Why there was a line:** the dark floor covered only the bottom 16%, so the point where it started showed as a straight edge between the middle and bottom of the screen. The green haze's gradient also had corners (at about half and 95% of the way down) that showed as fainter lines.
  - **Now:** both run the full height of the screen along smooth curves. The haze fades from greenest at the top to nothing at the bottom, and the darkening starts gently near the top and deepens to black at the bottom edge.
- **SUNSET's stars** are set up to come out the same on phone graphics chips (no change you'll see here).

## 0.17.5 (build 32)
- **HORIZON is smooth again.** The anti-aliasing added in 0.17.4 made it laggy, so it's off. The stronger glow, the even, smooth lines and the gentler hills all stay. Only a near hill's outline over the land behind is a little stepped again, as it was before.

## 0.17.4 (build 31)
- **HORIZON:**
  - **The hills glow more:** each edge has a soft core and a wider, stronger glow, at every GLOW level.
  - **Smoother hills:**
    - **Lines:** they're the same width at every angle, so slanted ones no longer step.
    - **Outlines:** the outline of a near hill over the land behind is anti-aliased (the browser's multisampling).
    - **Peaks:** the sharpest spikes are a little lower, while the land keeps its low-poly look.
  - **Speed:** the multisampling costs extra GPU work. If HORIZON feels less smooth than before, say so and it can come off.

## 0.17.3 (build 30)
- **SUNSET:**
  - **No line at the horizon:** at the horizon the ground now takes on the sky's own colour, glow and all, so the grid fades straight into the night with nothing in between. The pink haze band is gone.
  - **Smooth, glowing grid lines:** each line now has a soft core and a smooth glow, the same width at every angle. Slanted lines no longer step.

## 0.17.2 (build 29)
- **SUNSET's horizon is seamless now.** The far grid used to pile up into a thick, bright band of thin lines under the sun. Now the lines thin out and fade into the dark ground as they reach the distance, and the pink haze is a soft, narrow seam right at the horizon. The band is gone; what's left is a short, dim fade (about a third of the old band's height and much darker), with no lines crowding into it.

## 0.17.1 (build 28)
- **The wallpapers ignore Chrome's zoom too** (with SYSTEM ▸ CHROME ZOOM on IGNORE, the default). Each wallpaper now looks exactly as it does at 100%, whatever zoom you've set for quest_log: the same size, detail and sharpness, filling the window. SYSTEM ▸ ZOOM still zooms a wallpaper as before.
- **APPLY** brings back the old behaviour for both the dashboard and the wallpaper.

## 0.17.0 (build 27)
- **The dashboard's own size,** in SYSTEM ▸ APPEARANCE:
  - **UI SCALE,** 50% to 300%: the whole dashboard bigger or smaller, the wallpaper aside. It has one-press presets (75–200%), and **[** and **]** on the keyboard step it. The finder has UI SCALE BIGGER / SMALLER / 100% too.
  - **TEXT SIZE,** 80% to 150%: only the text, on top of UI SCALE.
  - **MODULE SIZE,** 50% to 100%: the modules against NAV and the panels (70%, as before, until you choose).
  - Everything is redrawn at the new size, not stretched, so text stays sharp. The sizes are kept with your layout (in backups too).
- **Zoom kept apart from quest_log:**
  - **Why they were tied:** Chrome keeps one zoom per website, and quest_log_desktop lives on the same one, so zooming either zoomed both. No page can change that.
  - **The fix:** the dashboard now works out Chrome's zoom and cancels it. Zoom Chrome for quest_log as you like, and this dashboard stays at its UI SCALE.
  - **The setting:** CHROME ZOOM shows the zoom it worked out. Choose APPLY to let Chrome's zoom work on top again.
  - **After updating:** if you'd zoomed Chrome to make the dashboard bigger (175%, say), set UI SCALE to that once.
- **COPY DIAGNOSTICS** includes the sizes and Chrome's zoom as worked out.

## 0.16.0 (build 26)
- **SUNSET wallpaper,** from your reference: the outrun sunset.
  - **The scene:**
    - a big striped sun on the horizon, golden at the top and melting to hot pink, its gaps widening toward its base, with a magenta glow;
    - a starry night sky, purple on the left and blue on the right;
    - a gently rolling square grid that glows pink on the left and blue on the right, melting into pink haze at the horizon;
    - fine CRT scanlines over it all.
  - **What moves:** only the grid, gliding toward you.
  - **Built to be as light as it gets:** the sky, sun and stars never change, so they're drawn once and kept. Each frame redraws only the ground: one short calculation per pixel, with no shapes, textures or depth. The grid lines are worked out per pixel, so they're razor-sharp at any size. Far off, where the lines crowd together, they blend into their own glow instead of shimmering.
  - **Detail follows the layout,** as the other wallpapers' does: zoomed out, more and finer squares.
- **OUTRUN palette:** a golden sun melting into hot pink, over blue, matched to the reference. Choose it under WALLPAPER COLOURS for SUNSET's own look.

## 0.15.2 (build 25)
- **Browser zoom: back to how it was before 0.15.1** (your call): the wallpapers behave as they did when you zoom the browser in and out.
- **HORIZON:**
  - **Thinner lines:** each edge is now 0.5 CSS px, with a softer glow.
  - **Polygons follow the layout, as the other wallpapers' detail does:** a bigger layout (zoomed out, in the browser or with SYSTEM ▸ ZOOM) gets more, smaller triangles; a smaller one fewer, bigger ones. At 1080 CSS px tall it's as before.

## 0.15.1 (build 24)
- **HORIZON, as you asked:**
  - **Layout:** the glow's white core now sits just above the screen's middle, and the hills fill the bottom half.
  - **No slabs:** the leaning slabs are gone.
  - **Speed:** about 3.4× less work a frame (measured the same way before and after).
    - The sky never changes now, so it's drawn once and kept, and each frame redraws only the hills.
    - The land is a third of what it was: only as far as the haze lets you see.
    - It's drawn nearest first, so hidden hills cost nothing.
    - The haze's maths runs only where the land fades into it.
- **The wallpaper at any browser zoom.** At 175% the wallpaper was laid out for a screen 1.75× too big, so you saw its top left only: HORIZON's glow sat off to the right and its hills fell off the bottom. The canvas now follows the browser's zoom, so every wallpaper looks as it does at 100%.

## 0.15.0 (build 23)
- **HORIZON wallpaper,** from your reference: a synthwave scene.
  - **The scene:** a low-poly land drawn only as teal wireframe edges, running to a hot pink glow on the horizon with a white-hot core. Its haze lights a dark plum sky, and four tilted slabs lean in toward the glow, the near pair speckled with pink light at their tops. The nearest edges are soft, as in the photo, and the far land melts into the haze.
  - **What moves:** you glide forward over the land, so the hills roll toward you without end. The glow breathes slowly and the slabs' specks twinkle.
  - **How it's drawn:** by the graphics card in the wallpaper's worker, like MEGACITY: the sky per pixel, then the land as about 32 000 triangles made once. Each frame sends only how far you've come.
- **SYNTH palette:** hot pink over teal, matched to the reference. Choose it under SYSTEM ▸ APPEARANCE ▸ WALLPAPER COLOURS for HORIZON's own look; every palette makes its own HORIZON.
- **For the phone:** HORIZON comes to fluid_motion once you're happy with it here, with the same land and shaders.

## 0.14.0 (build 22)
The polish and speed pass (C4).
- **Full sharpness on sharp screens.** On a screen scaled to 200% or more, the wallpapers now draw at its own pixel ratio, up to 3×; before, they stopped at 2× (VELOCITY 1.5×). A guard watches each wallpaper's first seconds on screen: if a frame takes more than 8 ms to draw, it steps back to the old cap and remembers that. SYSTEM ▸ APPEARANCE ▸ **SHARPNESS** shows what it draws at, with **TRY AGAIN** when it stepped back. At 100–150% scaling nothing changes.
- **COPY DIAGNOSTICS** (foot of SYSTEM): copies what this browser, screen and wallpaper are doing, to paste back while tuning:
  - the browser and GPU;
  - the screen and its scaling;
  - what the wallpaper draws at, and its recent frames;
  - startup times;
  - your layout's counts.

  It has no addresses or bookmarks, and nothing is sent anywhere.
- **Dragging snaps.** A panel you drop within 8 px of the window's edge, or of another panel's edge, settles flush: lined up, or beside it with an 8 px gap. Arrow-key nudges stay exact.
- **The finder knows the modules:** FOCUS SEARCH, START TIMER, STOP TIMER, ADD … MODULE, and SHOW THE BRAND PANEL when it's off.
- **Readable modules.** The smallest module text (the date, labels, key badges) no longer goes below 9 px. The rest stays at 70%.
- **Keyboard:**
  - The arrow keys move between QUICK LAUNCH tiles, as in NAV.
  - Esc in the search box clears it, then leaves it.
  - Tab goes brand panel, NAV, modules top to bottom, then the key hints.
- **Fixes:**
  - The finder, reopened right after running a command, showed the last search still typed; it opens empty now.
  - With the brand panel removed, the page kept no main heading for screen readers; it keeps one now.
- **Speed checked:** startup and the rain's smoothness match 0.13.1 (e2e:perf, e2e:motion).

## 0.13.1 (build 21)
- **MEGACITY is lighter on the graphics card.** The city is drawn once a second and copied in between, since it only changes when a window goes on or off. The picture is the same; windows now switch on the second's edge. The same change is in fluid_motion 0.7.0, where your phone measured the city as most of the cost.

## 0.13.0 (build 20)
- **Modules are 30% smaller:** their text, spacing and width. One you've already placed shrinks too, and keeps its place. What you click (buttons, the grip and ⋯ in EDIT) stays at least 24 px, the accessibility minimum.
- **SEARCH is just the box you type in,** with the scanlined frame as a thin ring around it. The engine is named in the box ("SEARCH DUCKDUCKGO"); Enter searches. Its title and grip show only in EDIT.
- **QUICK LAUNCH is just its tiles,** in the same thin ring: no title, no tile count.
- **TIME has no calendar.** The timer and stopwatch fold away under the clock and countdowns (**▸ TIMER · STOPWATCH**). The fold remembers whether it's open, and a running timer keeps going while folded.
- **Names only:** bookmarks, folder links, QUICK LAUNCH tiles and the finder show each bookmark's name, not its address (hover for the address).
- **The brand panel is optional,** grouped with the modules. In EDIT, its ⋯ has REMOVE, and **+ MODULE ▸ BRAND PANEL** brings it back. It keeps its size.

## 0.12.0 (build 19)
- **SWITCH TO ITS OPEN TAB:** a link can now take you to the tab it already has open, instead of opening another. Turn it on per link, from its ⋯ in EDIT. It then covers every link under the same place: quest_log's link brings its open tab to the front, wherever you left it.
  - **No tab of it open?** The link opens one, next to the dashboard, as before. A middle click, or Ctrl+click, still opens a new tab on purpose.
  - **quest_log works at once:** it's on the dashboard's own site, which the bridge can already see. **Any other site** must be allowed first. The bridge opens a small window, and Chrome asks you when you click ALLOW (Chrome calls it "read and change"; the bridge only looks for the tab and switches to it). Nothing changes until you say yes.
  - **To turn it off:** the link's ⋯ says **SWITCHES TO ITS OPEN TAB · STOP**. The bridge gives the site back once no link needs it. The places you've turned on are saved with your layout and its backups.
  - It works from tiles, folders, QUICK LAUNCH, the finder and keys 1–9.
- **Bridge 1.3.0** (SYSTEM offers the update): adds the switching. At install it still has only the dashboard's site and your bookmarks; any other site needs your yes.

## 0.11.0 (build 18)
- **Modules:** panels you add to the dashboard yourself, beside NAV. In EDIT, **+ MODULE** adds one at a free spot down the right-hand side. Move it by its grip (drag, or the arrow keys), resize it by its right edge, and use its ⋯ for SETTINGS and REMOVE. Everything is undoable, saved with your layout and in its backups, and in a narrow window the modules stack under NAV.
  - **SEARCH:** type and press Enter to search the web in a new tab, with DuckDuckGo, Google, Bing, Kagi or your own engine (any address with `%s` where the words go). The page only opens the address; it sends nothing itself. The finder (`/`) now ends with "SEARCH … FOR" whatever you typed, so `/` + words + Enter searches when no bookmark matches.
  - **QUICK LAUNCH:** big tiles for the sites you open most. Add one in its SETTINGS, or from a bookmark's ⋯ in EDIT (**PIN TO QUICK LAUNCH**); order and remove them there. Keys **1–9** open the first nine (**0** is still the wallpaper's zoom reset).
  - **TIME:** a large clock, this month's calendar with today lit, your countdowns (a label and a date: "12 DAYS", "TOMORROW", "TODAY"), a timer (25 minutes unless you set another length) and a stopwatch. A finished timer says so with a notice. It's light: it ticks only while you can see it, and only the parts that change redraw.

## 0.10.1 (build 17)
- **MEGACITY without the figure** (your call): the city is seen from the rooftop ledge alone, its glass railing now running the length of it.


## 0.10.0 (build 16)
- **MEGACITY wallpaper,** from your reference: a city of towers in blue haze at night, seen from a rooftop where a lone figure stands on the ledge, looking out over it.
  - **The city.** Five layers of towers, the far ones lost in the haze, the near ones dark; some step back to a narrower top, some carry spires. Tens of thousands of windows, lit floor by floor, a few blazing. Pink neon signs with glyphs on the middle towers, pale billboards far off. The haze turns from blue at the top to violet lower down, with a glow rising from below.
  - **The figure.** A woman in silhouette with a bob, looking down at the city, a faint rim of light along her edge; a dark ledge and a glass railing. Her outline is our own drawing of the pose. On a wide screen she stands a little smaller and lower, clear of NAV.
  - **What moves.** A few windows go on or off every second, each at its own moment; signs breathe, and now and then one stutters like a failing tube; beacons blink on the roofs; drones cross with short tails; patches of haze drift.
  - **Colours.** NEON gives the reference's; every palette makes its own city (BLOOD: steel blue with red signs).
  - **How it's drawn.** It's the first wallpaper drawn by the graphics card per pixel (WebGL 2): the whole city in one pass, every window included, so it stays smooth and light on the processor. It runs in the wallpaper's worker like the others, and zooms like them (the figure keeps her place).
- It's coming to fluid_motion next, with the same city and the same shaders.


## 0.9.0 (build 15)
- **DATA FLOW wallpaper:** a circuit board at night, with data running through it.
  - **The board.** Traces run on a fine grid in straight runs and 45° bends. They leave the chips' pins in parallel buses that bend like ribbons, and run off the screen. Loose traces and small buses fill the rest, ending in vias and pads. A big main chip with its die shows sits a little right of the middle, with smaller chips round it.
  - **The data.** Packets of light run along the traces and round the bends, trailing fading tails. A trace that just carried one keeps an afterglow; a via reached flashes; a chip glows as data arrives; now and then a whole bus fires a volley.
  - **The look in every palette.** Warm traces and packets come from the palette's accent, about a third from its cool hue: red and blue in BLOOD, green and teal in PHOSPHOR.
  - **Where it runs.** The still board is drawn once and only the light is drawn each frame. It runs in the wallpaper's worker like the others, on every frame the screen shows.
- **ZOOM, for every wallpaper** (SYSTEM ▸ APPEARANCE ▸ ZOOM: **−** · 125% · **+** · RESET).
  - **Each wallpaper keeps its own zoom,** with your layout and its backups, and opens at it from then on: the zoom you set is its default.
  - **From 50% to 200%,** in a browser's zoom steps. Zoomed in, the wallpaper is laid out as if the screen were smaller and drawn larger: bigger glyphs, nodes, traces and chips, and fewer of them. VELOCITY grows its panels, streaks and flare instead. Below 100%, everything is smaller and there's more of it.
  - **As sharp at every zoom:** the wallpaper is drawn larger, not scaled up, and its canvas keeps every pixel.
  - **Keys:** **+** and **−** zoom the wallpaper shown, **0** goes back to 100%; they work in fullscreen too. The finder has them as commands.
- DATA FLOW and ZOOM are in fluid_motion 0.5.0 too.

## 0.8.1 (build 14)
- **NAV's bar** no longer shows LIVE or the link count. It still says SYNCING… while it catches up, and COPY · GO LIVE without the bridge.
- **The brand panel** is about 30% smaller, `<cyberdeck_terminal>` is half the size, and its status line has the time on the left and the date on the right.

## 0.8.0 (build 13)
- **VELOCITY wallpaper,** animated from your reference: light caught in motion. Soft slanted panels of light (a bright pale one, dimmer red ones) drift across at different speeds and come round again, with fine motion-blur lines through them; thin streaks race past along the top; long faint lines flicker; a flare breathes in the corner. With BLOOD it has the reference's pale blue and red. It runs in the wallpaper's worker like the others.
- **ORBIT removed** (replaced by VELOCITY). A layout that had it shows MATRIX RAIN instead. The AZURE palette stays.

## 0.7.0 (build 12)
- **ORBIT wallpaper,** animated from your reference: a sunrise over the Earth seen from orbit. The planet's curved edge glows with its thin atmosphere, the sun bursts over the horizon with glare and short shimmering rays, clouds drift over the surface as the planet turns (the near ones faster), and a few stars twinkle in the dark corner. It's drawn by the graphics card (a WebGL shader) in the wallpaper's worker, up to about 72 frames a second.
- **AZURE palette:** the orbit's blues, for the wallpaper (or the dashboard). Every wallpaper still works with every palette.
- **The brand panel** shows the time and date only: no more LINK LIVE (NAV's header still shows whether the bookmarks are live).

## 0.6.1 (build 11)
- **APPEARANCE is first in SYSTEM.**
- **The dashboard and the wallpaper have their own palettes:** DASHBOARD COLOURS and WALLPAPER COLOURS are chosen apart, any with any. Your current choice carries over to both.
- **NEURAL NET's corner glow is softer:** about half as strong.
- **NEURAL NET is smoother:** it draws on every frame your screen shows (no cap, so 120–144 Hz screens get every frame); each link fades at its own exact brightness as it stretches, instead of stepping between a few levels; colours change in finer steps; and a node a signal reaches swells into light instead of popping on.

## 0.6.0 (build 10)
**A second wallpaper, and colour palettes: any palette with any wallpaper.**
- **NEURAL NET wallpaper,** animated from your reference (a plexus): glowing nodes joined by long thin links, drifting slowly round their places, with out-of-focus particles rising behind and signals running along the links that light each node they reach. A deep cool sky above, the accent glowing up from the bottom right. With BLOOD it matches the reference within a few percent, region by region. It runs in the wallpaper's worker like the rain, at about 22 ms of drawing a second (the rain: 30).
- **Palettes: PHOSPHOR** (the original green), **AMBER, ICE, NEON, BLOOD.** A palette recolours the whole dashboard (every glow, tint and rule is now mixed from its colours) and the wallpaper, rain included. Every palette passes the same readability check as the original (WCAG AA for all text), enforced by a test.
- **SYSTEM ▸ APPEARANCE** (was WALLPAPER): palette swatches, each shown in its own colours, then the wallpaper, then GLOW. All three are saved with your layout and its backups, and apply at once; a palette chosen last time shows from the first moment of the next open.

## 0.5.1 (build 9)
- **Folders drop down again:** an open folder opens in place as a list, one link per row, as before 0.5.0 (0.5.0 spread it across NAV's full width with its links in columns).

## 0.5.0 (build 8)
**Find anything, more glow, and the rain on a thread of its own.**
- **Find (`/`):** type a few letters of any bookmark, in any folder, and Enter opens the best match (in a new tab). It's chosen already, with the matched letters lit. Commands sit below the links: edit or lock the layout, SYSTEM, fullscreen, export a backup, and with the bridge Chrome's New Tab and Bookmark manager. ↑ ↓ choose; Esc clears, then closes.
- **Arrow keys** move between tiles, folder headings, the links in open folders and area headings. Home / End go to the first / last.
- **An open folder takes NAV's full width,** its links in columns, so the cards beside it no longer leave a gap under them. The cards around it glide as folders open and close.
- **NAV's header** gets a sweep of light when NAV appears and each time the layout is locked.
- **More glow: SYSTEM ▸ WALLPAPER ▸ GLOW.** LOW (close to the look before), MEDIUM, HIGH (the new default) and MAX: on screenshots, +4%, +29%, +43% and +60% brighter than 0.4. Lit trails glow as soft streaks. The setting is saved with your layout and its backups, and a change rains in without restarting the rain.
  - Glyphs changing in place no longer cut dark boxes into the glow around them: only their own shape is cut out.
- **Faster and lighter (optimization pass):**
  - **The rain runs in its own worker** (OffscreenCanvas): its fonts, sprites, pre-warm and every frame happen off the page's main thread. If a worker can't start, it runs on the page as before.
  - So the dashboard no longer waits for the rain: on a repeat open it shows in about 0.07 s (0.25 s in 0.4), and about 0.27 s on a 4× slower CPU (0.9 s). The rain shows as soon as before (about 0.15 s), and sooner on a slow CPU.
  - While you're not using it, the page does almost nothing: its main-thread script time for the rain went from about 20 ms a second to under 1, and a frame of rain no longer makes the page redo its paint steps (more work the more bookmarks it shows). The worst main-thread stall while opening went from 83 ms to 17 ms.
  - The canvas is the size of the screen: resizing the window or going fullscreen doesn't redraw it.
  - The page's own startup scripts no longer carry the rain's engine (the worker's code is inlined, no extra request), and the app's chunk is fetched with the first files.
  - NAV's sweep plays once instead of looping: a loop kept the page drawing every frame.
  - The glow's extra sprites are drawn after the rain first shows.
- Tests: the walk checks the rain runs in a worker, the still frame under Reduce Motion, and the fallback on the page; `e2e:motion` and `e2e:perf` read the rain's frames from its worker.

## 0.4.0 (build 7)
**UX and visual pass.** Audited state by state (locked, editing, dragging, the ⋯ menu, SYSTEM, laptop, phone, CONNECT) on a realistic bar.
- **The brand** reads `<cyberdeck_terminal>`, with no blinking cursor. Its status line shows the real link (● LINK LIVE / LINKING… / LINK: COPY / NO LINK), not a fixed "LINK OK".
- **NAV's header:** title, LIVE and the link count on the left; actions on the right, with EDIT last.
  - "EDIT BOOKMARKS" is now **BOOKMARK MANAGER ↗** (it sat next to EDIT and read as the same control), and both Chrome buttons carry ↗: they open a new tab.
  - The header wraps cleanly on narrow windows (it used to break "> NAV" and cut off LIVE).
- **Motion:**
  - Rearranging glides: a drop, a ⋯ move, hiding, showing, live bookmark changes, and the edit bar sliding in all move items smoothly to their new places (FLIP, transforms only; off with Reduce Motion). New items fade in.
  - The dashboard fades in after the rain instead of popping in.
- **Feedback:**
  - A bookmark that just arrived from Chrome is lit for a few seconds.
  - Hovered and focused tiles get a lit left edge (as rows and menus have), and tiles have a press state.
  - While dragging, the picked-up item dims in place, and an empty area or the HIDDEN tray lights as a tinted zone (it was a solid green block).
- **The ⋯ menu** has an icon column (← → ⇥ + ↺ ⊘) and rules between its groups (along, into, back or away).
- **Accessibility:**
  - After a ⋯ move, the keyboard follows the item to its new place (after HIDE, to its SHOW button in the tray).
  - Every rearrangement is announced to screen readers (a polite live region).
  - Tiles keep their titles clear of the ⋯ button while editing.
- **Smaller touches:** the bold font is preloaded (headings never show blank while it loads), NAV's resize edge is faint until hovered, and the edit bar says Esc locks it.
- The same speed as 0.3.1 (`npm run e2e:perf`).

## 0.3.1 (build 6)
**Fixed: new bookmarks not showing up.** Bridge 1.2.0, so update it from SYSTEM ▸ BOOKMARKS.
- **Both bookmarks bars.** When you're signed in to Chrome, it can keep two: one in your Google Account (where new bookmarks usually go) and one on this device. The bridge read only the first it found. It now shows both, account first, as Chrome's own bar does.
- **Other and Mobile bookmarks.** Bookmarks Chrome saves outside the bar now show too: OTHER BOOKMARKS and MOBILE BOOKMARKS appear as folders at the end, as Chrome's bar ends with "All bookmarks". Hide them in edit mode if you don't want them.
- **No more missed changes.** The dashboard keeps the bridge awake while you can see it, so every change arrives at once (Chrome put it to sleep after 30 s idle, and changes could then wait up to a minute). It also refreshes when its window gets the focus back.
- **SYSTEM ▸ BOOKMARKS** shows what the bridge reads: items on the bar (and how many copies), in Other and in Mobile.

**Fixed: SYSTEM could get stuck open.** Pressing S just after Esc (during the panel's fade-out) left it open without the keyboard: Esc did nothing and it blocked every click.

**Optimization pass** (measured with the new `npm run e2e:perf`):
- **Opening from the computer.** The page itself now comes from the service worker's copy, with no network round trip first. A repeat open shows rain in about 0.13 s (was 0.30 s) and the dashboard in about 0.23 s (was 0.34 s), with 120 ms network delay simulated. New versions still arrive: they install in the background and show from the next open.
- **The rain appears sooner** on every open: bright glyphs are painted first and the canvas fades in while the faint rest fills in (first visit: 120 ms, was 167 ms).
- **High-refresh screens:** the rain draws at most about 60–72 frames a second. With no frame limit, its script time fell from 75 to 19 ms per second (glyphs move at most about 22 rows a second, so faster showed nothing new).
- **Startup with a lot stored:** snapshots have an index, so startup reads it instead of every snapshot. With 27 snapshots of a 2,000-link layout, loading took 58 ms (was 203) and 281 ms at 4× slower CPU (was 906).
- **Dragging in edit mode** no longer re-renders every tile on each pointer move. The drag label and drop line move on their own layers outside NAV's scroller, and hover transitions pause while dragging. On a big bar at 4× slower CPU: median frame 16.7 ms (was 33), frames over 25 ms: 7 of 108 (was 88 of 93).
- **Smaller pieces:** folders look up their own items (no scan of the whole bar); the clock re-renders alone, with its date formatters made once; the unused Medium font weight is gone (38 KB less to download and store).

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
