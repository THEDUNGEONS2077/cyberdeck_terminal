/**
 * src/app/Recovery.tsx: what happens when part of the page fails to draw
 * (1.0): it never takes the layout with it.
 *
 * Layer: UI.
 *   - CrashGuard catches an error while its part draws and shows that
 *     part's fallback instead. A module (app/modules/Modules.tsx) gets one
 *     of its own, so one broken module leaves the rest of the dashboard
 *     standing; the whole page gets one in start.tsx.
 *   - CrashPanel is the whole page's fallback: over the wallpaper (which
 *     runs apart, in its worker, so it keeps going), it says the layout is
 *     safe and offers the ways back: RELOAD, EXPORT BACKUP, and RESTORE
 *     for the newest snapshots. It reads the stores directly rather than
 *     through the app's hooks, which may be what broke.
 *   - CrashTest makes a part fail on purpose, for the browser tests only
 *     (window.__cyberdeck.testCrash), so the real page's recovery is
 *     checked, not just a copy of it.
 */
import { Component, type ErrorInfo, type ReactNode, useEffect, useId, useRef, useState } from 'react';

import { formatStamp } from '@/lib/backup';
import { reasonLabel, type SnapshotInfo } from '@/lib/snapshots';
import { layoutStore } from '@/store/instance';

import { downloadBackup } from './backupFile';
import { useUi } from './hooks';
import { Prompted } from './Prompted';

/** What CrashGuard is given. */
interface GuardProps {
  /** The part it guards, for the console (`the dashboard`, `the CLOCK module`). */
  name: string;
  /** What to show instead once it has failed: the error, and React's trace of where. */
  fallback: (error: Error, details: string) => ReactNode;
  /** When this changes (a module's settings were reset), the part is drawn again. */
  resetKey?: unknown;
  children: ReactNode;
}

/** What CrashGuard keeps: the error (null while all is well), its trace, and the reset key it was caught under. */
interface GuardState {
  error: Error | null;
  details: string;
  key: unknown;
}

/**
 * Draws its children until one of them throws while drawing; from then on,
 * its fallback (until `resetKey` changes). A class: React catches errors
 * only in a class component's getDerivedStateFromError.
 */
export class CrashGuard extends Component<GuardProps, GuardState> {
  override state: GuardState = { error: null, details: '', key: this.props.resetKey };

  /** The error, as an Error even if something else was thrown. */
  static getDerivedStateFromError(error: unknown): Partial<GuardState> {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  /** A new reset key: the part gets another try. */
  static getDerivedStateFromProps(props: GuardProps, state: GuardState): Partial<GuardState> | null {
    return props.resetKey === state.key ? null : { key: props.resetKey, error: null, details: '' };
  }

  /** Keeps React's trace of where it failed, for the fallback's details (React logs the error itself). */
  override componentDidCatch(_error: Error, info: ErrorInfo): void {
    this.setState({ details: info.componentStack ?? '' });
  }

  override render(): ReactNode {
    return this.state.error ? this.props.fallback(this.state.error, this.state.details) : this.props.children;
  }
}

/** How many of the newest snapshots the crash panel offers to restore. */
const CRASH_SNAPSHOTS = 5;

/** The newest snapshots, or none if even the store can't be read. */
function newestSnapshots(): SnapshotInfo[] {
  try {
    return layoutStore().getState().snapshots.slice(0, CRASH_SNAPSHOTS);
  } catch {
    return [];
  }
}

/**
 * The page in place of the dashboard after it failed to draw (start.tsx).
 * Nothing in the layout is lost: it's stored, and snapshots of it are kept.
 * RESTORE first snapshots the layout as it is (layout store), so even that
 * can be undone; the page then reloads into the restored layout.
 */
export function CrashPanel({ error, details }: { error: Error; details: string }) {
  const titleId = useId();
  const reload = useRef<HTMLButtonElement>(null);
  const [snapshots] = useState(newestSnapshots);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  // The keyboard starts on RELOAD, the first way back.
  useEffect(() => reload.current?.focus(), []);

  const exportBackup = async () => {
    try {
      await downloadBackup();
      setStatus('BACKUP EXPORTED');
    } catch {
      setStatus('THE BACKUP COULDN’T BE MADE');
    }
  };

  const restore = async (snap: SnapshotInfo) => {
    setBusy(true);
    // False when the snapshot can't be read, or the store itself can't be reached.
    const ok = await layoutStore()
      .getState()
      .restoreSnapshot(snap.at)
      .catch(() => false);
    if (ok) {
      location.reload();
      return;
    }
    setBusy(false);
    setStatus('THAT SNAPSHOT COULDN’T BE READ · NOTHING CHANGED');
  };

  return (
    <main className="crash-layer">
      <section className="dialog crash" aria-labelledby={titleId}>
        <h1 id={titleId} className="dialog-title">
          <Prompted>THE DASHBOARD HIT AN ERROR</Prompted>
        </h1>
        <p>YOUR LAYOUT IS SAFE: IT’S STORED IN THIS BROWSER, AND RECENT VERSIONS ARE KEPT AS SNAPSHOTS.</p>
        <div className="button-row">
          <button ref={reload} type="button" className="text-btn primary" onClick={() => location.reload()}>
            RELOAD
          </button>
          <button type="button" className="text-btn" onClick={() => void exportBackup()}>
            EXPORT BACKUP
          </button>
        </div>
        {snapshots.length > 0 && (
          <>
            <p className="small dim">IF IT BREAKS AGAIN AFTER RELOADING, RESTORE A SNAPSHOT FROM BEFORE IT BROKE:</p>
            <ul className="snapshot-list">
              {snapshots.map((s) => (
                <li key={s.at} className="snapshot">
                  <div className="snapshot-text">
                    <span className="bright">{formatStamp(s.at)}</span> <span className="accent small">{reasonLabel(s.reason)}</span>
                    <span className="small dim snapshot-summary">{s.summary}</span>
                  </div>
                  <button type="button" className="text-btn" disabled={busy} onClick={() => void restore(s)} aria-label={`Restore the snapshot from ${formatStamp(s.at)}`}>
                    RESTORE
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        <p className="small accent" role="status">
          {status}
        </p>
        <details className="crash-details">
          <summary className="small dim">ERROR DETAILS</summary>
          <pre>
            {error.message}
            {details}
          </pre>
        </details>
      </section>
    </main>
  );
}

/**
 * For the browser tests only (e2e/walk.mjs, through window.__cyberdeck.testCrash):
 * throws while part `target` is the one asked to fail. Draws nothing.
 */
export function CrashTest({ target }: { target: string }) {
  const fail = useUi((s) => s.crashTest === target);
  if (fail) throw new Error(`test crash: ${target}`);
  return null;
}
