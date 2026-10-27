# How we work

How this project is built: the user's method, their bar for speed and battery, and the look they want. Each rule names the decision it came from, so it can be weighed rather than just followed. Read it with [CLAUDE.md](CLAUDE.md) (the hard rules), [ARCHITECTURE.md](ARCHITECTURE.md) and [DESIGN.md](DESIGN.md).

Its sister project, **fluid_motion** (`~/projects/fluid_motion`), is the Android app that runs these wallpapers on the user's phone. Its own WORKING.md covers the phone; the shared parts are written the same way in both.

## The method
- **One phase at a time, planned first.**
  - **The plan:** a numbered phase list (C1–C4, then C6–C10) is agreed with the user before building.
  - **The order:** they pick the order, and each phase ships as its own release.
  - **The agreed roadmap from 2026-10-27:**
    - C6: review fixes;
    - C7: optimization;
    - C8: visual pass;
    - C9: layout profiles, switched by hand;
    - C10: a new wallpaper.
- **Wallpapers start from a reference image** the user supplies (a wallhaven picture, a phone screenshot).
  - **Match it closely.** Measure it (brightness by eighths, colours, sizes), match it, and say in DESIGN.md how each property was matched.
  - **Keep its layout exactly.** "Keep the layout of the reference image, try to match it exactly" (HORIZON, 0.15.1).
  - **Leave out only what the user asks to drop** (HORIZON's slabs, MEGACITY's figure).
  - **A palette can be made for a wallpaper:** BLOOD (NEURAL NET), AZURE (ORBIT), SYNTH (HORIZON), OUTRUN (SUNSET). Every wallpaper still works with every palette.
- **Screenshots, then the user's tweaks.**
  - **My checks:** screenshot what I build (Playwright on the built page) and look at it before asking the user. Crop and boost the contrast to find seams and banding: a blurred, eight-times-brightened copy shows a line the eye only half sees.
  - **The user's checks:** they look at the live page and send screenshots back. Their words are the spec: quote them in CHANGELOG and DESIGN.md.
- **Web first, then the phone.** A wallpaper is built and tuned here, then ported to fluid_motion once the user is happy with it (HORIZON and SUNSET, fluid_motion 0.8.0). Its shaders are then **one set, byte for byte** (MEGACITY's `mc_*`, HORIZON's `hz_*`, SUNSET's `ss_*`), so a change to one is made to both. Anything the phone does differently goes through uniforms.
- **Ask before anything public:**
  - every `npm run deploy`;
  - every push;
  - any new repo.

  Committing locally is fine. After a deploy, confirm the live site serves the new build (poll its scripts for the version).
- **A review before planning.** When work happened in another session, catch up from git (log, diff, tests) and review it before planning the next steps.

## Speed and battery: the bar
The user's PC is fast (an Intel Core Ultra 7), so the web keeps full fidelity, but smoothness comes first. "It's running very poorly … optimize thoroughly … aim for maximum smoothness, sharpness yes but detail can be lowered" (HORIZON, 0.15.1). Smoothness, then sharpness, then detail.

- **Measure before and after, and report the numbers.**
  - **Tools:** `npm run e2e:perf` (startup), `npm run e2e:motion` (frames), and fps from a scratch Playwright run on the built page.
  - **A/B:** compare against a copy of the previous build in a scratch `git worktree`.
  - **Timing:** use timestamps taken in the page; Playwright-side timing is skewed while the page is busy (0.3.1).
- **Nothing runs while it can't be seen.**
  - **Wallpapers:** they stop while the tab is hidden.
  - **Clocks:** TIME and CLOCK tick only while the page is visible and not immersive. They read the time once per change, never on a loop.
  - **No endless CSS animations:** they made Chromium redo work every frame, more so the more bookmarks there were (0.5.0). Use one-shot accents.
- **Draw only what changes, but cache only what's costly.**
  - **Cache:** MEGACITY's city is drawn once a second and copied (web 0.13.1, phone 0.7.0). On the S25 Ultra that took a frame's graphics work from 5.09 ms to 0.93 ms.
  - **Draw once and keep (web only):** HORIZON's and SUNSET's skies, because a browser canvas keeps its picture.
  - **Don't cache (on the phone):** reading a kept picture back every frame costs more battery than the sky's few sums.
- **No WebGL multisampling** (`antialias: true`). It smoothed HORIZON's outlines but made it "very laggy and choppy" on the user's machine (0.17.4, reverted in 0.17.5). Smooth lines in the shader instead (below), which costs almost nothing.
- **Wallpapers run in a worker,** on an OffscreenCanvas, off the page's main thread (0.5.0).
- **Pixel caps and a sharpness guard.**
  - **The cap:** draw at the screen's own pixel ratio, up to 3.
  - **The guard:** steps back to the wallpaper's safe cap when its frames are slow (0.14.0, `lib/sharpness.ts`).
  - **Frame rate:** about 72 frames a second at most.
- **Startup stays tiny.** The first chunk is the wallpaper alone. The app loads beside it, its chunks loaded together, not lazily: lazy module kinds made a first visit 130 ms slower (0.11.0).
- **Lessons kept:**
  - copying a canvas onto itself copies it whole (use a second canvas);
  - clearing a glyph's cell punches dark boxes in its glow (erase by the glyph's own shape);
  - a canvas `filter` blur measured slower than per-glyph `shadowBlur`.

