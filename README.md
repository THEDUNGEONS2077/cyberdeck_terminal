# cyberdeck_terminal

A terminal-style start page for Chrome. A matrix rain falls across the whole screen, and the dashboard sits on top. Your layout stays in your browser: nothing is sent anywhere.

**Live:** https://thedungeons2077.github.io/cyberdeck_terminal/ (once deployed)

## Keys
| Key | Does |
|---|---|
| **F** | Fullscreen with only the wallpaper. F or Esc comes back. |
| **/** | Find: type a few letters of any bookmark (in any folder) and press Enter to open it, or run a command. ↑ ↓ choose. |
| **S** | SYSTEM: bookmarks source, backups, restore, appearance (palette, wallpaper, glow) |
| **← ↑ → ↓** | Move between bookmarks, folders and links (Home / End: the first / last) |
| **Esc** | Closes SYSTEM or the finder |

Bookmarks open in a new tab, so the dashboard stays put. With the bridge, links show their site icons, and NAV's header has **CHROME NEW TAB ↗** (Chrome's own New Tab page, with your bookmarks bar, to edit) and **BOOKMARK MANAGER ↗**.

**Appearance** (SYSTEM ▸ APPEARANCE), all saved with your layout and its backups:
- **Palette:** PHOSPHOR (the original green), AMBER, ICE, NEON or BLOOD. It recolours the whole dashboard and the wallpaper.
- **Wallpaper:** MATRIX RAIN or NEURAL NET (a drifting network of glowing nodes and links, with signals running along it). Any wallpaper works with any palette.
- **Glow:** from LOW (the original look) to MAX. HIGH is the default.

The wallpaper runs on a thread of its own, so it never slows the dashboard down.

## Make it your start page
- **Homepage:** in Chrome Settings, go to **Appearance** and turn on **Show home button**. Choose the custom web address option and paste the page's address.
- **When Chrome starts:** in Chrome Settings, go to **On startup**, choose **Open a specific page or set of pages**, then **Add a new page** and paste the page's address.
- **New Tab and live bookmarks:** install the optional **CYBERDECK BRIDGE**.
  1. On the dashboard, choose **DOWNLOAD BRIDGE** (in the CONNECT prompt, or SYSTEM ▸ BOOKMARKS).
  2. Unzip it to a folder you'll keep.
  3. Open `chrome://extensions`, turn on **Developer mode**, choose **Load unpacked**, and pick the folder with `manifest.json`.
  4. Reload the dashboard.

  From then on, NAV mirrors your bookmarks bar live, with site icons, and every new tab opens the dashboard. If the dashboard is already open in the window, a new tab switches back to it instead. The bridge is read-only and shares only the bookmarks bar, with this page only.
- **What NAV shows:** everything on your bookmarks bar (both copies, if you're signed in to Chrome), then **Other bookmarks** and **Mobile bookmarks** as folders when they hold anything. Wherever Chrome saves a new bookmark, it shows up.
- **Updating the bridge:** when SYSTEM ▸ BOOKMARKS offers an update, download it, unzip it over the old folder, and press ↻ on CYBERDECK BRIDGE in `chrome://extensions`.
- **Without the bridge:** export your bookmarks (Bookmark manager ▸ ⋮ ▸ Export bookmarks), then choose **IMPORT BOOKMARKS.HTML…**. You get a copy of the bar, kept in your layout and its backups.

## Arrange it
Press **EDIT** in NAV's header to unlock the layout:
- Make **areas** (+ AREA), name them, and drag bookmarks or whole folders into them.
- Drag to reorder, or pull a bookmark out of a folder. Every item's **⋯** menu does the same from the keyboard.
- Drop anything on **HIDDEN** to hide it (it stays in Chrome).
- Drag the **⠿** grips to move NAV or the brand panel, and NAV's right edge to resize it.
- **CHROME ORDER** goes back to Chrome's own order. **UNDO** (Ctrl+Z) steps back. **REVERT** returns to how it was when you started.

Press **DONE** (or Esc) to lock it again. Changes save as you go.

## Your layout is recoverable
- **Automatic snapshots** are kept in this browser: when the page opens, after changes, and before any import or restore. Restore any of them from **SYSTEM ▸ RESTORE**.
- **Backup files:** **SYSTEM ▸ EXPORT BACKUP** saves a `.json` file wherever you like, and **IMPORT BACKUP…** brings one back after showing what it holds.
- **The reminder:** if you haven't exported for a while (14 days by default, adjustable), the page offers to export.

## Development
See [CLAUDE.md](CLAUDE.md) for the commands, and [ARCHITECTURE.md](ARCHITECTURE.md) for how it fits together.

Fonts: JetBrains Mono (SIL Open Font License, `src/assets/fonts/OFL.txt`).
