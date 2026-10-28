/**
 * src/lib/countdown.ts: the COUNTDOWN module's rules (0.25.0): a count down
 * to a date (and a time on it) you choose, with a label, in big digits:
 * days, hours, minutes and seconds left.
 *
 * Layer: pure lib (the time is passed in, so tests drive it).
 *
 * The date and time are the browser's own, as you'd read them off a
 * calendar (`YYYY-MM-DD` and `HH:MM`, as `<input type="date">` and
 * `<input type="time">` give them), so a countdown to 09:00 on the 25th
 * still ends at 09:00 there after a clock change. It replaces 0.24.0's
 * TIMER (a stand-alone timer of a few minutes): schema 7 turns a TIMER into
 * a COUNTDOWN (`fromTimer`).
 */
import { dateKey, parseDate } from './time';

/** The COUNTDOWN module's settings. */
export interface CountdownSettings {
  /** A name shown over the digits (LAUNCH, HOLIDAY…); '' for none. */
  label: string;
  /** The day it counts to (`YYYY-MM-DD`); '' until one is chosen. */
  date: string;
  /** The time on that day (`HH:MM`, 24-hour); midnight, the day's start, unless chosen. */
  time: string;
}

/** The longest label. */
export const MAX_COUNTDOWN_LABEL = 32;
/** The time on its day until one is chosen: the day's start. */
export const DEFAULT_COUNTDOWN_TIME = '00:00';

/** A new COUNTDOWN module's settings: no label, no date yet. */
export function defaultCountdown(): CountdownSettings {
  return { label: '', date: '', time: DEFAULT_COUNTDOWN_TIME };
}

/** The hours and minutes of an `HH:MM` time, or null if it isn't one. */
export function parseTime(time: string): { h: number; m: number } | null {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return null;
  const [h, m] = [Number(match[1]), Number(match[2])];
  return h < 24 && m < 60 ? { h, m } : null;
}

/** A label: spaces squeezed, trimmed, capped, upper case (the terminal look); '' stays ''. */
export function cleanCountdownLabel(label: string): string {
  return label.replace(/\s+/g, ' ').trim().slice(0, MAX_COUNTDOWN_LABEL).trim().toUpperCase();
}

/** COUNTDOWN settings read from storage or a file: a date that isn't real is none, a time that isn't one is midnight. */
export function normalizeCountdown(v: unknown): CountdownSettings {
  const d = defaultCountdown();
  if (!v || typeof v !== 'object' || Array.isArray(v)) return d;
  const r = v as Record<string, unknown>;
  return {
    label: typeof r.label === 'string' ? cleanCountdownLabel(r.label) : '',
    date: typeof r.date === 'string' && parseDate(r.date) ? r.date : '',
    time: typeof r.time === 'string' && parseTime(r.time) ? r.time : DEFAULT_COUNTDOWN_TIME,
  };
}

/** When it ends (epoch ms, the browser's time zone), or null with no date chosen. */
export function countdownTarget(s: CountdownSettings): number | null {
  const day = parseDate(s.date);
  if (!day) return null;
  const t = parseTime(s.time) ?? { h: 0, m: 0 };
  return new Date(day.y, day.m - 1, day.d, t.h, t.m).getTime();
}

/** What's left, split for the digits: whole days, then hours, minutes and seconds (rounded up, so 0 only once it's reached). */
export function countdownParts(leftMs: number): { days: number; h: number; m: number; s: number } {
  const total = Math.max(0, Math.ceil(leftMs / 1000));
  return { days: Math.floor(total / 86_400), h: Math.floor((total % 86_400) / 3600), m: Math.floor((total % 3600) / 60), s: total % 60 };
}

/** Two digits. */
export const pad2 = (n: number): string => String(n).padStart(2, '0');

/** How it reads for a screen reader and the toast: `12 DAYS 04:32:10`. */
export function countdownText(leftMs: number): string {
  const p = countdownParts(leftMs);
  return `${p.days} DAY${p.days === 1 ? '' : 'S'} ${pad2(p.h)}:${pad2(p.m)}:${pad2(p.s)}`;
}

/**
 * A 0.24.0 TIMER's settings as a COUNTDOWN's (schema 6 → 7): its label is
 * kept; one that was running counts down to the minute it would have ended
 * (rounded up); any other has no date yet.
 */
export function fromTimer(v: unknown): CountdownSettings {
  const r = v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  const label = typeof r.label === 'string' ? cleanCountdownLabel(r.label) : '';
  if (typeof r.end !== 'number' || !Number.isFinite(r.end) || r.end <= 0) return { ...defaultCountdown(), label };
  const end = new Date(Math.ceil(r.end / 60_000) * 60_000);
  return { label, date: dateKey(end), time: `${pad2(end.getHours())}:${pad2(end.getMinutes())}` };
}
