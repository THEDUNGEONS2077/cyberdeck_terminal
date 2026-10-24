/**
 * src/lib/time.ts: the TIME module's rules: its countdowns, and how the
 * timer and stopwatch read.
 *
 * Layer: pure lib. Dates are calendar days in the browser's own time zone
 * (`YYYY-MM-DD`, as an `<input type="date">` gives them); days between two
 * dates are counted on the calendar, so a clock change never makes a day
 * 23 or 25 hours long.
 */

/** A countdown: your label, and the day it counts to. */
export interface Countdown {
  id: string;
  label: string;
  /** `YYYY-MM-DD`. */
  date: string;
}

/** The TIME module's settings. */
export interface TimeSettings {
  countdowns: Countdown[];
  /** The timer's length (minutes) when it's started. */
  timerMinutes: number;
  /** The timer and stopwatch are shown (their fold under the clock is open). */
  toolsOpen: boolean;
}

/** Most countdowns in one module. */
export const MAX_COUNTDOWNS = 12;
/** Longest countdown label kept. */
export const MAX_COUNTDOWN_LABEL = 32;
/** The timer's limits (minutes). */
export const TIMER_MIN = 1;
export const TIMER_MAX = 999;
/** A new module's timer (minutes). */
export const DEFAULT_TIMER = 25;

/** A new TIME module's settings: no countdowns, a 25-minute timer, folded away. */
export function defaultTime(): TimeSettings {
  return { countdowns: [], timerMinutes: DEFAULT_TIMER, toolsOpen: false };
}

/** The year, month (1–12) and day of a `YYYY-MM-DD` date, or null if it isn't a real one. */
export function parseDate(date: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  // Round-tripped through a date, so 2026-02-30 isn't taken for March.
  const check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return null;
  return { y, m, d };
}

/** `now`'s calendar day as `YYYY-MM-DD` (local time). */
export function dateKey(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** A countdown label: trimmed, capped, upper case (the terminal look), never empty. */
export function cleanLabel(label: string): string {
  return label.trim().slice(0, MAX_COUNTDOWN_LABEL).toUpperCase() || 'COUNTDOWN';
}

/** A timer length, whole minutes within the limits. */
export function clampTimer(minutes: number): number {
  return Number.isFinite(minutes) ? Math.min(TIMER_MAX, Math.max(TIMER_MIN, Math.round(minutes))) : DEFAULT_TIMER;
}

/** The settings, checked: countdowns with a real date (each id once), a timer within its limits. */
export function normalizeTime(v: unknown): TimeSettings {
  const out = defaultTime();
  if (!v || typeof v !== 'object' || Array.isArray(v)) return out;
  const s = v as Record<string, unknown>;
  if (typeof s.timerMinutes === 'number') out.timerMinutes = clampTimer(s.timerMinutes);
  out.toolsOpen = s.toolsOpen === true;
  for (const c of Array.isArray(s.countdowns) ? s.countdowns : []) {
    if (out.countdowns.length >= MAX_COUNTDOWNS) break;
    if (!c || typeof c !== 'object') continue;
    const { id, label, date } = c as Record<string, unknown>;
    if (typeof id !== 'string' || !id || id.length > 32 || out.countdowns.some((x) => x.id === id)) continue;
    if (typeof date !== 'string' || !parseDate(date)) continue;
    out.countdowns.push({ id, label: cleanLabel(typeof label === 'string' ? label : ''), date });
  }
  return out;
}

/** Adds a countdown (unchanged if the date isn't real or the module is full). */
export function addCountdown(settings: TimeSettings, id: string, label: string, date: string): TimeSettings {
  if (!parseDate(date) || settings.countdowns.length >= MAX_COUNTDOWNS || settings.countdowns.some((c) => c.id === id)) return settings;
  return { ...settings, countdowns: [...settings.countdowns, { id, label: cleanLabel(label), date }] };
}

/** Removes countdown `id`. */
export function removeCountdown(settings: TimeSettings, id: string): TimeSettings {
  return { ...settings, countdowns: settings.countdowns.filter((c) => c.id !== id) };
}

/** Calendar days from `now`'s day to `date` (negative once it's past); null for a date that isn't real. */
export function daysUntil(date: string, now: Date): number | null {
  const p = parseDate(date);
  if (!p) return null;
  // Both days at UTC midnight: whole days, whatever the clocks did in between.
  const to = Date.UTC(p.y, p.m - 1, p.d);
  const from = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((to - from) / 86_400_000);
}

/** How a countdown reads: `TODAY`, `TOMORROW`, `12 DAYS`, `3 DAYS AGO`. */
export function countdownText(days: number): string {
  if (days === 0) return 'TODAY';
  if (days === 1) return 'TOMORROW';
  if (days === -1) return 'YESTERDAY';
  return days > 0 ? `${days} DAYS` : `${-days} DAYS AGO`;
}

/** Countdowns soonest first; past ones after the coming ones, the most recent first. */
export function sortCountdowns(list: readonly Countdown[], now: Date): Countdown[] {
  const days = (c: Countdown) => daysUntil(c.date, now) ?? 0;
  return [...list].sort((a, b) => {
    const [da, db] = [days(a), days(b)];
    if (da >= 0 !== db >= 0) return da >= 0 ? -1 : 1;
    return da >= 0 ? da - db : db - da;
  });
}

/** A length of time as the timer and stopwatch show it: `04:07`, or `1:04:07` from an hour up. Never negative. */
export function clockText(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
