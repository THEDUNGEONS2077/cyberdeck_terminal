/**
 * src/app/uiScale.ts: UI SCALE from the keyboard ([ and ]) and the finder
 * (SYSTEM ▸ APPEARANCE ▸ UI SCALE does it with buttons).
 *
 * Layer: UI. The scale is the layout's (prefs.uiScale; lib/scale.ts); it
 * steps through UI_SCALE_STEPS, and a toast says where it is.
 */
import { DEFAULT_UI_SCALE, UI_SCALE_STEPS, percentLabel, stepOf } from '@/lib/scale';
import { layoutStore } from '@/store/instance';
import { uiStore } from '@/store/ui';

/** Makes the dashboard a step bigger or smaller, or back to 100%, and says so. */
export function scaleUi(how: 'up' | 'down' | 'reset'): void {
  const { layout, setSizes } = layoutStore().getState();
  const next = how === 'reset' ? DEFAULT_UI_SCALE : stepOf(UI_SCALE_STEPS, layout.prefs.uiScale, how === 'up' ? 1 : -1, DEFAULT_UI_SCALE);
  setSizes({ uiScale: next });
  uiStore.getState().showToast(`UI SCALE ${percentLabel(next)}`);
}
