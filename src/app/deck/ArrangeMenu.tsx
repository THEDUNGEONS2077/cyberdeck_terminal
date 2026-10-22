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
 */
import { type KeyboardEvent, useLayoutEffect, useRef } from 'react';

import { type Arranged, addArea, hideItem, isPlaced, keyKind, moveItem, unplaceItem } from '@/lib/arrange';
import { editStore } from '@/store/edit';

import { useLayout } from '../hooks';

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
  const run = (change: Parameters<ReturnType<typeof editStore.getState>['apply']>[0]) => {
    editStore.getState().apply(change);
    onClose();
  };
  const moveTo = (target: string, before: string | null) => run((s) => ({ ...s, arrangement: moveItem(s.arrangement, key, { section: target, before }, arranged.mainKeys) }));

  const items: { label: string; act: () => void }[] = [];
  if (at > 0) items.push({ label: 'MOVE EARLIER', act: () => moveTo(section, same[at - 1]!) });
  if (at >= 0 && at < same.length - 1) items.push({ label: 'MOVE LATER', act: () => moveTo(section, same[at + 2] ?? null) });
  if (section !== 'main') items.push({ label: 'MOVE TO NAV', act: () => moveTo('main', null) });
  for (const { area } of arranged.areas) if (area.id !== section) items.push({ label: `MOVE TO ${area.title}`, act: () => moveTo(area.id, null) });
  items.push({
    label: 'MOVE TO A NEW AREA',
    act: () => {
      const id = newAreaId();
      run((s) => {
        const withArea = addArea(s.arrangement, id, `AREA ${s.arrangement.areas.length + 1}`);
        return { ...s, arrangement: moveItem(withArea, key, { section: id, before: null }, arranged.mainKeys) };
      });
      onNewArea(id);
    },
  });
  if (isPlaced(arrangement, key)) items.push({ label: 'BACK TO CHROME’S PLACE', act: () => run((s) => ({ ...s, arrangement: unplaceItem(s.arrangement, key) })) });
  items.push({ label: 'HIDE', act: () => run((s) => ({ ...s, arrangement: hideItem(s.arrangement, key) })) });

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

  // Placed under the ⋯ button, kept inside the window.
  const r = menu.anchor.getBoundingClientRect();
  const top = Math.min(r.bottom + 4, window.innerHeight - (items.length * 32 + 16));
  const left = Math.min(r.left, window.innerWidth - 260);
  const title = arranged.all.get(key)?.node.title.trim() || 'ITEM';
  return (
    <div className="menu-layer" onMouseDown={onClose}>
      <div ref={box} className="menu" role="menu" aria-label={`Arrange ${title}`} style={{ top, left }} onMouseDown={(e) => e.stopPropagation()} onKeyDown={onKeyDown}>
        <p className="menu-heading">{title.toUpperCase()}</p>
        {items.map((it) => (
          <button key={it.label} type="button" role="menuitem" className="menu-item" onClick={it.act}>
            {it.label}
          </button>
        ))}
      </div>
    </div>
  );
}
