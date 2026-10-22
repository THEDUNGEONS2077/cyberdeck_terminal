# cyberdeck_terminal

A terminal-style start page for Chrome. A matrix rain falls across the whole screen, and the dashboard sits on top. Your layout stays in your browser: nothing is sent anywhere.

**Live:** https://thedungeons2077.github.io/cyberdeck_terminal/ (once deployed)

## Keys
| Key | Does |
|---|---|
| **F** | Fullscreen with only the wallpaper. F or Esc comes back. |
| **S** | SYSTEM: backups, restore, wallpaper |
| **Esc** | Closes SYSTEM |

## Make it your start page
- **Homepage:** in Chrome Settings, go to **Appearance** and turn on **Show home button**. Choose the custom web address option and paste the page's address.
- **When Chrome starts:** in Chrome Settings, go to **On startup**, choose **Open a specific page or set of pages**, then **Add a new page** and paste the page's address.
- **New Tab:** Chrome doesn't let a web address replace the New Tab page. The optional bridge extension (coming in phase 2) does it, along with live bookmarks.

## Your layout is recoverable
- **Automatic snapshots** are kept in this browser: when the page opens, after changes, and before any import or restore. Restore any of them from **SYSTEM ▸ RESTORE**.
- **Backup files:** **SYSTEM ▸ EXPORT BACKUP** saves a `.json` file wherever you like, and **IMPORT BACKUP…** brings one back after showing what it holds.
- **The reminder:** if you haven't exported for a while (14 days by default, adjustable), the page offers to export.

## Development
See [CLAUDE.md](CLAUDE.md) for the commands, and [ARCHITECTURE.md](ARCHITECTURE.md) for how it fits together.

Fonts: JetBrains Mono (SIL Open Font License, `src/assets/fonts/OFL.txt`).
