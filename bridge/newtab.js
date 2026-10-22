/**
 * bridge/newtab.js: sends every new tab to the dashboard.
 *
 * Layer: bridge extension (the New Tab override page). `replace`, so the
 * tab's Back button doesn't return to this blank forwarding page.
 */
const DASHBOARD_URL = 'https://thedungeons2077.github.io/cyberdeck_terminal/';

location.replace(DASHBOARD_URL);
