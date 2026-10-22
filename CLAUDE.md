# cyberdeck_terminal: notes for Claude Code

Read [ARCHITECTURE.md](ARCHITECTURE.md) (layers, storage, wallpapers) and [DESIGN.md](DESIGN.md) (tokens, the wallpaper's look) first.

## What this is
A terminal/cyberdeck start page: a **webpage** the user sets as Chrome's homepage and startup page. No install is required. The optional **bridge extension** (`bridge/`) provides live bookmarks (no web API can read them) and a New Tab override (Chrome won't take a URL for New Tab). Without it, an imported `bookmarks.html` copy stands in.

## Rules
- **Comments are required.** Every file gets a header comment (its purpose and layer). Every export gets a doc comment. Non-obvious logic and each shell-script step get a short *why* comment.
- **TypeScript** is `strict` with no `any`. ESLint includes the React Compiler rules: no `setState` in effects, and no refs or impure calls (`Date.now`) during render.
- **Imports go downward:** `app` → `store` → `lib`. `wallpaper/` is canvas code (no stores). `lib` stays pure: no React, no browser APIs.
- **The layout must always be recoverable.**
  - Everything about the arrangement lives in the versioned layout document (`src/lib/layout.ts`).
  - A shape change bumps `LAYOUT_SCHEMA_VERSION` and adds a step plus a fixture test in `src/lib/migrations.ts`.
  - Never write over data you couldn't read: keep it under `corrupt.*`.
- **Shared origin.** quest_log_desktop is served from the same origin, `thedungeons2077.github.io`. Use only the IndexedDB database `cyberdeck_terminal` and the cache prefix `cyberdeck_terminal-`, and never touch the other app's storage.
- **No network code and no analytics.** The page is static files.
- **The bridge:**
  - Never change the `key` in `bridge/manifest.json`. It fixes the extension id (`BRIDGE_ID` in `src/bridge/client.ts`), and a unit test checks the two match.
  - Bump `version` in the manifest and `BRIDGE_VERSION` together; SYSTEM then offers the update.
  - Keep the bridge read-only, limited to the bookmarks bar, and limited to the callers in `externally_connectable`.
- **Servers:** start `serve` directly (not `npx serve`), on 127.0.0.1 only. Stop it by PID, and check with `ss -ltnp`. The e2e script already does this.
- **Deploying is public.** Ask the user before every `npm run deploy`, and before creating the GitHub repo.

## Commands
```bash
npm run dev                         # Vite dev server on 127.0.0.1 (stop it when done)
npm run check                       # typecheck + lint + Vitest (must pass before every commit)
npm run build && npm run e2e        # the browser walk; screenshots in e2e/screenshots/
npm run e2e:bridge                  # Pages build + Chromium with the real bridge loaded (needs `npx playwright install chromium`)
npm run build && npm run e2e:motion # smoothness: frame gaps, script time, load stalls
CYBERDECK_BASE=/cyberdeck_terminal/ npm run build && CYBERDECK_BASE=/cyberdeck_terminal/ npm run e2e   # the Pages build at its sub-path
npm run deploy                      # all of the above, then publish to GitHub Pages (ask first)
```

## Releasing
1. Bump `version` in `package.json`.
2. Add a `## x.y.z (build N)` section at the top of `CHANGELOG.md`, with N one more than before.
3. Commit.
4. Run `npm run deploy`, with the user's OK.
