/**
 * src/app/SystemPanel.tsx: the SYSTEM panel (S): backups, restoring a
 * snapshot, the wallpaper, and the keys.
 *
 * Layer: UI. Everything that replaces the layout asks first and says what
 * will happen, and the current layout is always snapshotted before it's
 * replaced (store/layout.ts replaceLayout), so nothing here can lose a layout.
 *
 *   BOOKMARKS  where the bookmarks bar comes from (the bridge, live, or an
 *              imported copy), the bridge download (and update), importing;
 *   BACKUP     export a file, import one (preview, then REPLACE), the
 *              reminder interval, and when the last export was;
 *   RESTORE    the automatic snapshots, newest first; RESTORE asks to confirm;
 *   APPEARANCE (first) the dashboard's colours, its sizes (UI SCALE, TEXT
 *              SIZE, MODULE SIZE, CHROME ZOOM), the wallpaper, the
 *              wallpaper's colours, the glow, the zoom, and its SHARPNESS
 *              (what it draws at; TRY AGAIN after the guard stepped back);
 *   KEYS       the shortcuts;
 *   and at the foot, COPY DIAGNOSTICS (app/diagnostics.ts).
 */
import { type ChangeEvent, type CSSProperties, useId, useRef, useState, useSyncExternalStore } from 'react';

import { BRIDGE_VERSION } from '@/bridge/client';
import { BackupError, type ParsedBackup, formatStamp } from '@/lib/backup';
import { countLinks } from '@/lib/bookmarks';
import { DEFAULT_ZOOM, GLOW_LEVELS, REMINDER_DAY_CHOICES, ZOOM_STEPS, stepZoom, summarizeLayout, zoomLabel, zoomOf } from '@/lib/layout';
import { type PaletteId, PALETTES } from '@/lib/palettes';
import { DEFAULT_MODULE_SCALE, DEFAULT_TEXT_SCALE, DEFAULT_UI_SCALE, MODULE_SCALE_STEPS, TEXT_SCALE_STEPS, UI_SCALE_STEPS, percentLabel } from '@/lib/scale';
import { exportAge } from '@/lib/reminder';
import { reasonLabel, type SnapshotInfo } from '@/lib/snapshots';
import { compareVersions } from '@/lib/versions';
import { layoutStore } from '@/store/instance';
import { uiStore } from '@/store/ui';
import { WALLPAPER_LIST } from '@/wallpaper/catalog';
import { retrySharpness, sharpnessInfo } from '@/wallpaper/host';
import { browserZoomNow, onBrowserZoom } from '@/scale';

import { APP_INFO, downloadBackup, readBackupFile } from './backupFile';
import { copyDiagnostics } from './diagnostics';
import { Dialog } from './Dialog';
import { useBookmarks, useLayout } from './hooks';
import { CopyAddress, DownloadBridgeButton, ImportBookmarksButton } from './ImportBookmarks';
import { Prompted } from './Prompted';
import { Stepper } from './Stepper';

/** The SYSTEM panel; `leaving` while it fades out. */
export function SystemPanel({ leaving }: { leaving: boolean }) {
  const close = () => uiStore.getState().setPanelOpen(false);
  return (
    <Dialog title="SYSTEM" onClose={close} leaving={leaving} wide>
      <div className="panel-body">
        <AppearanceSection />
        <BookmarksSection />
        <BackupSection />
        <RestoreSection />
        <KeysSection />
        <div className="setting">
          <span className="small dim">
            CYBERDECK_TERMINAL v{APP_INFO.version} (BUILD {APP_INFO.build}) · YOUR LAYOUT STAYS IN THIS BROWSER
          </span>
          <button type="button" className="text-btn small-btn" onClick={() => void copyDiagnostics()} title="This browser, screen and wallpaper's figures, to paste (no addresses)">
            COPY DIAGNOSTICS
          </button>
        </div>
      </div>
    </Dialog>
  );
}

/** A row of palette swatches (a radio group), each chip previewing its palette in that palette's own colours. */
function PaletteChoice({ label, name, value, onChange }: { label: string; name: string; value: PaletteId; onChange: (id: PaletteId) => void }) {
  const labelId = useId();
  return (
    <>
      <span className="setting-label" id={labelId}>
        {label}
      </span>
      <div className="swatches" role="radiogroup" aria-labelledby={labelId}>
        {PALETTES.map((p) => (
          <label key={p.id} className="swatch">
            <input className="sr-only" type="radio" name={name} value={p.id} checked={value === p.id} onChange={() => onChange(p.id)} />
            {/* A preview in the palette's own colours (set here: they aren't the page's tokens until chosen). */}
            <span
              className="swatch-chip"
              style={{ '--sw-surface': p.colors.surfaceRaised, '--sw-line': p.colors.line, '--sw-accent': p.colors.accent, '--sw-cool': p.colors.cool, '--sw-text': p.colors.text } as CSSProperties}
            >
              <span className="swatch-bar" aria-hidden />
              <span className="swatch-name">{p.label}</span>
            </span>
          </label>
        ))}
      </div>
    </>
  );
}

