/**
 * src/lib/clock.ts: the CLOCK module's rules: what it shows, and how its
 * time reads.
 *
 * Layer: pure lib. The CLOCK module is a big clock and nothing else (the
 * TIME module keeps countdowns, the timer and the stopwatch). Its digits fill
 * the module's width, so resizing the module resizes the clock.
 */

/** The CLOCK module's settings. */
export interface ClockSettings {
  /** Show seconds (the clock then ticks every second; without them, every minute). */
  seconds: boolean;
  /** 24-hour time; off shows 12-hour time with AM/PM. */
  hour24: boolean;
  /** Show the date under the time. */
  date: boolean;
}

/** A new CLOCK module's settings: 24-hour time with seconds and the date. */
export function defaultClock(): ClockSettings {
  return { seconds: true, hour24: true, date: true };
}

/** CLOCK settings read from storage or a file: anything missing or malformed takes its default. */
export function normalizeClock(v: unknown): ClockSettings {
  const d = defaultClock();
  if (!v || typeof v !== 'object' || Array.isArray(v)) return d;
  const r = v as Record<string, unknown>;
  const flag = (x: unknown, fallback: boolean) => (typeof x === 'boolean' ? x : fallback);
  return { seconds: flag(r.seconds, d.seconds), hour24: flag(r.hour24, d.hour24), date: flag(r.date, d.date) };
}

/** The clock's digits for `now`: `14:07:33`, `14:07`, or 12-hour `2:07:33` with its `PM` apart. */
export function clockFace(now: Date, settings: ClockSettings): { time: string; suffix: string } {
  const pad = (n: number) => String(n).padStart(2, '0');
  const h = now.getHours();
  const hour = settings.hour24 ? pad(h) : String(h % 12 || 12);
  const time = `${hour}:${pad(now.getMinutes())}${settings.seconds ? `:${pad(now.getSeconds())}` : ''}`;
  return { time, suffix: settings.hour24 ? '' : h < 12 ? 'AM' : 'PM' };
}

/** Milliseconds from `now` to the clock's next change: the next second, or the next minute without seconds. */
export function nextTick(now: Date, seconds: boolean): number {
  const toSecond = 1000 - now.getMilliseconds();
  return seconds ? toSecond : (59 - now.getSeconds()) * 1000 + toSecond;
}
