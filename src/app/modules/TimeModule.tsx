/**
 * src/app/modules/TimeModule.tsx: the TIME module: a large clock, this
 * month's calendar, your countdowns, a timer and a stopwatch; and its
 * SETTINGS (the timer's length, the countdowns).
 *
 *   14:07:33                      THU 24 OCT 2026
 *   MO TU WE TH FR SA SU          ← this month, today lit
 *   LAUNCH ············· 12 DAYS  ← countdowns, soonest first
 *   TIMER 25:00  [START] [RESET]
 *   STOPWATCH 00:00 [START] [RESET]
 *
 * Layer: UI. Battery first, as the wallpapers are: nothing loops. Only the
 * parts that change redraw: the clock once a second, the calendar and
 * countdowns at midnight, the timer and stopwatch once a second while they
 * run. And they tick only while you can see them: not while the tab is in
 * the background, nor in immersive mode (the UI is hidden). Coming back,
 * they read the clock again, so nothing drifts. The running timer and
 * stopwatch aren't saved (a reload starts them over); a finished timer says
 * so with a toast, even from the background (one timeout, not a loop).
 */
import { type FormEvent, useEffect, useId, useState } from 'react';

import { setSettings } from '@/lib/modules';
import {
  MAX_COUNTDOWNS,
  TIMER_MAX,
  TIMER_MIN,
  type TimeSettings,
  addCountdown,
  clampTimer,
  clockText,
  countdownText,
  daysUntil,
  monthGrid,
  parseDate,
  removeCountdown,
  sortCountdowns,
} from '@/lib/time';
import { editStore } from '@/store/edit';
import { uiStore } from '@/store/ui';

import { cx } from '../cx';
import { useUi } from '../hooks';
import type { ModuleProps } from './catalog';

// Made once (a formatter per call, every second, was a cost the brand clock already learnt).
const TIME = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const DATE = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
const MONTH = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' });
/** The calendar's column heads, Monday first. */
const WEEKDAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

/** Is the page on screen to look at (tab in front, not immersive)? */
function useSeen(): boolean {
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
 * The time, updated on each whole second while `on` (and read afresh when
 * it comes back on). One timeout at a time, to the next second's edge, so
 * the seconds turn over with the system clock's.
 */
function useSecond(on: boolean): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!on) return;
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      const d = new Date();
      setNow(d);
      t = setTimeout(tick, 1000 - d.getMilliseconds() + 5);
    };
    tick();
    return () => clearTimeout(t);
  }, [on]);
  return now;
}

/** Today, updated just after midnight (and when the page is seen again, in case midnight passed unseen). */
function useToday(seen: boolean): Date {
  const [today, setToday] = useState(() => new Date());
  useEffect(() => {
    if (!seen) return;
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      const d = new Date();
      setToday(d);
      const midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
      t = setTimeout(tick, midnight - d.getTime() + 50);
    };
    tick();
    return () => clearTimeout(t);
  }, [seen]);
  return today;
}

/** The big clock and the date. */
function Clock({ seen }: { seen: boolean }) {
  const now = useSecond(seen);
  return (
    <div className="time-clock">
      <time className="time-now" dateTime={now.toISOString()}>
        {TIME.format(now)}
      </time>
      <span className="dim">{DATE.format(now).replace(/,/g, '').toUpperCase()}</span>
    </div>
  );
}