/** BOOKMARKS: the source, the bridge (download, update), the imported copy. */
function BookmarksSection() {
  const status = useBookmarks((s) => s.status);
  const version = useBookmarks((s) => s.bridgeVersion);
  const roots = useBookmarks((s) => s.roots);
  const imported = useLayout((s) => s.layout.bookmarks.imported);
  const importedAt = useLayout((s) => s.layout.bookmarks.importedAt);
  const outdated = status === 'live' && version !== null && compareVersions(version, BRIDGE_VERSION) < 0;
  let source = 'NONE';
  if (status === 'live') source = `LIVE · BRIDGE v${version}`;
  else if (status === 'checking') source = 'ASKING THE BRIDGE…';
  else if (imported) source = 'IMPORTED COPY';

  const remove = () => {
    layoutStore().getState().removeImported();
    uiStore.getState().showToast('IMPORTED COPY REMOVED · RESTORE CAN BRING IT BACK');
  };

  return (
    <section className="settings-group" aria-label="Bookmarks">
      <h3 className="section-title">BOOKMARKS</h3>
      <div className="setting">
        <span>SOURCE</span>
        <span className={status === 'live' ? 'accent' : 'bright'}>{source}</span>
      </div>
      {status === 'live' && roots && (
        <div className="setting">
          <span>CHROME HAS</span>
          <span className="bright">
            BAR {roots.bar}
            {roots.bars > 1 ? ` (${roots.bars} COPIES: ACCOUNT + DEVICE)` : ''} · OTHER {roots.other} · MOBILE {roots.mobile}
          </span>
        </div>
      )}
      <div className="setting">
        <span>IMPORTED COPY</span>
        <span className="bright">{imported ? `${countLinks(imported)} LINKS · ${importedAt ? formatStamp(importedAt) : 'NO DATE'}` : 'NONE'}</span>
      </div>
      {outdated && (
        <p className="accent">
          <Prompted>BRIDGE v{BRIDGE_VERSION} IS AVAILABLE: DOWNLOAD IT, UNZIP OVER THE OLD FOLDER, THEN PRESS ↻ ON IT IN CHROME://EXTENSIONS.</Prompted>
        </p>
      )}
      {status !== 'live' && (
        <p className="small dim">
          THE BRIDGE KEEPS THIS PAGE IN STEP WITH YOUR BOOKMARKS BAR AND OPENS IT ON NEW TABS. UNZIP IT, OPEN <CopyAddress text="chrome://extensions" />, TURN ON DEVELOPER MODE, LOAD UNPACKED, THEN RELOAD THIS PAGE.
        </p>
      )}
      <div className="button-row">
        <DownloadBridgeButton primary={status !== 'live' || outdated} label={outdated ? 'DOWNLOAD UPDATE' : 'DOWNLOAD BRIDGE'} />
        <ImportBookmarksButton />
        {imported && (
          <button type="button" className="text-btn danger" onClick={remove}>
            REMOVE COPY
          </button>
        )}
      </div>
    </section>
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

  const restore = async (snap: SnapshotInfo) => {
    setBusy(true);
    const ok = await layoutStore().getState().restoreSnapshot(snap.at);
    setBusy(false);
    setConfirming(null);
    uiStore.getState().showToast(ok ? `RESTORED ${formatStamp(snap.at)} · PREVIOUS LAYOUT SAVED` : 'THAT SNAPSHOT COULDN’T BE READ · NOTHING CHANGED');
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

/**
 * APPEARANCE (first in SYSTEM): the dashboard's colours, the wallpaper, the
 * wallpaper's colours, the glow and the wallpaper's zoom. The two palettes
 * are chosen apart (user request, 2026-10-23): any dashboard colours with
 * any wallpaper colours. The zoom is the shown wallpaper's own: each keeps
 * its zoom, and opens at it from then on.
 */
function AppearanceSection() {
  const current = useLayout((s) => s.layout.wallpaper);
  const glow = useLayout((s) => s.layout.prefs.rainGlow);
  const palette = useLayout((s) => s.layout.prefs.palette);
  const wallpaperPalette = useLayout((s) => s.layout.prefs.wallpaperPalette);
  const zoom = useLayout((s) => zoomOf(s.layout.prefs.wallpaperZoom, s.layout.wallpaper));
  const glowId = useId();
  const wallpaperId = useId();
  const zoomId = useId();
  const setZoom = (next: number) => layoutStore().getState().setWallpaperZoom(current, next);
  const shownLabel = WALLPAPER_LIST.find((w) => w.id === current)?.label ?? current.toUpperCase();
  return (
    <section className="settings-group" aria-label="Appearance">
      <h3 className="section-title">APPEARANCE</h3>
      <PaletteChoice label="DASHBOARD COLOURS" name="palette" value={palette} onChange={(id) => layoutStore().getState().setPalette(id)} />
      <SizeSettings />
      <span className="setting-label" id={wallpaperId}>
        WALLPAPER
      </span>
      <div className="dialog-choices" role="radiogroup" aria-labelledby={wallpaperId}>
        {WALLPAPER_LIST.map((w) => (
          <label key={w.id} className="dialog-choice">
            <input type="radio" name="wallpaper" value={w.id} checked={current === w.id} onChange={() => layoutStore().getState().setWallpaper(w.id)} />
            {w.label}
          </label>
        ))}
      </div>
      <PaletteChoice label="WALLPAPER COLOURS" name="wallpaper-palette" value={wallpaperPalette} onChange={(id) => layoutStore().getState().setWallpaperPalette(id)} />
      {/* The glow changes as the wallpaper runs (the rain: new glyphs at once, the rest as they fade). */}
      <div className="setting">
        <span id={glowId}>GLOW</span>
        <div className="segmented" role="radiogroup" aria-labelledby={glowId}>
          {GLOW_LEVELS.map((level) => (
            <label key={level}>
              <input className="sr-only" type="radio" name="glow" value={level} checked={glow === level} onChange={() => layoutStore().getState().setRainGlow(level)} />
              <span>{level.toUpperCase()}</span>
            </label>
          ))}
        </div>
      </div>
      {/* The shown wallpaper's zoom, a step at a time (+ − 0 on the keyboard do the same). */}
      <div className="setting">
        <span id={zoomId}>ZOOM · {shownLabel}</span>
        <Stepper
          labelledBy={zoomId}
          value={zoom}
          steps={ZOOM_STEPS}
          fallback={DEFAULT_ZOOM}
          less="Zoom the wallpaper out"
          more="Zoom the wallpaper in"
          reset="Reset the zoom to 100%"
          onChange={setZoom}
          step={stepZoom}
          label={zoomLabel}
        />
      </div>
      <Sharpness current={current} />
    </section>
  );
}

/** UI SCALE's one-press sizes (any step is a − or + away). */
const UI_PRESETS: readonly number[] = [0.75, 1, 1.25, 1.5, 1.75, 2];

/**
 * The dashboard's sizes (0.17.0, lib/scale.ts): UI SCALE (all of it, with
 * one-press presets), TEXT SIZE (the text alone), MODULE SIZE (the modules
 * against the rest), and CHROME ZOOM: Chrome keeps one zoom for this site
 * and quest_log_desktop, so IGNORE keeps the dashboard at UI SCALE whatever
 * that zoom is (the readout says what it's worked out to be). The wallpaper
 * keeps its own size.
 */
function SizeSettings() {
  const ui = useLayout((s) => s.layout.prefs.uiScale);
  const text = useLayout((s) => s.layout.prefs.textScale);
  const modules = useLayout((s) => s.layout.prefs.moduleScale);
  const cancel = useLayout((s) => s.layout.prefs.cancelBrowserZoom);
  const browser = useSyncExternalStore(onBrowserZoom, browserZoomNow);
  const uiId = useId();
  const textId = useId();
  const modulesId = useId();
  const chromeId = useId();
  const set = layoutStore().getState().setSizes;
  return (
    <>
      <div className="setting">
        <span id={uiId}>UI SCALE</span>
        <Stepper labelledBy={uiId} value={ui} steps={UI_SCALE_STEPS} fallback={DEFAULT_UI_SCALE} less="Make the dashboard smaller" more="Make the dashboard bigger" reset="Reset the UI scale to 100%" onChange={(v) => set({ uiScale: v })} />
      </div>
      <div className="setting">
        <span className="small dim">PRESETS · [ ] ON THE KEYBOARD</span>
        <div className="segmented" role="radiogroup" aria-label="UI scale presets">
          {UI_PRESETS.map((v) => (
            <label key={v}>
              <input className="sr-only" type="radio" name="ui-scale" value={v} checked={ui === v} onChange={() => set({ uiScale: v })} />
              <span>{percentLabel(v)}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="setting">
        <span id={textId}>TEXT SIZE</span>
        <Stepper labelledBy={textId} value={text} steps={TEXT_SCALE_STEPS} fallback={DEFAULT_TEXT_SCALE} less="Make the text smaller" more="Make the text bigger" reset="Reset the text size to 100%" onChange={(v) => set({ textScale: v })} />
      </div>
      <div className="setting">
        <span id={modulesId}>MODULE SIZE</span>
        <Stepper
          labelledBy={modulesId}
          value={modules}
          steps={MODULE_SCALE_STEPS}
          fallback={DEFAULT_MODULE_SCALE}
          less="Make the modules smaller"
          more="Make the modules bigger"
          reset={`Reset the module size to ${percentLabel(DEFAULT_MODULE_SCALE)}`}
          onChange={(v) => set({ moduleScale: v })}
        />
      </div>
      <div className="setting">
        <span id={chromeId}>CHROME ZOOM · AT {percentLabel(browser)}</span>
        <div className="segmented" role="radiogroup" aria-labelledby={chromeId}>
          <label title="The dashboard stays at UI SCALE whatever Chrome's zoom (shared with quest_log) is">
            <input className="sr-only" type="radio" name="chrome-zoom" value="ignore" checked={cancel} onChange={() => set({ cancelBrowserZoom: true })} />
            <span>IGNORE</span>
          </label>
          <label title="Chrome's zoom applies on top of UI SCALE">
            <input className="sr-only" type="radio" name="chrome-zoom" value="apply" checked={!cancel} onChange={() => set({ cancelBrowserZoom: false })} />
            <span>APPLY</span>
          </label>
        </div>
      </div>
      <p className="small dim">CHROME KEEPS ONE ZOOM FOR THIS SITE AND QUEST_LOG. WITH IGNORE, ZOOM CHROME FOR QUEST_LOG AS YOU LIKE: THIS DASHBOARD STAYS AT UI SCALE.</p>
    </>
  );
}

/**
 * SHARPNESS: how many pixels the wallpaper draws per CSS px (lib/sharpness.ts):
 * the screen's own, or its safe cap after the guard stepped back (TRY AGAIN
 * watches it once more). Read as the panel opens (it changes only on a
 * new screen, or after the guard's few seconds).
 */
function Sharpness({ current }: { current: string }) {
  // Read again when the wallpaper changes, or after TRY AGAIN (the previous-props pattern keeps it out of effects).
  const [tries, setTries] = useState(0);
  const [read, setRead] = useState(() => ({ key: `${current}:0`, info: sharpnessInfo() }));
  const key = `${current}:${tries}`;
  if (read.key !== key) setRead({ key, info: sharpnessInfo() });
  const info = read.info;
  if (!info) return null;
  let text: string;
  if (info.verdict === 'safe') text = `${info.drawnDpr}× · STEPPED BACK FROM ${info.screenDpr}× (FRAMES TOO SLOW)`;
  else if (info.drawnDpr > info.safeDpr) text = `${info.drawnDpr}× · FULL (YOUR SCREEN'S OWN)`;
  else text = `${info.drawnDpr}× · YOUR SCREEN'S OWN`;
  return (
    <div className="setting">
      <span>SHARPNESS</span>
      <span className="stepper">
        <output className="stepper-value small">{text}</output>
        {info.verdict === 'safe' && (
          <button
            type="button"
            className="text-btn small-btn"
            onClick={() => {
              retrySharpness();
              setTries((t) => t + 1);
              uiStore.getState().showToast('FULL SHARPNESS AGAIN · WATCHING ITS FRAMES FOR A FEW SECONDS');
            }}
          >
            TRY AGAIN
          </button>
        )}
      </span>
    </div>
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
          <dt>/</dt>
          <dd>FIND: TYPE TO FIND A BOOKMARK OR A COMMAND, OR SEARCH THE WEB; ↑↓ CHOOSE, ENTER OPENS.</dd>
        </div>
        <div>
          <dt>1–9</dt>
          <dd>OPEN A QUICK LAUNCH TILE (ITS KEY IS ON IT).</dd>
        </div>
        <div>
          <dt>+ −</dt>
          <dd>ZOOM THE WALLPAPER IN / OUT; 0 BACK TO 100%. EACH WALLPAPER KEEPS ITS OWN ZOOM.</dd>
        </div>
        <div>
          <dt>← ↑ → ↓</dt>
          <dd>MOVE BETWEEN BOOKMARKS AND FOLDERS (HOME / END: FIRST / LAST).</dd>
        </div>
        <div>
          <dt>ESC</dt>
          <dd>CLOSE THIS PANEL.</dd>
        </div>
      </dl>
    </section>
  );
}
