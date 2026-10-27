/**
 * src/app/modules/TimeModule.tsx: the TIME module: a large clock, your
 * countdowns, and a timer and a stopwatch folded away under them; and its
 * SETTINGS (the timer's length, the countdowns).
 *
 *   14:07:33                      THU 24 OCT 2026
 *   LAUNCH ············· 12 DAYS  ← countdowns, soonest first
 *   ▸ TIMER · STOPWATCH           ← a fold (user request, 2026-10-24: no calendar)
 *     TIMER 25:00  [START] [RESET]
 *     STOPWATCH 00:00 [START] [RESET]
 *
 * Layer: UI. Battery first, as the wallpapers are: nothing loops. Only the
 * parts that change redraw: the clock once a second, the countdowns at
 * midnight, the timer and stopwatch once a second while they run and their
 * fold is open. And they tick only while you can see them: not while the
 * tab is in the background, nor in immersive mode (the UI is hidden).
 * Whether the fold is open is kept with the module, as a folder's is (not
 * an undo step). Coming back,
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
  parseDate,
  removeCountdown,
  sortCountdowns,
} from '@/lib/time';
import { editStore } from '@/store/edit';
import { layoutStore } from '@/store/instance';
import { uiStore } from '@/store/ui';

import { cx } from '../cx';
import { G } from '../glyphs';
import { useSecond, useSeen } from './useNow';
import { TIMER_EVENT, type TimerCommand } from './actions';
import type { ModuleProps } from './catalog';

// Made once (a formatter per call, every second, was a cost the brand clock already learnt).
const TIME = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const DATE = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });

/** Today, updated just after midnight (and when the page is seen again, in case midnight passed unseen): the countdowns' day. */
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

/**
 * The timer's state: running toward `end` (with `left` ms to go when it
 * started), or stopped with `left` ms to go; both null: not started.
 */
interface TimerState {
  end: number | null;
  left: number | null;
}

/** The timer: START / PAUSE, RESET; says when it's done. */
function Timer({ id, minutes, seen }: { id: string; minutes: number; seen: boolean }) {
  const [state, setState] = useState<TimerState>({ end: null, left: null });
  const now = useSecond(seen && state.end !== null);
  const length = minutes * 60_000;
  const from = state.left ?? length;
  // Never more than it started with: the clock read just before START would otherwise show 25:01 for a moment.
  const left = state.end !== null ? Math.min(from, Math.max(0, state.end - now.getTime())) : from;
  const done = state.end !== null && left === 0;

  // One timeout to the end (not a loop): it says so even from a background tab.
  useEffect(() => {
    if (state.end === null) return;
    const t = setTimeout(() => uiStore.getState().showToast('TIMER DONE'), Math.max(0, state.end - Date.now()));
    return () => clearTimeout(t);
  }, [state.end]);

  const start = () => setState({ end: Date.now() + from, left: from });
  const pause = () => setState({ end: null, left: Math.max(0, (state.end ?? 0) - Date.now()) });
  const running = state.end !== null && !done;

  // The finder's START TIMER / STOP TIMER (modules/actions.ts timerCommand), for this module.
  useEffect(() => {
    const on = (e: Event) => {
      const { detail } = e as CustomEvent<TimerCommand>;
      if (detail.id !== id) return;
      if (detail.action === 'start' && !running) setState({ end: Date.now() + (state.left ?? minutes * 60_000), left: state.left ?? minutes * 60_000 });
      else if (detail.action === 'stop' && running) setState({ end: null, left: Math.max(0, (state.end ?? 0) - Date.now()) });
    };
    window.addEventListener(TIMER_EVENT, on);
    return () => window.removeEventListener(TIMER_EVENT, on);
  }, [id, running, state, minutes]);
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
            {state.left !== null && state.end === null ? 'RESUME' : 'START'}
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
  const foldId = useId();
  const open = module.kind === 'time' && module.settings.toolsOpen;
  // START TIMER from the finder opens the fold too, so the timer is seen running.
  useEffect(() => {
    const on = (e: Event) => {
      const { detail } = e as CustomEvent<TimerCommand>;
      if (detail.id !== module.id || detail.action !== 'start' || open || module.kind !== 'time') return;
      const store = layoutStore().getState();
      store.setModules(setSettings(store.layout.modules, module.id, 'time', { ...module.settings, toolsOpen: true }));
    };
    window.addEventListener(TIMER_EVENT, on);
    return () => window.removeEventListener(TIMER_EVENT, on);
  }, [module, open]);
  if (module.kind !== 'time') return null;
  const { settings } = module;
  // Kept with the layout straight away, like a folder's fold (not an undo step).
  const toggle = () => {
    const store = layoutStore().getState();
    store.setModules(setSettings(store.layout.modules, module.id, 'time', { ...settings, toolsOpen: !open }));
  };
  return (
    <div className="time-module">
      <Clock seen={seen} />
      <Countdowns settings={settings} today={today} />
      <button type="button" className="time-toggle" aria-expanded={open} aria-controls={foldId} onClick={toggle}>
        <span className={cx('caret', open && 'open')} aria-hidden>
          {G.caret}
        </span>
        TIMER · STOPWATCH
      </button>
      {/* Folded, they stay (a running timer keeps its time, and still says when it's done) but don't tick. */}
      <div className={cx('time-fold', open && 'open')} id={foldId} inert={!open}>
        <div className="time-fold-inner">
          <Timer id={module.id} minutes={settings.timerMinutes} seen={seen && open} />
          <Stopwatch seen={seen && open} />
        </div>
      </div>
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
