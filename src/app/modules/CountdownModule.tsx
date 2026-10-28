/**
 * src/app/modules/CountdownModule.tsx: the COUNTDOWN module (0.25.0): big
 * digits counting down to a date and time you choose, under your label;
 * and its SETTINGS (the label, the date, the time).
 *
 *   ┌ > COUNTDOWN ────────────────┐
 *   │           LAUNCH            │   the label, if any
 *   │     12   04   32   10       │   digits as wide as the module allows
 *   │    DAYS  HRS  MIN  SEC      │
 *   │   FRI 25 DEC 2026 · 09:00   │   what it counts to
 *   └─────────────────────────────┘
 *
 * Layer: UI. The rules are lib/countdown.ts. The digits are CLOCK's
 * (app.css .clock-module): sized from the module's width. Battery first: it
 * reads the time once a second only while the page can be seen and the date
 * is still to come (useSecond), and a timeout to the end (re-armed a day at
 * a time: a browser's timeout can't wait longer than about 24 days) says
 * when it's reached, even from a background tab.
 */
import { type CSSProperties, useEffect, useId, useState } from 'react';

import { type CountdownSettings, MAX_COUNTDOWN_LABEL, cleanCountdownLabel, countdownParts, countdownTarget, countdownText, pad2, parseTime } from '@/lib/countdown';
import { setSettings } from '@/lib/modules';
import { parseDate } from '@/lib/time';
import { editStore } from '@/store/edit';
import { uiStore } from '@/store/ui';

import { cx } from '../cx';
import type { ModuleProps } from './catalog';
import { useSecond, useSeen } from './useNow';

/** How long after its end a countdown still says it's reached when the page opens (ms): one reached long ago just shows zeros. */
const LATE_NOTICE_MS = 5000;
/** The longest one timeout waits (ms): a day, well under a browser's limit (2³¹ ms, about 24 days). */
const MAX_WAIT_MS = 86_400_000;
/** What it counts to, as CLOCK and TIME show a date. */
const DATE = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });

/** The module's panel: the label, the digits (days, hours, minutes, seconds) and what it counts to. */
export function Panel({ module }: ModuleProps) {
  const seen = useSeen();
  const settings = module.kind === 'countdown' ? module.settings : null;
  const target = settings ? countdownTarget(settings) : null;
  const label = settings?.label ?? '';
  // Reached: the end the timeout found reached (a new date isn't, until its own timeout says so).
  const [reachedAt, setReachedAt] = useState<number | null>(null);
  const reached = target !== null && reachedAt === target;
  // Ticking only while there's a date still to come.
  const now = useSecond(seen && target !== null && !reached).getTime();

  // A timeout to the end (not a loop), a day at a time: it stops the ticking and says so, even from a background tab.
  // One reached before the page opened (a while back) shows zeros at once, without a toast.
  useEffect(() => {
    if (target === null) return;
    let t: ReturnType<typeof setTimeout>;
    const arm = () => {
      const wait = target - Date.now();
      if (wait > MAX_WAIT_MS) {
        t = setTimeout(arm, MAX_WAIT_MS);
        return;
      }
      t = setTimeout(
        () => {
          setReachedAt(target);
          if (wait >= -LATE_NOTICE_MS) uiStore.getState().showToast(`COUNTDOWN DONE${label ? ` · ${label}` : ''}`);
        },
        Math.max(0, wait),
      );
    };
    arm();
    return () => clearTimeout(t);
  }, [target, label]);

  if (!settings) return null;
  if (target === null) {
    return (
      <div className="clock-module countdown-module">
        {settings.label && <span className="clock-date countdown-label">{settings.label}</span>}
        <p className="small dim countdown-empty">NO DATE YET: CHOOSE ONE IN THIS MODULE’S SETTINGS (EDIT ▸ ⋯ ▸ SETTINGS).</p>
      </div>
    );
  }
  const left = reached ? 0 : Math.max(0, target - now);
  const p = countdownParts(left);
  const days = pad2(p.days);
  // How many digits there are (days can run past 99), so the digits fill the width and never overflow it.
  const fit = { '--chars': days.length + 6 } as CSSProperties;
  const parts: [string, string][] = [
    [days, p.days === 1 ? 'DAY' : 'DAYS'],
    [pad2(p.h), 'HRS'],
    [pad2(p.m), 'MIN'],
    [pad2(p.s), 'SEC'],
  ];
  return (
    <div className={cx('clock-module countdown-module', left === 0 && 'due')}>
      {settings.label && <span className="clock-date countdown-label">{settings.label}</span>}
      <span className="clock-digits countdown-digits" style={fit} role="timer" aria-live="off" aria-label={`${settings.label || 'Countdown'}: ${countdownText(left)} left`}>
        {parts.map(([value, unit]) => (
          <span key={unit.slice(0, 2)} className="countdown-part" aria-hidden="true">
            <span>{value}</span>
            <span className="countdown-unit">{unit}</span>
          </span>
        ))}
      </span>
      <span className="clock-date countdown-to">
        {DATE.format(target).toUpperCase().replace(/,/g, '')}
        {settings.time !== '00:00' && ` · ${settings.time}`}
      </span>
    </div>
  );
}

/** SETTINGS: the label, the date and the time. Each change is one undoable step. */
export function Settings({ module }: ModuleProps) {
  const labelId = useId();
  const dateId = useId();
  const timeId = useId();
  if (module.kind !== 'countdown') return null;
  const { settings } = module;
  // Each change is merged into the settings as they are when it's saved, not as this render saw them: leaving LABEL
  // for DATE saves the label, then the date, before this re-renders, and the date mustn't undo the label.
  const save = (change: Partial<CountdownSettings>) =>
    editStore.getState().apply((st) => {
      const now = st.modules.find((m) => m.id === module.id);
      return now?.kind === 'countdown' ? { ...st, modules: setSettings(st.modules, module.id, 'countdown', { ...now.settings, ...change }) } : st;
    });
  return (
    <div className="settings-group">
      <div className="setting">
        <label htmlFor={labelId}>LABEL</label>
        <input
          id={labelId}
          className="module-input boxed"
          type="text"
          placeholder="LAUNCH"
          maxLength={MAX_COUNTDOWN_LABEL}
          autoComplete="off"
          defaultValue={settings.label}
          // Saved on leaving the field, not on every letter typed.
          onBlur={(e) => {
            const label = cleanCountdownLabel(e.target.value);
            e.target.value = label;
            if (label !== settings.label) save({ label });
          }}
        />
      </div>
      <div className="setting">
        <label htmlFor={dateId}>DATE</label>
        <input
          id={dateId}
          className="module-input boxed"
          type="date"
          defaultValue={settings.date}
          // The browser gives a whole date or '' (half typed): only a whole, real one is saved.
          onChange={(e) => {
            const date = e.target.value;
            if (parseDate(date) && date !== settings.date) save({ date });
          }}
        />
      </div>
      <div className="setting">
        <label htmlFor={timeId}>TIME</label>
        <input
          id={timeId}
          className="module-input boxed"
          type="time"
          defaultValue={settings.time}
          onChange={(e) => {
            const time = e.target.value;
            if (parseTime(time) && time !== settings.time) save({ time });
          }}
        />
      </div>
      <p className="small dim">IT COUNTS TO THAT DAY AND TIME HERE (00:00: THE DAY’S START).</p>
    </div>
  );
}
