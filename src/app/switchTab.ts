/**
 * src/app/switchTab.ts: SWITCH TO OPEN TAB on the page: following a link
 * whose place you've turned it on for (lib/switching.ts), and turning it
 * on and off from a link's ⋯ menu.
 *
 * Layer: UI. Needs bridge 1.3+ (its `switch` feature): the bridge looks
 * for the open tab and focuses it, or opens the link in a new tab next to
 * this one when there's none, so the click still opens something with no
 * popup blocker in the way. Without the bridge (or for any other link),
 * links open in a new tab exactly as before. A middle click, or one with
 * Ctrl / Shift / Alt / Cmd, is left to the browser: that's asking for a
 * new tab or window on purpose.
 *
 * Turning it on asks the bridge to see the link's site. When the bridge
 * may already (the dashboard's own site, quest_log_desktop's too), it's on
 * at once; otherwise the bridge opens its small window to ask you, and
 * the place is added only when you've said yes (`granted`, from
 * app/useBridge.ts).
 */
import type { MouseEvent } from 'react';

import { askToSwitch, forgetSite, goToTab } from '@/bridge/client';
import { hostOf } from '@/lib/bookmarks';
import { patternFor, siteNeeded, siteOf, switchPattern, withPattern, withoutPattern } from '@/lib/switching';
import { bookmarksStore, layoutStore } from '@/store/instance';
import { uiStore } from '@/store/ui';

/** Places waiting for your answer in the bridge's window, by site. */
const waiting = new Map<string, Set<string>>();

/** Can the bridge switch tabs (live, 1.3+)? */
export function canSwitch(): boolean {
  const { status, features } = bookmarksStore().getState();
  return status === 'live' && features.includes('switch');
}

/** The place `url` switches within, when it's turned on and the bridge can; else null. */
export function switchingFor(url: string): string | null {
  if (!canSwitch()) return null;
  return patternFor(layoutStore().getState().layout.prefs.switchTabs, url);
}

/** Has `url`'s place been turned on (whether or not the bridge is here now)? */
export function isSwitchOn(url: string): boolean {
  return patternFor(layoutStore().getState().layout.prefs.switchTabs, url) !== null;
}

/** Switches to `url`'s open tab through the bridge (or it opens a new one); if the bridge doesn't answer, the page opens it. */
async function go(url: string, pattern: string): Promise<void> {
  if (!(await goToTab(url, pattern))) window.open(url, '_blank', 'noopener,noreferrer');
}

/** Opens `url` the way a link here opens: its open tab if switching is on for it, else a new tab. */
export function openUrl(url: string): void {
  const pattern = switchingFor(url);
  if (pattern) void go(url, pattern);
  else window.open(url, '_blank', 'noopener,noreferrer');
}

/** A link's click: switches to its open tab when it's turned on (a plain left click only); otherwise the link opens as usual. */
export function followLink(e: MouseEvent, url: string): void {
  if (e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.shiftKey || e.altKey || e.metaKey) return;
  const pattern = switchingFor(url);
  if (!pattern) return;
  e.preventDefault();
  void go(url, pattern);
}

/** Adds `pattern` to the places that switch, and says so. */
function turnOn(pattern: string): void {
  const store = layoutStore().getState();
  store.setSwitchTabs(withPattern(store.layout.prefs.switchTabs, pattern));
  uiStore.getState().showToast(`LINKS UNDER ${pattern.slice(0, -1).replace(/^https?:\/\//, '').toUpperCase()} NOW SWITCH TO THEIR OPEN TAB`);
}

/** SWITCH TO OPEN TAB on, for `url`'s place: at once if the bridge may see the site, else after you allow it in the bridge's window. */
export async function startSwitching(url: string): Promise<void> {
  const pattern = switchPattern(url);
  if (!pattern) return;
  const site = siteOf(pattern);
  const answer = await askToSwitch(site);
  if (answer === 'granted') turnOn(pattern);
  else if (answer === 'asking') {
    waiting.set(site, new Set([...(waiting.get(site) ?? []), pattern]));
    uiStore.getState().showToast(`ALLOW ${hostOf(url).toUpperCase()} IN THE BRIDGE’S WINDOW`);
  } else uiStore.getState().showToast('THE BRIDGE DIDN’T ANSWER · UPDATE IT IN SYSTEM [S]');
}

/** Your answer in the bridge's window (app/useBridge.ts passes it on). */
export function onGranted(site: string, granted: boolean): void {
  const patterns = waiting.get(site);
  if (!patterns) return;
  waiting.delete(site);
  if (granted) for (const p of patterns) turnOn(p);
  else uiStore.getState().showToast('NOT ALLOWED · THOSE LINKS STILL OPEN A NEW TAB');
}

/** SWITCH TO OPEN TAB off for `url`'s place; the site's permission goes back when no other place needs it. */
export function stopSwitching(url: string): void {
  const store = layoutStore().getState();
  const pattern = patternFor(store.layout.prefs.switchTabs, url);
  if (!pattern) return;
  const list = withoutPattern(store.layout.prefs.switchTabs, pattern);
  store.setSwitchTabs(list);
  const site = siteOf(pattern);
  // The dashboard's own site stays (the bridge needs it for New Tab, and Chrome won't take it back).
  if (!siteNeeded(list, site) && site !== `${location.protocol}//${location.hostname}/*`) void forgetSite(site);
  uiStore.getState().announce('THAT LINK OPENS A NEW TAB AGAIN');
}
