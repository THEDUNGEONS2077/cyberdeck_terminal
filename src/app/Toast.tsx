/**
 * src/app/Toast.tsx: the message at the bottom of the screen.
 *
 * Layer: UI. Trimmed from quest_log_desktop's src/app/Toast.tsx:
 *   - a toast stays TOAST_MS, its clock shown as a hairline shrinking
 *     along its bottom edge;
 *   - the clock stops while the pointer or keyboard is on the toast, so a
 *     button can't vanish under your hand (WCAG 2.2.1);
 *   - a `sticky` toast (the backup reminder) has no clock: it waits for
 *     an answer (EXPORT, LATER);
 *   - it slides in, and slides back down and fades as it goes.
 */
import { useEffect, useRef, useState } from 'react';

import { layoutStore } from '@/store/instance';
import { uiStore } from '@/store/ui';

import { downloadBackup } from './backupFile';
import { cx } from './cx';
import { useUi } from './hooks';
import { usePresence } from './usePresence';

/** How long a toast stays (ms), unless held. */
export const TOAST_MS = 5000;

/** How long a dismissed toast takes to leave (matches --base in theme.css). */
const EXIT_MS = 200;

/** The current toast, if any. */
export function Toast() {
  const toast = useUi((s) => s.toast);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const held = hovered || focused;
  // A new toast starts unheld (the previous-props pattern).
  const [toastKey, setToastKey] = useState(toast?.key);
  if (toastKey !== toast?.key) {
    setToastKey(toast?.key);
    setHovered(false);
    setFocused(false);
  }

  // The time this toast has left: a full clock for each new one, less what ran before a hold.
  const left = useRef(TOAST_MS);
  useEffect(() => {
    left.current = TOAST_MS;
  }, [toast?.key]);
  useEffect(() => {
    if (!toast || toast.sticky || held) return;
    const started = performance.now();
    const t = setTimeout(() => uiStore.getState().dismissToast(toast.key), left.current);
    return () => {
      clearTimeout(t);
      left.current = Math.max(0, left.current - (performance.now() - started));
    };
  }, [toast, held]);

  const { shown, leaving } = usePresence(toast, EXIT_MS);
  if (!shown) return null;
  const dismiss = () => uiStore.getState().dismissToast(shown.key);
  return (
    <div
      key={shown.key}
      className={cx('toast', leaving && 'leaving', held && 'held')}
      role="status"
      aria-live="polite"
      inert={leaving}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}
    >
      <span>{shown.message}</span>
      {shown.action === 'export' && (
        <>
          <button
            type="button"
            className="text-btn primary"
            onClick={() => {
              dismiss();
              void downloadBackup();
            }}
          >
            EXPORT
          </button>
          <button
            type="button"
            className="text-btn"
            onClick={() => {
              dismiss();
              layoutStore().getState().snoozeReminder();
            }}
          >
            LATER
          </button>
        </>
      )}
      {/* A sticky notice with no question to answer just needs closing. */}
      {shown.sticky && !shown.action && (
        <button type="button" className="icon-btn" aria-label="Dismiss" onClick={dismiss}>
          ✕
        </button>
      )}
      {!shown.sticky && <span className="toast-clock" style={{ animationDuration: `${TOAST_MS}ms` }} aria-hidden />}
    </div>
  );
}
