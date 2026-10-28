/**
 * src/app/modules/TimerModule.tsx: the TIMER module (0.24.0): a stand-alone
 * countdown with big digits, and its SETTINGS (a label, the length).
 *
 *   ┌ > TIMER ────────────────────┐
 *   │           FOCUS             │   the label, if any
 *   │          24:59              │   digits as wide as the module allows
 *   │      [ PAUSE ]  [ RESET ]   │
 *   └─────────────────────────────┘
 *
 * Layer: UI. The rules are lib/timer.ts. Its state (when it ends, or what's
 * left while paused) is saved straight to the layout, not as an UNDO step
 * (as TIME's fold is), so it keeps running through a reload. The digits are
 * CLOCK's (app.css .clock-module): sized from the module's width. Battery
 * first: it reads the time once a second only while it runs and the page
 * can be seen (useNow), and one timeout to its end says when it's done, even
 * from a background tab.
 */
import { type FormEvent, useEffect, useId, useState } from 'react';

import { setSettings } from '@/lib/modules';
import { type TimerSettings, MAX_TIMER_LABEL, cleanTimerLabel, pauseTimer, resetTimer, splitSeconds, startTimer, timerDone, timerLeft, timerText, withLength } from '@/lib/timer';
import { editStore } from '@/store/edit';
import { layoutStore } from '@/store/instance';
import { uiStore } from '@/store/ui';

import { cx } from '../cx';
import type { ModuleProps } from './catalog';
import { useSecond, useSeen } from './useNow';

/** Saves module `id`'s running state straight to the layout (START, PAUSE, RESET are not UNDO steps). */
function saveState(id: string, next: TimerSettings): void {
  const store = layoutStore().getState();
  store.setModules(setSettings(store.layout.modules, id, 'timer', next));
}

/** How long after its end a timer still says it's done when the page opens (ms): one that ran out long ago just shows 00:00. */
const LATE_NOTICE_MS = 5000;

/** The module's panel: the label, the digits, START / PAUSE / RESUME and RESET. */
export function Panel({ module }: ModuleProps) {
  const seen = useSeen();
  const settings = module.kind === 'timer' ? module.settings : null;
  // Run out: set by the timeout at its end (the last second's read can fall just short of it).
  const [over, setOver] = useState(false);
  // Ticking only while it's set to end and still going.
  const now = useSecond(seen && settings?.end != null && !over).getTime();
  const end = settings?.end ?? null;
  const label = settings?.label ?? '';

  // One timeout to the end (not a loop): it stops the ticking and says so, even from a background tab.
  // One that ran out before the page opened (a while back) fires at once and just shows done, no notice.
  useEffect(() => {
    if (end === null) return;
    const wait = end - Date.now();
    const t = setTimeout(
      () => {
        setOver(true);
        if (wait >= -LATE_NOTICE_MS) uiStore.getState().showToast(`TIMER DONE${label ? ` · ${label}` : ''}`);
      },
      Math.max(0, wait),
    );
    return () => clearTimeout(t);
  }, [end, label]);

  if (!settings) return null;
  const done = over || timerDone(settings, now);
  const left = done ? 0 : timerLeft(settings, now);
  const running = settings.end !== null && !done;
  const text = timerText(left);
  const act = (next: TimerSettings) => {
    setOver(false);
    saveState(module.id, next);
  };
  return (
    <div className={cx('clock-module timer-module', done && 'due')}>
      {settings.label && <span className="clock-date timer-label">{settings.label}</span>}
      {/* Seven characters or more (1:04:07) take CLOCK's with-seconds size, so they still fit the width. */}
      <span className={cx('clock-digits', text.length > 5 && 'with-seconds')} role="timer" aria-live="off" aria-label={`${settings.label || 'Timer'}: ${text} left`}>
        {text}
      </span>
      <span className="time-actions timer-actions">
        {running ? (
          <button type="button" className="text-btn small-btn" onClick={() => act(pauseTimer(settings, Date.now()))}>
            PAUSE
          </button>
        ) : (
          <button type="button" className="text-btn small-btn primary" disabled={done} onClick={() => act(startTimer(settings, Date.now()))}>
            {settings.left !== null ? 'RESUME' : 'START'}
          </button>
        )}
        <button type="button" className="text-btn small-btn" disabled={settings.end === null && settings.left === null} onClick={() => act(resetTimer(settings))}>
          RESET
        </button>
      </span>
    </div>
  );
}

/** SETTINGS: the label, and the length (hours, minutes, seconds; a new length resets it). Each change is one undoable step. */
export function Settings({ module }: ModuleProps) {
  const labelId = useId();
  const lengthId = useId();
  const parts = splitSeconds(module.kind === 'timer' ? module.settings.seconds : 0);
  const [h, setH] = useState(String(parts.h));
  const [m, setM] = useState(String(parts.m));
  const [s, setS] = useState(String(parts.s));
  if (module.kind !== 'timer') return null;
  const { settings } = module;
  const save = (next: TimerSettings) => editStore.getState().apply((st) => ({ ...st, modules: setSettings(st.modules, module.id, 'timer', next) }));
  const setLength = (e: FormEvent) => {
    e.preventDefault();
    const seconds = (Number(h) || 0) * 3600 + (Number(m) || 0) * 60 + (Number(s) || 0);
    const next = withLength(settings, seconds);
    // What was saved (clamped), back in the fields.
    const p = splitSeconds(next.seconds);
    setH(String(p.h));
    setM(String(p.m));
    setS(String(p.s));
    if (next.seconds !== settings.seconds || settings.end !== null || settings.left !== null) {
      save(next);
      uiStore.getState().announce(`TIMER SET TO ${timerText(next.seconds * 1000 - 999)}`);
    }
  };
  const field = (value: string, set: (v: string) => void, name: string, max: number) => (
    <input className="module-input boxed number timer-part" type="number" min={0} max={max} step={1} value={value} aria-label={name} onChange={(e) => set(e.target.value)} />
  );
  return (
    <div className="settings-group">
      <div className="setting">
        <label htmlFor={labelId}>LABEL</label>
        <input
          id={labelId}
          className="module-input boxed"
          type="text"
          placeholder="FOCUS"
          maxLength={MAX_TIMER_LABEL}
          autoComplete="off"
          defaultValue={settings.label}
          // Saved on leaving the field, not on every letter typed.
          onBlur={(e) => {
            const label = cleanTimerLabel(e.target.value);
            e.target.value = label;
            if (label !== settings.label) save({ ...settings, label });
          }}
        />
      </div>
      <form className="setting" onSubmit={setLength} aria-labelledby={lengthId}>
        <span id={lengthId}>LENGTH · H M S</span>
        <span className="timer-length">
          {field(h, setH, 'Hours', 99)}
          {field(m, setM, 'Minutes', 59)}
          {field(s, setS, 'Seconds', 59)}
          <button type="submit" className="text-btn small-btn primary">
            SET
          </button>
        </span>
      </form>
      <p className="small dim">SET RESETS THE TIMER TO ITS NEW LENGTH. A RUNNING TIMER KEEPS GOING THROUGH A RELOAD.</p>
    </div>
  );
}
