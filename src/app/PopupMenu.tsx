/**
 * src/app/PopupMenu.tsx: a small menu under the button that opened it:
 * the + MODULE menu and a module's ⋯ menu.
 *
 * Layer: UI. The same look and keys as an item's ⋯ menu
 * (deck/ArrangeMenu.tsx, app.css .menu): focus moves into it as it opens;
 * ↑ / ↓ move between its items; Esc, Tab or a click elsewhere closes it,
 * and focus goes back to the button.
 */
import { type KeyboardEvent, useLayoutEffect, useRef } from 'react';

import { uiZoomNow } from '@/scale';

/** One item of the menu. */
export interface PopupItem {
  glyph: string;
  label: string;
  act(): void;
  /** Dimmed and inert (e.g. the dashboard is full). */
  disabled?: boolean;
  /** A longer line about it, shown on hover. */
  hint?: string;
}

/** The menu: `heading` over groups of items (a rule between groups), under `anchor`. */
export function PopupMenu({ heading, label, groups, anchor, onClose }: { heading: string; label: string; groups: PopupItem[][]; anchor: HTMLElement; onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null);

  // Into the menu as it opens.
  useLayoutEffect(() => {
    box.current?.querySelector<HTMLElement>('[role="menuitem"]:not(:disabled)')?.focus();
  }, []);

  /** ↑ / ↓ between items; Esc and Tab close. */
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const buttons = [...e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)')];
    const i = buttons.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      buttons[(i + (e.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus();
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      e.preventDefault();
      onClose();
    }
    // Keys meant for the menu don't reach the page (its shortcuts, edit mode's Esc).
    e.stopPropagation();
  };

  const rows = groups.filter((g) => g.length);
  const count = rows.reduce((n, g) => n + g.length, 0);
  // Placed under the button, kept inside the window: in the UI's own px (screen px ÷ UI SCALE's zoom).
  const r = anchor.getBoundingClientRect();
  const z = uiZoomNow();
  const top = Math.max(8, Math.min(r.bottom / z + 4, window.innerHeight / z - (count * 30 + rows.length * 9 + 48)));
  const left = Math.max(8, Math.min(r.left / z, window.innerWidth / z - 268));
  return (
    <div className="menu-layer" onMouseDown={onClose}>
      <div ref={box} className="menu" role="menu" aria-label={label} style={{ top, left }} onMouseDown={(e) => e.stopPropagation()} onKeyDown={onKeyDown}>
        <p className="menu-heading">{heading}</p>
        {rows.map((group, g) => (
          <div key={g} role="group">
            {g > 0 && <div className="menu-sep" role="separator" />}
            {group.map((it) => (
              <button
                key={it.label}
                type="button"
                role="menuitem"
                className="menu-item"
                disabled={it.disabled}
                title={it.hint}
                onClick={() => {
                  onClose();
                  it.act();
                }}
              >
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
