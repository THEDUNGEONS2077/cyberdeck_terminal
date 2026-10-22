/**
 * src/app/Dialog.tsx: a modal panel: a dimmed backdrop and a framed box
 * with a title, any content, and a ✕.
 *
 * Layer: UI. Trimmed from quest_log_desktop's src/app/Dialog.tsx to a
 * general container (the SYSTEM panel is its first user). Keyboard rules
 * carried over:
 *   - focus moves into the dialog as it opens (its first control);
 *   - Tab and Shift+Tab cycle inside it (it's modal);
 *   - Esc, ✕ or a click on the backdrop closes it;
 *   - while it fades out (`leaving`) it gives the keyboard back at once.
 */
import { type KeyboardEvent, type ReactNode, useId, useLayoutEffect, useRef } from 'react';

import { cx } from './cx';
import { G } from './glyphs';
import { Prompted } from './Prompted';
import { useReleaseFocus } from './usePresence';

/** What can take the keyboard inside the dialog, in order. */
const FOCUSABLE = 'input:not(:disabled), select:not(:disabled), button:not(:disabled), [tabindex="0"]';

/** A modal dialog titled `title`; `leaving` while it fades out (app/usePresence.ts). */
export function Dialog({ title, onClose, leaving = false, wide = false, children }: { title: string; onClose: () => void; leaving?: boolean; wide?: boolean; children: ReactNode }) {
  const layer = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useReleaseFocus(layer, leaving);

  // Into the dialog as it opens: its first control after the ✕ (or the ✕).
  useLayoutEffect(() => {
    const items = box.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
    (items?.[1] ?? items?.[0])?.focus();
  }, []);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (leaving) return; // closing: keys belong to the page again
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
    // Modal: Tab cycles through the dialog's own controls.
    if (e.key === 'Tab') {
      const items = [...e.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const at = items.indexOf(document.activeElement as HTMLElement);
      const next = items[(at + (e.shiftKey ? -1 : 1) + items.length) % items.length];
      if (next) {
        e.preventDefault();
        next.focus();
      }
    }
    // The page's shortcuts don't see keys meant for the dialog.
    e.stopPropagation();
  };

  return (
    <div ref={layer} className={cx('dialog-layer', leaving && 'leaving')} onMouseDown={onClose} inert={leaving}>
      <div
        ref={box}
        className={cx('dialog', wide && 'wide')}
        role="dialog"
        aria-modal
        aria-labelledby={titleId}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="dialog-head">
          <h2 id={titleId} className="dialog-title">
            <Prompted>{title}</Prompted>
          </h2>
          <button type="button" className="icon-btn" aria-label="Close" title="Close (Esc)" onClick={onClose}>
            {G.close}
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
