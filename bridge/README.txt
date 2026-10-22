CYBERDECK BRIDGE
================

Connects the cyberdeck_terminal dashboard
(https://thedungeons2077.github.io/cyberdeck_terminal/) to your Chrome
bookmarks bar, and opens the dashboard on every new tab.

INSTALL
  1. Unzip this folder somewhere you'll keep it (e.g. Documents\cyberdeck-bridge).
     Chrome loads it from there every time it starts: don't delete it.
  2. Open chrome://extensions and turn on "Developer mode" (top right).
  3. Click "Load unpacked" and choose the folder that has manifest.json in it.
  4. Reload the dashboard. It connects by itself.

  The first new tab may show "Change back to Google?" (Chrome asking about
  the new New Tab page): choose Keep it.

UPDATE
  Download the new zip from the dashboard (SYSTEM > BOOKMARKS), unzip it over
  the old folder, then press the reload arrow on the bridge in chrome://extensions.

WHAT IT CAN DO
  - Read your bookmarks bar (only the bar), and share it with the dashboard
    page only. It never changes your bookmarks.
  - Point new tabs at the dashboard.
  Nothing is sent anywhere else. The source is in this folder: background.js,
  tree.js and newtab.js.

REMOVE
  chrome://extensions > CYBERDECK BRIDGE > Remove. New tabs go back to Chrome's.
