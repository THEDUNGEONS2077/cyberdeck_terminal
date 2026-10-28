/**
 * src/lib/timer.ts: the TIMER module's rules (0.24.0): a stand-alone
 * countdown with big digits, its length and label, and whether it's
 * running.
 *
 * Layer: pure lib (the time is passed in, so tests drive it).
 *
 * Unlike TIME's little timer, this one keeps running through a reload: its
 * state (when it ends, or how much was left when paused) is saved in the
 * module's settings, straight to the layout (not an UNDO step, as TIME's
 * fold isn't), so closing the tab or reopening the dashboard finds it where
 * it was, or done.
 */
import { clockText } from './time';

/** The TIMER module's settings and state. */
export interface TimerSettings {
  /** A name shown over the digits (FOCUS, TEA…); '' for none. */
  label: string;
  /** Its length (seconds). */
  seconds: number;
  /** Running: when it ends (epoch ms); else null. */
  end: number | null;
  /** Paused: how much was left (ms); else null. Both null: not started (or reset). */
  left: number | null;
}

/** Its length's limits (seconds): one second to 99 hours. */
export const MIN_TIMER_SECONDS = 1;
export const MAX_TIMER_SECONDS = 99 * 3600;
/** A new TIMER's length: 25 minutes. */
export const DEFAULT_TIMER_SECONDS = 25 * 60;
/** The longest label. */
export const MAX_TIMER_LABEL = 24;

/** A new TIMER module's settings: 25 minutes, no label, not started. */
export function defaultTimer(): TimerSettings {
  return { label: '', seconds: DEFAULT_TIMER_SECONDS, end: null, left: null };
}

/** A length in whole seconds, within the limits. */
export function clampSeconds(seconds: number): number {
  if (!Number.isFinite(seconds)) return DEFAULT_TIMER_SECONDS;
  return Math.min(MAX_TIMER_SECONDS, Math.max(MIN_TIMER_SECONDS, Math.round(seconds)));
}

/** A label: trimmed, capped, upper case (the terminal look). */
export function cleanTimerLabel(label: string): string {
  return label.replace(/\s+/g, ' ').trim().slice(0, MAX_TIMER_LABEL).trim().toUpperCase();
}

/** TIMER settings read from storage or a file: anything missing or malformed takes its default (a broken state: not started). */
export function normalizeTimer(v: unknown): TimerSettings {
  const d = defaultTimer();
  if (!v || typeof v !== 'object' || Array.isArray(v)) return d;
  const r = v as Record<string, unknown>;
  const time = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? x : null);
  const seconds = typeof r.seconds === 'number' ? clampSeconds(r.seconds) : d.seconds;
  const end = time(r.end);
  // Paused can't hold more than the timer's length; running and paused at once is broken: not started.
  const left = end === null ? time(r.left) : null;
  return { label: typeof r.label === 'string' ? cleanTimerLabel(r.label) : '', seconds, end, left: left === null ? null : Math.min(left, seconds * 1000) };
}

/** How long is left (ms) at `now`: the whole length before it starts, what was left while paused, never below 0. */
export function timerLeft(t: TimerSettings, now: number): number {
  if (t.end !== null) return Math.min(t.seconds * 1000, Math.max(0, t.end - now));
  return t.left ?? t.seconds * 1000;
}

/** Is it running (started, not paused, not yet done) at `now`? */
export function timerRunning(t: TimerSettings, now: number): boolean {
  return t.end !== null && t.end > now;
}

/** Has it run out (it was running and its end has passed)? */
export function timerDone(t: TimerSettings, now: number): boolean {
  return t.end !== null && t.end <= now;
}

/** START or RESUME at `now`: runs from what's left. */
export function startTimer(t: TimerSettings, now: number): TimerSettings {
  return { ...t, end: now + timerLeft(t, now), left: null };
}

/** PAUSE at `now`: keeps what's left. */
export function pauseTimer(t: TimerSettings, now: number): TimerSettings {
  return { ...t, end: null, left: timerLeft(t, now) };
}

/** RESET: back to the whole length, not started. */
export function resetTimer(t: TimerSettings): TimerSettings {
  return { ...t, end: null, left: null };
}

/** A new length (seconds): it also resets (a timer half-run on the old length would make no sense). */
export function withLength(t: TimerSettings, seconds: number): TimerSettings {
  return { ...t, seconds: clampSeconds(seconds), end: null, left: null };
}

/** The digits: whole seconds rounded up (25:00 until the first second has gone, 00:00 only when done), `1:04:07` from an hour up. */
export function timerText(leftMs: number): string {
  return clockText(leftMs + 999);
}

/** A length split for the settings' fields: hours, minutes, seconds. */
export function splitSeconds(seconds: number): { h: number; m: number; s: number } {
  return { h: Math.floor(seconds / 3600), m: Math.floor((seconds % 3600) / 60), s: seconds % 60 };
}
