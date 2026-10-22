/**
 * src/app/SystemPanel.tsx: the SYSTEM panel (S): backups, restoring a
 * snapshot, the wallpaper, and the keys.
 *
 * Layer: UI. Everything that replaces the layout asks first and says what
 * will happen, and the current layout is always snapshotted before it's
 * replaced (store/layout.ts replaceLayout), so nothing here can lose a layout.
 *
 *   BACKUP     export a file, import one (preview, then REPLACE), the
 *              reminder interval, and when the last export was;
 *   RESTORE    the automatic snapshots, newest first; RESTORE asks to confirm;
 *   WALLPAPER  the wallpapers in the registry;
 *   KEYS       the shortcuts.
 */
import { type ChangeEvent, useId, useRef, useState } from 'react';

import { BackupError, type ParsedBackup, formatStamp } from '@/lib/backup';
import { REMINDER_DAY_CHOICES, summarizeLayout } from '@/lib/layout';
import { exportAge } from '@/lib/reminder';
import { reasonLabel, type Snapshot } from '@/lib/snapshots';
import { layoutStore } from '@/store/instance';
import { uiStore } from '@/store/ui';
import { WALLPAPERS } from '@/wallpaper/registry';

import { APP_INFO, downloadBackup, readBackupFile } from './backupFile';
import { Dialog } from './Dialog';
import { useLayout } from './hooks';
import { Prompted } from './Prompted';

/** The SYSTEM panel; `leaving` while it fades out. */
export function SystemPanel({ leaving }: { leaving: boolean }) {
  const close = () => uiStore.getState().setPanelOpen(false);
  return (
    <Dialog title="SYSTEM" onClose={close} leaving={leaving} wide>
      <div className="panel-body">
        <BackupSection />
        <RestoreSection />
        <WallpaperSection />
        <KeysSection />
        <p className="small dim">
          CYBERDECK_TERMINAL v{APP_INFO.version} (BUILD {APP_INFO.build}) · YOUR LAYOUT STAYS IN THIS BROWSER
        </p>
      </div>
    </Dialog>
  );
}

