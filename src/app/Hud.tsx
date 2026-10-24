/**
 * src/app/Hud.tsx: the heads-up display over the wallpaper: the brand
 * panel with a clock (top left) and the key hints (bottom right).
 *
 * Layer: UI. Each hint is also a button that does what its key does, so
 * everything works with the mouse too. The brand panel sits where you put
 * it (layout.panels.brand); in edit mode it has a grip to move it and a ⋯
 * with REMOVE. It's optional, grouped with the modules (user request,
 * 2026-10-24): removed, it comes back from the edit bar's + MODULE
 * (`panels.brandOff`). It keeps its own size (the modules are drawn smaller).
 *
 * Its status line is the time and date only (the link to Chrome is shown
 * in NAV's header; the panel's own LINK LIVE was removed at the user's
 * request, 2026-10-23).
 */
import { useEffect, useRef, useState } from 'react';

import { editStore } from '@/store/edit';
import { uiStore } from '@/store/ui';

import { useArrangeDrag } from './arrangeDrag';
import { cx } from './cx';
import { toggleFullscreen } from './fullscreen';
import { useEdit, useLayout } from './hooks';
import { MoveGrip, placeStyle } from './panels';
import { PopupMenu } from './PopupMenu';

/** Takes the brand panel off the screen (undoable), says so, and puts the keyboard on + MODULE (where it comes back from). */
function removeBrand(): void {
  editStore.getState().apply((s) => ({ ...s, panels: { ...s.panels, brandOff: true } }));
  uiStore.getState().announce('REMOVED THE BRAND PANEL · + MODULE BRINGS IT BACK');
  requestAnimationFrame(() => document.querySelector<HTMLElement>('.edit-bar [data-add-module]')?.focus());
}

// The clock's formatters, made once: toLocale…String with options builds a new one on every
// call, every second (optimization pass, 2026-10-22).
const TIME = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const DATE = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
/** `14:07:33`. */
const timeText = (d: Date) => TIME.format(d);
/** `THU 22 OCT 2026`. */
const dateText = (d: Date) => DATE.format(d).replace(/,/g, '').toUpperCase();

/** The current time, updated every second. */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

/** The clock and date: the only part of the HUD that changes every second (so only it re-renders). */
function Clock() {
  const now = useNow();
  return (
    <>
      <time className="hud-clock" dateTime={now.toISOString()}>
        {timeText(now)}
      </time>
      <span>{dateText(now)}</span>
    </>
  );
}

/** The HUD. */
export function Hud() {
  const place = useLayout((s) => s.layout.panels.brand);
  const off = useLayout((s) => s.layout.panels.brandOff === true);
  const editing = useEdit((s) => s.editing);
  const brand = useRef<HTMLElement>(null);
  const noScroll = useRef<HTMLElement>(null);
  const { start } = useArrangeDrag(noScroll);
  const [menu, setMenu] = useState<HTMLElement | null>(null);
  return (
    <>
      {!off && (
        <header ref={brand} className={cx('masthead hud-brand', editing && 'editing')} data-placed={place ? '' : undefined} style={placeStyle(place)}>
          {editing && (
            <span className="brand-tools">
              <MoveGrip id="brand" label="the brand panel" target={() => brand.current} startDrag={start} />
              <button type="button" className="item-menu-btn" aria-label="Brand panel options" aria-haspopup="menu" onClick={(e) => setMenu(e.currentTarget)}>
                ⋯
              </button>
            </span>
          )}
          <div className="masthead-scan" />
          <h1 className="brand">
            <span className="brand-bracket">&lt;</span>
            <span className="brand-name">cyberdeck_terminal</span>
            <span className="brand-bracket">&gt;</span>
          </h1>
          <p className="hud-status">
            <Clock />
          </p>
          {menu && (
            <PopupMenu
              heading="BRAND PANEL"
              label="Brand panel options"
              anchor={menu}
              onClose={() => setMenu(null)}
              groups={[[{ glyph: '✕', label: 'REMOVE', act: removeBrand }]]}
            />
          )}
        </header>
      )}
      <nav className="hud-keys" aria-label="Controls">
        <button type="button" className="hint" onClick={() => void toggleFullscreen()}>
          <kbd>F</kbd> FULLSCREEN
        </button>
        <button type="button" className="hint" onClick={() => uiStore.getState().setFinderOpen(true)}>
          <kbd>/</kbd> FIND
        </button>
        <button type="button" className="hint" onClick={() => uiStore.getState().setPanelOpen(true)}>
          <kbd>S</kbd> SYSTEM
        </button>
      </nav>
    </>
  );
}
