# cyberdeck_terminal: notes for Claude Code

Read [WORKING.md](WORKING.md) (how we work: the user's method, the speed and battery bar, the look they want), [ARCHITECTURE.md](ARCHITECTURE.md) (layers, storage, wallpapers) and [DESIGN.md](DESIGN.md) (tokens, each wallpaper's look) first.

## What this is
A terminal/cyberdeck start page: a **webpage** the user sets as Chrome's homepage and startup page. No install is required. The optional **bridge extension** (`bridge/`) provides live bookmarks (no web API can read them) and a New Tab override (Chrome won't take a URL for New Tab). Without it, an imported `bookmarks.html` copy stands in.

## Rules
- **Comments are required.** Every file gets a header comment (its purpose and layer). Every export gets a doc comment. Non-obvious logic and each shell-script step get a short *why* comment.
- **TypeScript** is `strict` with no `any`. ESLint includes the React Compiler rules: no `setState` in effects, and no refs or impure calls (`Date.now`) during render.
- **Imports go downward:** `app` → `store` → `lib`. `wallpaper/` is canvas code (no stores). `lib` stays pure: no React, no browser APIs.
- **Colours come from the palette.** theme.css's base tokens are set per palette (`src/lib/palettes.ts`); everything else is mixed from them with `color-mix`. Never write a raw colour in CSS or components (a swatch previewing another palette is the only exception). A new palette must pass the contrast test in `src/__tests__/appearance.test.ts`.
- **Wallpapers run in a worker** (`wallpaper/worker.ts`, on an OffscreenCanvas; on the page only as a fallback). Engine code may use only what a worker has: OffscreenCanvas, the font set, `requestAnimationFrame`. No `document`, no DOM. The page knows wallpapers by `wallpaper/catalog.ts`; their engines are in `registry.ts`. Tests read the canvas through `window.__cyberdeckRain` (the page can't read a canvas it handed to a worker).
- **Some shaders are shared with fluid_motion** (`~/projects/fluid_motion`, the Android port), byte for byte: MEGACITY's (`assets/shaders/mc_*` there), HORIZON's (`hz_*`), SUNSET's (`ss_*`) and NEURAL NET's fragment shaders and colour (`neural-net/shaders/link.frag`, `spark.frag`, `shade.glsl` = `neural_link.frag`, `neural_spark.frag`, `neural_shade.glsl`; the web's vertex shaders are its own). A change to one of them is made to the other in the same step, and fluid_motion's shader check is run. What the phone does differently goes through uniforms, never a different shader.
- **Smoothness first** (WORKING.md): measure before and after any speed work; nothing ticks while unseen; no WebGL `antialias` (multisampling made HORIZON laggy, 0.17.5); smooth lines and gradients in the shader or CSS, never a visible seam.
- **The layout must always be recoverable.**
  - Everything about the arrangement lives in the versioned layout document (`src/lib/layout.ts`).
  - A shape change bumps `LAYOUT_SCHEMA_VERSION` and adds a step plus a fixture test in `src/lib/migrations.ts`.
  - Never write over data you couldn't read: keep it under `corrupt.*`.
- **Shared origin.** quest_log_desktop is served from the same origin, `thedungeons2077.github.io`. Use only the IndexedDB database `cyberdeck_terminal` and the cache prefix `cyberdeck_terminal-`, and never touch the other app's storage.
- **No network code and no analytics.** The page is static files.
- **Arranging:** everything goes through `lib/arrange.ts` and `lib/modules.ts` (pure, tested) and `editStore.apply` (undoable). Drags need a keyboard alternative (the ⋯ menu, or grip arrow keys).
- **Modules** (`app/modules/`): a new kind gets a case in `lib/modules.ts`, its rules in a pure `lib/<kind>.ts`, an entry in `app/modules/catalog.ts`, and a file exporting `Panel` and `Settings` (loaded with the app: see catalog.ts for why not lazily). Nothing in a module may loop or tick while it can't be seen.
- **Startup:** keep `src/main.tsx` tiny (styles + wallpaper only); the app loads as a separate chunk.
- **Links open in a new tab** (`target=_blank rel="noopener noreferrer"`): the user's choice, 2026-10-22.
- **The bridge:**
  - Never change the `key` in `bridge/manifest.json`. It fixes the extension id (`BRIDGE_ID` in `src/bridge/client.ts`), and a unit test checks the two match.
  - Bump `version` in the manifest and `BRIDGE_VERSION` together; SYSTEM then offers the update.
  - Keep the bridge read-only, limited to the bookmarks bar, and limited to the callers in `externally_connectable`.
  - Its only host permission granted at install is the dashboard's (used to find an open dashboard on New Tab; Chrome grants it as the whole site, `thedungeons2077.github.io`). Any other site is only an `optional_host_permissions` entry, granted per site by your click in the bridge's own window (SWITCH TO OPEN TAB, `bridge/grant.html`) and given back when no link needs it. Don't widen the granted one, and don't add `tabs`.
- **Servers:** start `serve` directly (not `npx serve`), on 127.0.0.1 only. Stop it by PID, and check with `ss -ltnp`. The e2e script already does this.
- **Deploying is public.** Ask the user before every `npm run deploy`, and before creating the GitHub repo.

## Commands
```bash
npm run dev                         # Vite dev server on 127.0.0.1 (stop it when done)
npm run check                       # typecheck + lint + Vitest (must pass before every commit)
npm run build && npm run e2e        # the browser walk; screenshots in e2e/screenshots/
npm run e2e:bridge                  # Pages build + Chromium with the real bridge loaded (needs `npx playwright install chromium`)
npm run build && npm run e2e:motion # smoothness: frame gaps, script time, load stalls
npm run build && npm run e2e:perf   # opening (first and repeat visits, 120 ms network delay), uncapped rain, big layout, drag on a big bar
CYBERDECK_BASE=/cyberdeck_terminal/ npm run build && CYBERDECK_BASE=/cyberdeck_terminal/ npm run e2e   # the Pages build at its sub-path
npm run deploy                      # all of the above, then publish to GitHub Pages (ask first)
```

## Releasing
1. Bump `version` in `package.json`.
2. Add a `## x.y.z (build N)` section at the top of `CHANGELOG.md`, with N one more than before.
3. Commit.
4. Run `npm run deploy`, with the user's OK.
