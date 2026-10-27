/**
 * src/app/modules/useNow.ts: the clock hooks the TIME and CLOCK modules share.
 *
 * Layer: UI. Battery first: nothing loops. A module asks for the time to be
 * read again only at the moment its display changes (one timeout at a time),
 * and only while the page can be seen (tab in front, not immersive). Coming
 * back, the time is read afresh, so nothing drifts.
 */
import { useEffect, useState } from 'react';

import { nextTick } from '@/lib/clock';

import { useUi } from '../hooks';

/** Is the page on screen to look at (tab in front, not immersive)? */
export function useSeen(): boolean {
  const immersive = useUi((s) => s.immersive);
  const [visible, setVisible] = useState(() => document.visibilityState === 'visible');
  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);
  return visible && !immersive;
}

/**
 * The time, read again at each whole second (or, with `everySecond` off, each
 * whole minute) while `on`: one timeout to the display's next change
 * (lib/clock.ts nextTick), so the module turns over with the system clock.
 */
export function useNow(on: boolean, everySecond = true): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!on) return;
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      const d = new Date();
      setNow(d);
      // A few ms late, so the read lands just after the edge rather than just before it.
      t = setTimeout(tick, nextTick(d, everySecond) + 5);
    };
    tick();
    return () => clearTimeout(t);
  }, [on, everySecond]);
  return now;
}

/** The time, read again on each whole second while `on`. */
export function useSecond(on: boolean): Date {
  return useNow(on, true);
}
