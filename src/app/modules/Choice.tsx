/**
 * src/app/modules/Choice.tsx: a setting with two answers, as a segmented
 * pair of radio buttons (SHOW | HIDE, 24H | 12H): CLOCK's SETTINGS, and every
 * module's SHOW TITLE (0.27.0).
 *
 * Layer: UI.
 */
import { useId } from 'react';

/** One on/off choice, as two radio buttons (keyboard-friendly, as the other settings are). */
export function Choice(props: { label: string; name: string; on: boolean; onLabel: string; offLabel: string; set: (on: boolean) => void }) {
  const id = useId();
  return (
    <div className="setting">
      <span id={id}>{props.label}</span>
      <div className="segmented" role="radiogroup" aria-labelledby={id}>
        <label>
          <input className="sr-only" type="radio" name={props.name} checked={props.on} onChange={() => props.set(true)} />
          <span>{props.onLabel}</span>
        </label>
        <label>
          <input className="sr-only" type="radio" name={props.name} checked={!props.on} onChange={() => props.set(false)} />
          <span>{props.offLabel}</span>
        </label>
      </div>
    </div>
  );
}