/** BACKUP: export, import with a preview, the reminder. */
function BackupSection() {
  const meta = useLayout((s) => s.meta);
  const days = useLayout((s) => s.layout.prefs.backupReminderDays);
  // The time the panel opened: "3 DAYS AGO" is counted from it.
  const [now] = useState(() => Date.now());
  const [preview, setPreview] = useState<ParsedBackup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const remindId = useId();

  /** A file was chosen: read and check it, then show what it holds. */
  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // the same file can be chosen again
    if (!file) return;
    setError(null);
    setPreview(null);
    try {
      setPreview(await readBackupFile(file));
    } catch (err) {
      setError(err instanceof BackupError ? err.message : 'That file couldn’t be read.');
    }
  };

  /** REPLACE LAYOUT: snapshot the current layout, then use the backup's. */
  const replace = async () => {
    if (!preview) return;
    setBusy(true);
    await layoutStore().getState().replaceLayout(preview.layout, 'before-import');
    setBusy(false);
    setPreview(null);
    uiStore.getState().showToast('BACKUP IMPORTED · PREVIOUS LAYOUT SAVED IN RESTORE');
  };

  return (
    <section className="settings-group" aria-label="Backup">
      <h3 className="section-title">BACKUP</h3>
      <div className="setting">
        <span>LAST EXPORT</span>
        <span className={meta.lastExportAt === null ? 'accent' : 'bright'}>{exportAge(meta, now)}</span>
      </div>
      <div className="setting">
        <label htmlFor={remindId}>REMIND TO EXPORT AFTER</label>
        <select id={remindId} value={days} onChange={(e) => layoutStore().getState().setReminderDays(Number(e.target.value))}>
          {REMINDER_DAY_CHOICES.map((d) => (
            <option key={d} value={d}>
              {d ? `${d} DAYS` : 'NEVER'}
            </option>
          ))}
        </select>
      </div>
      <div className="button-row">
        <button type="button" className="text-btn primary" onClick={downloadBackup}>
          EXPORT BACKUP
        </button>
        <button type="button" className="text-btn" onClick={() => fileInput.current?.click()}>
          IMPORT BACKUP…
        </button>
        <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={onFile} aria-label="Backup file to import" />
      </div>
      {error && (
        <p className="panel-error" role="alert">
          <Prompted glyph="✕">{error}</Prompted>
        </p>
      )}
      {preview && (
        <div className="import-preview" role="group" aria-label="Backup to import">
          <p className="bright">
            <Prompted>BACKUP {preview.exportedAt ? `FROM ${formatStamp(preview.exportedAt)}` : '(NO DATE)'}</Prompted>
          </p>
          <p className="small">{summarizeLayout(preview.layout)}</p>
          <p className="small dim">REPLACES THE CURRENT LAYOUT. THE CURRENT ONE IS SNAPSHOTTED FIRST, SO RESTORE CAN BRING IT BACK.</p>
          <div className="button-row">
            <button type="button" className="text-btn primary" disabled={busy} onClick={replace}>
              REPLACE LAYOUT
            </button>
            <button type="button" className="text-btn" onClick={() => setPreview(null)}>
              CANCEL
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

/** RESTORE: the automatic snapshots. */
function RestoreSection() {
  const snapshots = useLayout((s) => s.snapshots);
  // The snapshot waiting for CONFIRM, by its time.
  const [confirming, setConfirming] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const restore = async (snap: Snapshot) => {
    setBusy(true);
    await layoutStore().getState().replaceLayout(snap.layout, 'before-restore');
    setBusy(false);
    setConfirming(null);
    uiStore.getState().showToast(`RESTORED ${formatStamp(snap.at)} · PREVIOUS LAYOUT SAVED`);
  };

  return (
    <section className="settings-group" aria-label="Restore">
      <h3 className="section-title">
        RESTORE <span className="section-count">· {snapshots.length}</span>
      </h3>
      <p className="small dim">AUTOMATIC SNAPSHOTS IN THIS BROWSER: ON OPEN, AFTER CHANGES, AND BEFORE ANY IMPORT OR RESTORE.</p>
      {snapshots.length === 0 ? (
        <p className="dim">
          <Prompted>NO SNAPSHOTS YET.</Prompted>
        </p>
      ) : (
        <ul className="snapshot-list">
          {snapshots.map((s) => (
            <li key={s.at} className="snapshot">
              <div className="snapshot-text">
                <span className="bright">{formatStamp(s.at)}</span> <span className="accent small">{reasonLabel(s.reason)}</span>
                <span className="small dim snapshot-summary">{s.summary}</span>
              </div>
              {confirming === s.at ? (
                <div className="button-row">
                  <button type="button" className="text-btn danger" disabled={busy} onClick={() => restore(s)} autoFocus>
                    CONFIRM
                  </button>
                  <button type="button" className="text-btn" onClick={() => setConfirming(null)}>
                    CANCEL
                  </button>
                </div>
              ) : (
                <button type="button" className="text-btn" onClick={() => setConfirming(s.at)} aria-label={`Restore the snapshot from ${formatStamp(s.at)}`}>
                  RESTORE
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** WALLPAPER: the registry's wallpapers. */
function WallpaperSection() {
  const current = useLayout((s) => s.layout.wallpaper);
  return (
    <section className="settings-group" aria-label="Wallpaper">
      <h3 className="section-title">WALLPAPER</h3>
      <div className="dialog-choices" role="radiogroup" aria-label="Wallpaper">
        {WALLPAPERS.map((w) => (
          <label key={w.id} className="dialog-choice">
            <input type="radio" name="wallpaper" value={w.id} checked={current === w.id} onChange={() => layoutStore().getState().setWallpaper(w.id)} />
            {w.label}
          </label>
        ))}
      </div>
    </section>
  );
}

/** KEYS: the shortcuts. */
function KeysSection() {
  return (
    <section className="settings-group" aria-label="Keys">
      <h3 className="section-title">KEYS</h3>
      <dl className="keys">
        <div>
          <dt>F</dt>
          <dd>FULLSCREEN: ONLY THE WALLPAPER. F OR ESC TO COME BACK.</dd>
        </div>
        <div>
          <dt>S</dt>
          <dd>THIS PANEL.</dd>
        </div>
        <div>
          <dt>ESC</dt>
          <dd>CLOSE THIS PANEL.</dd>
        </div>
      </dl>
    </section>
  );
}