/** This month, Monday first, today lit. */
function Month({ today }: { today: Date }) {
  const weeks = monthGrid(today.getFullYear(), today.getMonth() + 1);
  const day = today.getDate();
  return (
    <table className="time-month">
      <caption className="setting-label">{MONTH.format(today).toUpperCase()}</caption>
      <thead>
        <tr>
          {WEEKDAYS.map((d) => (
            <th key={d} scope="col">
              {d}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {weeks.map((week, w) => (
          <tr key={w}>
            {week.map((d, i) => (
              <td key={i} className={cx(d === day && 'today')} aria-current={d === day ? 'date' : undefined}>
                {d ?? ''}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** The countdowns, soonest first. */
function Countdowns({ settings, today }: { settings: TimeSettings; today: Date }) {
  if (!settings.countdowns.length) return null;
  return (
    <ul className="time-countdowns" aria-label="Countdowns">
      {sortCountdowns(settings.countdowns, today).map((c) => {
        const days = daysUntil(c.date, today) ?? 0;
        return (
          <li key={c.id} className={cx('time-row', days < 0 && 'dim', days === 0 && 'due')}>
            <span className="time-label">{c.label}</span>
            <span className="time-fill" aria-hidden />
            <span className="time-value">{countdownText(days)}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** The timer's state: running toward `end`, or stopped with `left` ms to go (null: not started). */
type TimerState = { end: number; left: null } | { end: null; left: number | null };

/** The timer: START / PAUSE, RESET; says when it's done. */
function Timer({ minutes, seen }: { minutes: number; seen: boolean }) {
  const [state, setState] = useState<TimerState>({ end: null, left: null });
  const now = useSecond(seen && state.end !== null);
  const length = minutes * 60_000;
  const left = state.end !== null ? Math.max(0, state.end - now.getTime()) : (state.left ?? length);
  const done = state.end !== null && left === 0;

  // One timeout to the end (not a loop): it says so even from a background tab.
  useEffect(() => {
    if (state.end === null) return;
    const t = setTimeout(() => uiStore.getState().showToast('TIMER DONE'), Math.max(0, state.end - Date.now()));
    return () => clearTimeout(t);
  }, [state.end]);

  const start = () => setState({ end: Date.now() + (state.left ?? length), left: null });
  const pause = () => setState({ end: null, left: Math.max(0, (state.end ?? 0) - Date.now()) });
  return (
    <div className={cx('time-row time-tool', done && 'due')}>
      <span className="time-label">TIMER</span>
      {/* Whole seconds rounded up: 25:00 until the first second has gone, 00:00 only when it's done. */}
      <span className="time-value time-big" role="timer" aria-live="off">
        {clockText(left + 999)}
      </span>
      <span className="time-actions">
        {state.end !== null && !done ? (
          <button type="button" className="text-btn small-btn" onClick={pause}>
            PAUSE
          </button>
        ) : (
          <button type="button" className="text-btn small-btn primary" disabled={done} onClick={start}>
            {state.left !== null ? 'RESUME' : 'START'}
          </button>
        )}
        <button type="button" className="text-btn small-btn" disabled={state.end === null && state.left === null} onClick={() => setState({ end: null, left: null })}>
          RESET
        </button>
      </span>
    </div>
  );
}

/** The stopwatch's state: running since `since` with `before` ms banked, or stopped at `before`. */
interface WatchState {
  since: number | null;
  before: number;
}

/** The stopwatch: START / STOP, RESET. */
function Stopwatch({ seen }: { seen: boolean }) {
  const [state, setState] = useState<WatchState>({ since: null, before: 0 });
  const now = useSecond(seen && state.since !== null);
  const elapsed = state.before + (state.since !== null ? Math.max(0, now.getTime() - state.since) : 0);
  return (
    <div className="time-row time-tool">
      <span className="time-label">STOPWATCH</span>
      <span className="time-value time-big" role="timer" aria-live="off">
        {clockText(elapsed)}
      </span>
      <span className="time-actions">
        {state.since !== null ? (
          <button type="button" className="text-btn small-btn" onClick={() => setState({ since: null, before: state.before + Date.now() - state.since! })}>
            STOP
          </button>
        ) : (
          <button type="button" className="text-btn small-btn primary" onClick={() => setState({ ...state, since: Date.now() })}>
            {state.before ? 'RESUME' : 'START'}
          </button>
        )}
        <button type="button" className="text-btn small-btn" disabled={state.since === null && state.before === 0} onClick={() => setState({ since: null, before: 0 })}>
          RESET
        </button>
      </span>
    </div>
  );
}

/** The module's panel. */
export function Panel({ module }: ModuleProps) {
  const seen = useSeen();
  const today = useToday(seen);
  if (module.kind !== 'time') return null;
  return (
    <div className="time-module">
      <Clock seen={seen} />
      <Month today={today} />
      <Countdowns settings={module.settings} today={today} />
      <Timer minutes={module.settings.timerMinutes} seen={seen} />
      <Stopwatch seen={seen} />
    </div>
  );
}

/** A new countdown's id: unique enough within one module, short to store. */
function newCountdownId(): string {
  return `c${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
}

/** SETTINGS: the timer's length, and the countdowns (add, remove). */
export function Settings({ module }: ModuleProps) {
  const minutesId = useId();
  const labelId = useId();
  const dateId = useId();
  const [label, setLabel] = useState('');
  const [date, setDate] = useState('');
  if (module.kind !== 'time') return null;
  const { settings } = module;
  const save = (next: TimeSettings) => editStore.getState().apply((s) => ({ ...s, modules: setSettings(s.modules, module.id, 'time', next) }));
  const full = settings.countdowns.length >= MAX_COUNTDOWNS;
  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!parseDate(date) || full) return;
    save(addCountdown(settings, newCountdownId(), label, date));
    uiStore.getState().announce(`ADDED A COUNTDOWN TO ${date}`);
    setLabel('');
    setDate('');
  };
  return (
    <div className="settings-group">
      <div className="setting">
        <label htmlFor={minutesId}>TIMER LENGTH (MINUTES)</label>
        <input
          id={minutesId}
          className="module-input boxed number"
          type="number"
          min={TIMER_MIN}
          max={TIMER_MAX}
          step={1}
          defaultValue={settings.timerMinutes}
          // Saved once the number is finished (on leaving the field), not on every digit typed.
          onBlur={(e) => {
            const minutes = clampTimer(Number(e.target.value));
            e.target.value = String(minutes);
            if (minutes !== settings.timerMinutes) save({ ...settings, timerMinutes: minutes });
          }}
        />
      </div>
      <span className="setting-label">COUNTDOWNS · {settings.countdowns.length} OF {MAX_COUNTDOWNS}</span>
      {settings.countdowns.length === 0 ? (
        <p className="small dim">NONE YET.</p>
      ) : (
        <ul className="tile-list">
          {settings.countdowns.map((c) => (
            <li key={c.id} className="tile-list-row">
              <span className="tile-list-title">{c.label}</span>
              <span className="link-host">{c.date}</span>
              <span className="tile-list-actions">
                <button type="button" className="text-btn small-btn danger" aria-label={`Remove ${c.label}`} onClick={() => save(removeCountdown(settings, c.id))}>
                  ✕
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <form className="tile-add" onSubmit={add}>
        <label className="setting-label" htmlFor={labelId}>
          + COUNTDOWN · LABEL
        </label>
        <input id={labelId} className="module-input boxed" type="text" placeholder="LAUNCH" autoComplete="off" value={label} onChange={(e) => setLabel(e.target.value)} />
        <label className="setting-label" htmlFor={dateId}>
          DATE
        </label>
        <input id={dateId} className="module-input boxed" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <div className="button-row">
          <button type="submit" className="text-btn small-btn primary" disabled={!parseDate(date) || full}>
            + COUNTDOWN
          </button>
          {full && <span className="small dim">FULL: REMOVE ONE FIRST.</span>}
        </div>
      </form>
    </div>
  );
}