## The look the user wants
- **Seamless and smooth.**
  - **No visible cuts, bands or lines anywhere**, in gradients, horizons or fades:
    - "it needs to be a seamless and smooth gradient from black bottom to greenest top" (the rain, 0.17.6);
    - "get rid of that line completely" (SUNSET, 0.17.3).
  - **How to get it:** curves with no corners (smooth over the full height, a stop at least every 10%, no ending at a fixed point); blend the ground into the sky's own colour; dither faint gradients.
- **Glowing, smooth lines.**
  - **"Smooth glowing lines"** (SUNSET's grid, 0.17.3) and **"glow more … a bit smoother"** (HORIZON, 0.17.4).
  - **How:**
    - measure a pixel's distance to a line from the gradient's length, not `fwidth` (which thins slanted lines into steps);
    - draw a soft bell-shaped core with a Gaussian glow around it;
    - fade crowded far lines into their average light rather than letting them shimmer.
- **A minimal HUD.**
  - **NAV:** no LIVE or link count in its bar (0.8.1).
  - **The brand panel:** compact (0.8.1) and optional (0.13.0), with the time on the left and the date on the right.
  - **Modules:** SEARCH and QUICK LAUNCH bare outside EDIT.
- **Names, never addresses:** tiles, folder rows, QUICK LAUNCH and the finder show a bookmark's name (0.13.0).
- **Small and crisp on the web.** 12 px titles and 10 px hosts. Nothing holding text is placed with a transform, so text stays on whole pixels. Modules are drawn at 70% (0.13.0), with a 9 px floor on their small text (0.14.0).
- **The user zooms the dashboard** (about 175%). UI SCALE gives the dashboard its own size, apart from quest_log_desktop's shared Chrome zoom (0.17.0). Wallpapers ignore Chrome's zoom too (0.17.1).
- **Folders open as dropdown lists**, one link per row, never spread across in columns (0.5.1).
- **Links open in a new tab** (`target=_blank rel="noopener noreferrer"`), so the dashboard never navigates away (0.2.1).
- **Colours only from the palette.** Every palette passes the contrast test; a new one is added only with it.

## The quality bar
- **Comments are required:**
  - a file header (its purpose and layer);
  - a doc comment on every export;
  - a *why* comment on non-obvious logic.

  Plain words, short sentences.
- **The layout is always recoverable.**
  - **A shape change** bumps the schema, with a migration step and a fixture test of a real older layout.
  - **New prefs** are normalized with their defaults instead.
  - **Damaged data** is kept, never written over.
- **Accessibility:**
  - axe stays clean (WCAG 2.2 A/AA);
  - every drag has a keyboard path;
  - changes are announced;
  - click targets keep 24 px;
  - Reduce Motion is honoured.
- **Verification for each change:**
  - `npm run check` (typecheck, lint, unit tests) before every commit;
  - `npm run build && npm run e2e` (the browser walk, with screenshots) for anything on the page;
  - `npm run e2e:bridge` for the bridge;
  - the perf and motion runs for speed work.
- **Servers** run on 127.0.0.1 only. Stop each one by its PID, check with `ss -ltnp`, and tell the user about any port that was opened.
- **Downloaded files are untrusted:** give each its own directory, and run any Python that reads them with `-I`.
