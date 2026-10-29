/**
 * src/app/modules/ClockModule.tsx: the CLOCK module: a big clock and
 * nothing else, and its SETTINGS (seconds, 12/24-hour, the date).
 *
 *   ┌──────────────────────────────┐
 *   │   14:07:33                   │   digits as wide as the module allows
 *   │   TUE 27 OCT 2026            │   the date, if shown
 *   └──────────────────────────────┘
 *
 * Layer: UI. The digits are sized from the module's own width (a container
 * query, app.css .clock-module), so widening the module with its resize
 * edge enlarges the clock; its TEXT SIZE scales them on top. Battery first:
 * it reads the time once a second (once a minute without seconds), and only
 * while the page can be seen (app/modules/useNow.ts).
 */
import { type ClockSettings, clockFace } from '@/lib/clock';
import { setSettings } from '@/lib/modules';
import { editStore } from '@/store/edit';

import type { ModuleProps } from './catalog';
import { Choice } from './Choice';
import { useNow, useSeen } from './useNow';

// Made once (a formatter per call, every second, was a cost the brand clock already learnt).
const DATE = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });

/** The module's panel: the time, and the date under it. */
export function Panel({ module }: ModuleProps) {
  const seen = useSeen();
  const seconds = module.kind === 'clock' && module.settings.seconds;
  const now = useNow(seen, seconds);
  if (module.kind !== 'clock') return null;
  const { settings } = module;
  const { time, suffix } = clockFace(now, settings);
  return (
    <div className="clock-module">
      <time className={`clock-digits${settings.seconds ? ' with-seconds' : ''}`} dateTime={now.toISOString()}>
        {time}
        {suffix && <span className="clock-suffix">{suffix}</span>}
      </time>
      {settings.date && <span className="clock-date dim">{DATE.format(now).replace(/,/g, '').toUpperCase()}</span>}
    </div>
  );
}

/** SETTINGS: seconds, 12/24-hour, the date. Each change is one undoable step. */
export function Settings({ module }: ModuleProps) {
  if (module.kind !== 'clock') return null;
  const { settings } = module;
  const save = (next: ClockSettings) => editStore.getState().apply((s) => ({ ...s, modules: setSettings(s.modules, module.id, 'clock', next) }));
  return (
    <div className="settings-group">
      <Choice label="FORMAT" name={`hour24-${module.id}`} on={settings.hour24} onLabel="24-HOUR" offLabel="12-HOUR" set={(hour24) => save({ ...settings, hour24 })} />
      <Choice label="SECONDS" name={`seconds-${module.id}`} on={settings.seconds} onLabel="SHOW" offLabel="HIDE" set={(seconds) => save({ ...settings, seconds })} />
      <Choice label="DATE" name={`date-${module.id}`} on={settings.date} onLabel="SHOW" offLabel="HIDE" set={(date) => save({ ...settings, date })} />
    </div>
  );
}
