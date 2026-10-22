/**
 * src/app/Hud.tsx: the heads-up display over the wallpaper: the brand
 * panel with a clock (top left) and the key hints (bottom right).
 *
 * Layer: UI. Phase 1's whole dashboard: the bookmarks and modules of later
 * phases go between these. Each hint is also a button that does what its
 * key does, so everything works with the mouse too.
 */
import { useEffect, useState } from 'react';

import { uiStore } from '@/store/ui';

import { toggleFullscreen } from './fullscreen';
import { G } from './glyphs';

/** `14:07:33`. */
const timeText = (d: Date) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
/** `THU 22 OCT 2026`. */
const dateText = (d: Date) => d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).replace(/,/g, '').toUpperCase();

/** The current time, updated every second. */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

/** The HUD. */
export function Hud() {
  const now = useNow();
  return (
    <>
      <header className="masthead hud-brand">
        <div className="masthead-scan" />
        <h1 className="brand">
          <span className="brand-bracket">&lt;</span>
          <span className="brand-name">CYBERDECK</span>
          <span className="brand-bracket">&gt;</span>
          <span className="cursor" aria-hidden>
            {G.cursor}
          </span>
        </h1>
        <p className="hud-status">
          <time className="hud-clock" dateTime={now.toISOString()}>
            {timeText(now)}
          </time>
          <span>{dateText(now)}</span>
          <span>· LINK OK</span>
        </p>
      </header>
      <nav className="hud-keys" aria-label="Controls">
        <button type="button" className="hint" onClick={() => void toggleFullscreen()}>
          <kbd>F</kbd> FULLSCREEN
        </button>
        <button type="button" className="hint" onClick={() => uiStore.getState().setPanelOpen(true)}>
          <kbd>S</kbd> SYSTEM
        </button>
      </nav>
    </>
  );
}
