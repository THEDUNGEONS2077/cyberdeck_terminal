# cyberdeck_terminal

A terminal-style start page for Chrome. An animated wallpaper fills the whole screen (a matrix rain to start with, nine more to choose from), and the dashboard sits on top: your bookmarks as NAV, and modules you place yourself. Your layout stays in your browser: nothing is sent anywhere.

**Live:** https://thedungeons2077.github.io/cyberdeck_terminal/

The same wallpapers run on Android as live wallpapers: [fluid_motion](https://github.com/THEDUNGEONS2077/fluid_motion).

## Keys
| Key | Does |
|---|---|
| **F** | Fullscreen with only the wallpaper. F or Esc comes back. |
| **/** | Find: type a few letters of any bookmark (in any folder) and press Enter to open it, or run a command. ↑ ↓ choose. |
| **S** | SYSTEM: appearance (colours, wallpaper, glow, zoom), profiles, bookmarks source, backups, restore |
| **+ −** | Zoom the wallpaper in / out a step (**0**: back to 100%), in fullscreen too. Each wallpaper keeps its own zoom. |
| **[ ]** | Make the dashboard smaller / bigger (UI SCALE) |
| **1–9** | Open the QUICK LAUNCH tile with that key |
| **← ↑ → ↓** | Move between bookmarks, folders and links (Home / End: the first / last) |
| **Esc** | Closes SYSTEM or the finder |

Bookmarks open in a new tab, so the dashboard stays put. With the bridge, links show their site icons, and NAV's header has **CHROME NEW TAB ↗** (Chrome's own New Tab page, with your bookmarks bar, to edit) and **BOOKMARK MANAGER ↗**.

**Appearance** (SYSTEM ▸ APPEARANCE, at the top), all saved with your layout and its backups:
- **Dashboard colours:** PHOSPHOR (the original green), AMBER, ICE, NEON, BLOOD, AZURE, SYNTH, OUTRUN or ALPENGLOW.
- **Sizes:** **UI SCALE** (50–300%, the whole dashboard; **[** and **]** on the keyboard), **TEXT SIZE** and **MODULE SIZE**. **CHROME ZOOM ▸ IGNORE** keeps the dashboard and the wallpaper at their own size whatever Chrome's zoom is, which Chrome shares with other pages on the same site.
- **Wallpaper:**
  - MATRIX RAIN;
  - NEURAL NET: a drifting network of glowing nodes and links, with signals running along it;
  - VELOCITY: slanted panels of light drifting past, streaks racing across;
  - DATA FLOW: a circuit board at night, packets of light running along its traces and into its chips;
  - MEGACITY: a city of towers in blue haze at night, seen from a rooftop ledge; windows go on and off, signs flicker, drones cross;
  - HORIZON: a glowing wireframe land running to a hot pink horizon, gliding toward you;
  - SUNSET: the striped outrun sun over a glowing grid that glides toward you, under the stars;
  - PRISM: a field of smoky glass blocks lit magenta and blue from inside.
  - QUANTUM KERNEL: layers of code at different depths, in the rain's glyphs, scrolling past each other; now and then a line lights up as it runs;
  - SUMMIT: a low-poly mountain range at dusk above a sea of clouds, every range and bank of cloud gliding right to left at its own speed, forever.
- **Wallpaper colours:** the same nine palettes, chosen on their own: any dashboard colours with any wallpaper and any wallpaper colours. BLOOD suits the neural net and VELOCITY, NEON suits MEGACITY and PRISM, AZURE suits QUANTUM KERNEL, SYNTH suits HORIZON, OUTRUN suits SUNSET and ALPENGLOW suits SUMMIT.
- **Glow:** from LOW (the original look) to MAX. HIGH is the default.
- **Zoom:** 50% to 200% for the wallpaper shown (**−** / **+**, or the keys), in a browser's zoom steps. Each wallpaper keeps its own zoom and opens at it from then on. Zoomed in, the wallpaper is laid out as if the screen were smaller and drawn larger, so it's as sharp as at 100%.

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
- **+ MODULE** adds a panel you place and size yourself: **SEARCH** (a search box for the engine you choose), **QUICK LAUNCH** (tiles, keys 1–9), **TIME** (the clock, countdowns, a timer and a stopwatch), **CLOCK** (a big clock that grows with its width) or **COUNTDOWN** (big digits counting down to a date and time you choose, under your label). Each has its own **⋯ ▸ SETTINGS**, including its own sizes. The brand panel can be removed and added back the same way.
- **CHROME ORDER** goes back to Chrome's own order. **UNDO** (Ctrl+Z) steps back. **REVERT** returns to how it was when you started.

Press **DONE** (or Esc) to lock it again. Changes save as you go.

## Your layout is recoverable
- **Automatic snapshots** are kept in this browser: when the page opens, after changes, and before any import or restore. Restore any of them from **SYSTEM ▸ RESTORE**.
- **Backup files:** **SYSTEM ▸ EXPORT BACKUP** saves a `.json` file wherever you like (every profile in it), and **IMPORT BACKUP…** brings one back after showing what it holds.
- **If something breaks:** should the dashboard ever fail to draw, a panel takes its place over the wallpaper with **RELOAD**, **EXPORT BACKUP** and **RESTORE** for the newest snapshots, so a bad layout can never lock you out. A module that fails shows a small error card in its frame (**RESET SETTINGS** or **REMOVE**), and the rest of the dashboard carries on.

## Profiles
**SYSTEM ▸ PROFILES** keeps whole layouts with names (bookmark areas, panels, modules, wallpaper, colours and sizes), up to 12. **SAVE AS NEW** copies the layout you're looking at into a new profile and opens it; **OPEN** switches (or type *open profile* in the finder); changes save to the open one. Switching and deleting both leave a snapshot in RESTORE.
- **The reminder:** if you haven't exported for a while (14 days by default, adjustable), the page offers to export.

## Development
See [CLAUDE.md](CLAUDE.md) for the commands, and [ARCHITECTURE.md](ARCHITECTURE.md) for how it fits together.

## License
[MIT](LICENSE). The font, JetBrains Mono, is under the SIL Open Font License (`src/assets/fonts/OFL.txt`).
