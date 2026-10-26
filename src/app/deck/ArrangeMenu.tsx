/**
 * src/app/deck/ArrangeMenu.tsx: an item's ⋯ menu in edit mode: everything
 * a drag does, from the keyboard (or for anyone who'd rather not drag).
 *
 * Layer: UI. Styled as quest_log_desktop's context menu (app.css .menu).
 * Focus moves into it as it opens; ↑ / ↓ move between its items; Esc,
 * Tab or a click elsewhere closes it, and focus goes back to the ⋯ button.
 *
 *   MOVE EARLIER / MOVE LATER      one place along its section
 *   MOVE TO NAV / MOVE TO <AREA>   into NAV or one of your areas (at the end)
 *   MOVE TO A NEW AREA             makes an area with just this in it
 *   BACK TO CHROME'S PLACE         undoes your placement of it
 *   HIDE                           into the HIDDEN tray
 *   PIN TO QUICK LAUNCH            a link becomes a QUICK LAUNCH tile
 *                                  (app/modules/actions.ts)
 *   SWITCH TO ITS OPEN TAB         its place's links focus an open tab
 *                                  instead of opening another (bridge 1.3+,
 *                                  app/switchTab.ts); ✓ … STOP turns it off
 */
import { type KeyboardEvent, useLayoutEffect, useRef } from 'react';

import { type Arranged, addArea, hideItem, isPlaced, keyKind, moveItem, unplaceItem } from '@/lib/arrange';
import { isOpenable } from '@/lib/bookmarks';
import { editStore } from '@/store/edit';

import { uiStore } from '@/store/ui';
import { uiZoomNow } from '@/scale';

import { G } from '../glyphs';
import { useLayout } from '../hooks';
import { isPinned, pinToLaunch } from '../modules/actions';
import { canSwitch, isSwitchOn, startSwitching, stopSwitching } from '../switchTab';

/** What the menu is for: an item shown in `section`, under the ⋯ button `anchor`. */
export interface MenuState {
  key: string;
  section: string;
  anchor: HTMLElement;
}

