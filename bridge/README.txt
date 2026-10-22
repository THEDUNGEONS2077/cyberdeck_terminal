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
  - Read your bookmarks bar, plus Chrome's "Other bookmarks" and "Mobile
    bookmarks" (shown as two folders at the end, as Chrome's bar ends with
    "All bookmarks"), and share them with the dashboard page only. If you're
    signed in to Chrome it reads both copies of each (your Google Account's
    and this device's). It never changes your bookmarks.
  - Let the dashboard show your bookmarks' site icons (from Chrome's own
    icon cache).
  - Open Chrome's own New Tab page or Bookmark manager when you ask the
    dashboard to (a webpage can't open chrome:// pages itself).
  - Point new tabs at the dashboard. If the dashboard is already open in
    the window, a new tab switches to it instead (and closes itself). For
    that it can see the address of dashboard tabs, and of no other tab.
  Nothing is sent anywhere else. The source is in this folder: background.js,
  tree.js and newtab.js.

REMOVE
  chrome://extensions > CYBERDECK BRIDGE > Remove. New tabs go back to Chrome's.
