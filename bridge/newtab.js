/**
 * bridge/newtab.js: what a new tab does while the bridge is installed.
 *
 * Layer: bridge extension (the New Tab override page).
 *
 *   - The dashboard is already open in this window: switch to it, and
 *     close this new tab (user request 2026-10-22: one dashboard, not a
 *     pile of them). Chrome's own New Tab page stays reachable from the
 *     dashboard's CHROME NEW TAB button.
 *   - Otherwise: this tab becomes the dashboard. `replace`, so its Back
 *     button doesn't return to this blank forwarding page.
 *
 * Finding the dashboard's tab needs only the host permission for the
 * dashboard's address (manifest.json `host_permissions`), not the broad
 * "tabs" permission: Chrome then shows this extension the addresses of
 * dashboard tabs and nothing else.
 */
const DASHBOARD_URL = 'https://thedungeons2077.github.io/cyberdeck_terminal/';

/** Switches to an open dashboard in this window and closes this tab; false if there's none. */
async function switchToOpenDashboard() {
  const self = await chrome.tabs.getCurrent();
  if (!self) return false;
  const open = await chrome.tabs.query({ url: `${DASHBOARD_URL}*`, windowId: self.windowId });
  const dashboard = open.find((tab) => tab.id !== self.id);
  if (!dashboard) return false;
  await chrome.tabs.update(dashboard.id, { active: true });
  await chrome.tabs.remove(self.id);
  return true;
}

switchToOpenDashboard()
  .catch(() => false)
  .then((switched) => {
    if (!switched) location.replace(DASHBOARD_URL);
  });
