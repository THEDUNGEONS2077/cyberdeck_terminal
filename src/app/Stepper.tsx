/**
 * src/app/Stepper.tsx: a value stepped with buttons (− value + RESET), used
 * by SYSTEM ▸ APPEARANCE's sizes and each module's own sizes.
 *
 * Layer: UI.
 */
import { percentLabel, stepOf } from '@/lib/scale';

/**
 * A value stepped with buttons: − value + RESET. `step` moves a step from
 * a value (`direction` 1 up, -1 down); − and + are off at either end, RESET
 * at `fallback`.
 */
export function Stepper(props: {
  labelledBy: string;
  value: number;
  steps: readonly number[];
  fallback: number;
  less: string;
  more: string;
  reset: string;
  onChange: (next: number) => void;
  step?: (value: number, direction: 1 | -1) => number;
  label?: (value: number) => string;
  /** The RESET button's text (RESET unless given). */
  resetText?: string;
}) {
  const { value, steps, fallback, onChange } = props;
  const step = props.step ?? ((v: number, d: 1 | -1) => stepOf(steps, v, d, fallback));
  const label = props.label ?? percentLabel;
  return (
    <div className="stepper" role="group" aria-labelledby={props.labelledBy}>
      <button type="button" className="text-btn" aria-label={props.less} disabled={value <= steps[0]!} onClick={() => onChange(step(value, -1))}>
        −
      </button>
      <output className="stepper-value" aria-live="polite">
        {label(value)}
      </output>
      <button type="button" className="text-btn" aria-label={props.more} disabled={value >= steps[steps.length - 1]!} onClick={() => onChange(step(value, 1))}>
        +
      </button>
      <button type="button" className="text-btn" aria-label={props.reset} disabled={value === fallback} onClick={() => onChange(fallback)}>
        {props.resetText ?? 'RESET'}
      </button>
    </div>
  );
}