/** A new area's id: unique enough for one person's areas, short to store. */
export function newAreaId(): string {
  return `a${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
}

/** The menu (`onClose` also returns focus to the ⋯ button). `onNewArea` is told the id of an area it creates. */
export function ArrangeMenu({ menu, arranged, onClose, onNewArea }: { menu: MenuState; arranged: Arranged; onClose: () => void; onNewArea: (id: string) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const arrangement = useLayout((s) => s.layout.bookmarks.arrangement);
  const { key, section } = menu;
  const kind = keyKind(key);

  // Into the menu as it opens.
  useLayoutEffect(() => {
    box.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, []);

  // The section's items of the same kind, in order: where MOVE EARLIER / LATER step.
  const list = section === 'main' ? arranged.main : section === 'folder' ? [] : (arranged.areas.find((a) => a.area.id === section)?.items ?? []);
  const same = list.filter((it) => keyKind(it.key) === kind).map((it) => it.key);
  const at = same.indexOf(key);
  const title = arranged.all.get(key)?.node.title.trim() || 'ITEM';
  const label = title.toUpperCase();

  /**
   * Applies a change, closes the menu, says what happened, and puts the
   * keyboard where the item went: its ⋯ button in its new place, or, once
   * hidden, its SHOW button in the HIDDEN tray (one keypress undoes it).
   */
  const run = (change: Parameters<ReturnType<typeof editStore.getState>['apply']>[0], said: string, hidden = false) => {
    editStore.getState().apply(change);
    onClose();
    uiStore.getState().announce(said);
    requestAnimationFrame(() => {
      const target = hidden
        ? document.querySelector<HTMLElement>(`.hidden-tray [data-hidden-key="${CSS.escape(key)}"] button`)
        : document.querySelector<HTMLElement>(`[data-item-key="${CSS.escape(key)}"] .item-menu-btn`);
      target?.focus();
    });
  };
  const moveTo = (target: string, before: string | null, said: string) =>
    run((s) => ({ ...s, arrangement: moveItem(s.arrangement, key, { section: target, before }, arranged.mainKeys) }), said);

  // The menu's items, in groups (a rule between groups): along the section; into another section; back or away.
  const groups: { glyph: string; label: string; act: () => void }[][] = [[], [], [], []];
  if (at > 0) groups[0]!.push({ glyph: G.earlier, label: 'MOVE EARLIER', act: () => moveTo(section, same[at - 1]!, `MOVED ${label} EARLIER`) });
  if (at >= 0 && at < same.length - 1) groups[0]!.push({ glyph: G.later, label: 'MOVE LATER', act: () => moveTo(section, same[at + 2] ?? null, `MOVED ${label} LATER`) });
  if (section !== 'main') groups[1]!.push({ glyph: G.moveTo, label: 'MOVE TO NAV', act: () => moveTo('main', null, `MOVED ${label} TO NAV`) });
  for (const { area } of arranged.areas) {
    if (area.id !== section) groups[1]!.push({ glyph: G.moveTo, label: `MOVE TO ${area.title}`, act: () => moveTo(area.id, null, `MOVED ${label} TO ${area.title}`) });
  }
  groups[1]!.push({
    glyph: G.newArea,
    label: 'MOVE TO A NEW AREA',
    act: () => {
      const id = newAreaId();
      run((s) => {
        const withArea = addArea(s.arrangement, id, `AREA ${s.arrangement.areas.length + 1}`);
        return { ...s, arrangement: moveItem(withArea, key, { section: id, before: null }, arranged.mainKeys) };
      }, `MOVED ${label} TO A NEW AREA: NAME IT`);
      onNewArea(id);
    },
  });
  if (isPlaced(arrangement, key)) groups[2]!.push({ glyph: G.restore, label: 'BACK TO CHROME’S PLACE', act: () => run((s) => ({ ...s, arrangement: unplaceItem(s.arrangement, key) }), `${label} IS BACK WHERE CHROME HAS IT`) });
  groups[2]!.push({ glyph: G.hide, label: 'HIDE', act: () => run((s) => ({ ...s, arrangement: hideItem(s.arrangement, key) }), `HID ${label}: SHOW IT FROM THE HIDDEN TRAY`, true) });
  // A link a webpage can open can be pinned to QUICK LAUNCH (once).
  const url = arranged.all.get(key)?.node.url;
  if (url !== undefined && isOpenable(url) && !isPinned(url)) {
    groups[3]!.push({
      glyph: '»',
      label: 'PIN TO QUICK LAUNCH',
      act: () => {
        pinToLaunch(url, title);
        onClose();
      },
    });
  }
  // SWITCH TO ITS OPEN TAB: with a bridge that can (1.3+), for a link a webpage can open.
  if (url !== undefined && isOpenable(url) && canSwitch()) {
    const on = isSwitchOn(url);
    groups[3]!.push({
      glyph: on ? '✓' : '↪',
      label: on ? 'SWITCHES TO ITS OPEN TAB · STOP' : 'SWITCH TO ITS OPEN TAB',
      act: () => {
        onClose();
        if (on) stopSwitching(url);
        else void startSwitching(url);
      },
    });
  }
  const rows = groups.filter((g) => g.length);
  const count = rows.reduce((n, g) => n + g.length, 0);

  /** ↑ / ↓ between items; Esc and Tab close. */
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const buttons = [...e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]')];
    const i = buttons.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      buttons[(i + (e.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus();
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    }
  };

  // Placed under the ⋯ button, kept inside the window: in the UI's own px (screen px ÷ UI SCALE's zoom).
  const r = menu.anchor.getBoundingClientRect();
  const z = uiZoomNow();
  const top = Math.min(r.bottom / z + 4, window.innerHeight / z - (count * 30 + rows.length * 9 + 48));
  const left = Math.min(r.left / z, window.innerWidth / z - 268);
  return (
    <div className="menu-layer" onMouseDown={onClose}>
      <div ref={box} className="menu" role="menu" aria-label={`Arrange ${title}`} style={{ top, left }} onMouseDown={(e) => e.stopPropagation()} onKeyDown={onKeyDown}>
        <p className="menu-heading">{label}</p>
        {rows.map((group, g) => (
          <div key={g} role="group">
            {g > 0 && <div className="menu-sep" role="separator" />}
            {group.map((it) => (
              <button key={it.label} type="button" role="menuitem" className="menu-item" onClick={it.act}>
                <span className="menu-glyph" aria-hidden>
                  {it.glyph}
                </span>
                {it.label}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
