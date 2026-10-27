/**
 * src/__tests__/lib.test.ts: the pure rules: layout migration and
 * validation, backup files, snapshot keeping, and the backup reminder.
 */
import { BACKUP_FORMAT, BACKUP_MAX_BYTES, BackupError, backupFileName, makeBackup, parseBackup } from '@/lib/backup';
import { canonicalJson, defaultLayout, hasCustomContent, LAYOUT_SCHEMA_VERSION, layoutFingerprint, sameLayout, summarizeLayout } from '@/lib/layout';
import { FutureSchemaError, InvalidLayoutError, migrateLayout } from '@/lib/migrations';
import { backupDue, exportAge, freshMeta, SNOOZE_MS } from '@/lib/reminder';
import { DAILY_KEEP_DAYS, makeSnapshot, pruneSnapshots, SNAPSHOT_KEEP, shouldSnapshot } from '@/lib/snapshots';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date(2026, 9, 22, 14, 30).getTime();
const APP = { version: '0.1.0', build: 1 };

describe('layout', () => {
  it('compares content, not key order', () => {
    const a = defaultLayout();
    const b = {
      panels: { brand: null, nav: null },
      bookmarks: { arrangement: { hidden: [], areas: [], order: [] }, open: [], importedAt: null, imported: null },
      prefs: { backupReminderDays: 14, rainGlow: 'high' as const, palette: 'phosphor' as const, wallpaperPalette: 'phosphor' as const, wallpaperZoom: {}, switchTabs: [], uiScale: 1, textScale: 1, moduleScale: 0.7, cancelBrowserZoom: true },
      wallpaper: 'matrix-rain',
      modules: [],
      schemaVersion: 5 as const,
    };
    expect(sameLayout(a, b)).toBe(true);
    expect(canonicalJson({ b: 1, a: { d: 2, c: 3 } })).toBe('{"a":{"c":3,"d":2},"b":1}');
  });

  it('knows a fresh layout has nothing worth backing up', () => {
    expect(hasCustomContent(defaultLayout())).toBe(false);
    expect(hasCustomContent({ ...defaultLayout(), prefs: { backupReminderDays: 30, rainGlow: 'high', palette: 'phosphor' as const, wallpaperPalette: 'phosphor' as const, wallpaperZoom: {}, switchTabs: [], uiScale: 1, textScale: 1, moduleScale: 0.7, cancelBrowserZoom: true } })).toBe(true);
    expect(hasCustomContent({ ...defaultLayout(), prefs: { backupReminderDays: 14, rainGlow: 'low', palette: 'phosphor' as const, wallpaperPalette: 'phosphor' as const, wallpaperZoom: {}, switchTabs: [], uiScale: 1, textScale: 1, moduleScale: 0.7, cancelBrowserZoom: true } })).toBe(true);
  });

  it('summarizes for lists and previews', () => {
    expect(summarizeLayout(defaultLayout())).toBe('WALLPAPER MATRIX-RAIN · REMIND 14D');
    expect(summarizeLayout({ ...defaultLayout(), prefs: { backupReminderDays: 0, rainGlow: 'high', palette: 'phosphor' as const, wallpaperPalette: 'phosphor' as const, wallpaperZoom: {}, switchTabs: [], uiScale: 1, textScale: 1, moduleScale: 0.7, cancelBrowserZoom: true } })).toBe('WALLPAPER MATRIX-RAIN · REMIND OFF');
    expect(summarizeLayout({ ...defaultLayout(), prefs: { backupReminderDays: 14, rainGlow: 'max', palette: 'phosphor' as const, wallpaperPalette: 'phosphor' as const, wallpaperZoom: {}, switchTabs: [], uiScale: 1, textScale: 1, moduleScale: 0.7, cancelBrowserZoom: true } })).toBe('WALLPAPER MATRIX-RAIN · GLOW MAX · REMIND 14D');
  });
});

describe('migrateLayout', () => {
  it('accepts a current document unchanged', () => {
    const { doc, migrated } = migrateLayout(defaultLayout());
    expect(doc).toEqual(defaultLayout());
    expect(migrated).toBe(false);
  });

  it('repairs missing or out-of-range preferences from the defaults', () => {
    expect(migrateLayout({ schemaVersion: 1, wallpaper: 'matrix-rain' }).doc.prefs.backupReminderDays).toBe(14);
    expect(migrateLayout({ schemaVersion: 1, wallpaper: 'x', prefs: { backupReminderDays: -3 } }).doc.prefs.backupReminderDays).toBe(14);
    expect(migrateLayout({ schemaVersion: 1, wallpaper: 'x', prefs: { backupReminderDays: 7 } }).doc.prefs.backupReminderDays).toBe(7);
  });

  it('gives a layout without a glow level the default, and keeps a valid one', () => {
    const { prefs } = defaultLayout();
    expect(migrateLayout({ ...defaultLayout(), prefs: { backupReminderDays: 7 } }).doc.prefs).toEqual({ backupReminderDays: 7, rainGlow: 'high', palette: 'phosphor' as const, wallpaperPalette: 'phosphor' as const, wallpaperZoom: {}, switchTabs: [], uiScale: 1, textScale: 1, moduleScale: 0.7, cancelBrowserZoom: true });
    expect(migrateLayout({ ...defaultLayout(), prefs: { ...prefs, rainGlow: 'blinding' } }).doc.prefs.rainGlow).toBe('high');
    expect(migrateLayout({ ...defaultLayout(), prefs: { ...prefs, rainGlow: 'low', palette: 'phosphor' as const, wallpaperPalette: 'phosphor' as const, wallpaperZoom: {}, switchTabs: [], uiScale: 1, textScale: 1, moduleScale: 0.7, cancelBrowserZoom: true } }).doc.prefs.rainGlow).toBe('low');
  });

  it('drops fields this version does not know', () => {
    const { doc } = migrateLayout({ ...defaultLayout(), stray: true });
    expect(doc).not.toHaveProperty('stray');
  });

  it('refuses a newer schema with FutureSchemaError', () => {
    expect(() => migrateLayout({ ...defaultLayout(), schemaVersion: LAYOUT_SCHEMA_VERSION + 1 })).toThrow(FutureSchemaError);
  });

  it.each([null, 'text', [], {}, { schemaVersion: 1 }, { schemaVersion: 1, wallpaper: '' }, { schemaVersion: 0, wallpaper: 'x' }, { schemaVersion: 1, wallpaper: 'x', prefs: 5 }])(
    'refuses damaged data: %j',
    (data) => {
      expect(() => migrateLayout(data)).toThrow(InvalidLayoutError);
    },
  );
});

describe('backup files', () => {
  it('round-trips: export, then parse, gives the same layout back', () => {
    const layout = { ...defaultLayout(), prefs: { backupReminderDays: 30, rainGlow: 'max' as const, palette: 'phosphor' as const, wallpaperPalette: 'phosphor' as const, wallpaperZoom: {}, switchTabs: [], uiScale: 1, textScale: 1, moduleScale: 0.7, cancelBrowserZoom: true } };
    const parsed = parseBackup(JSON.stringify(makeBackup(layout, NOW, APP)));
    expect(parsed.layout).toEqual(layout);
    expect(parsed.exportedAt).toBe(NOW);
  });

  it('names files by local date and time', () => {
    expect(backupFileName(NOW)).toBe('cyberdeck_terminal-backup-2026-10-22-1430.json');
  });

  it('accepts a bare layout document (no date)', () => {
    const parsed = parseBackup(JSON.stringify(defaultLayout()));
    expect(parsed.exportedAt).toBeNull();
  });

  it.each([
    ['not JSON', '{oops', 'isn’t valid JSON'],
    ['another app’s JSON', '{"tasks": []}', 'isn’t a cyberdeck_terminal backup'],
    ['a newer file format', JSON.stringify({ format: BACKUP_FORMAT, version: 99, layout: defaultLayout() }), 'newer cyberdeck_terminal'],
    ['a newer layout schema', JSON.stringify(makeBackup({ ...defaultLayout(), schemaVersion: 99 } as never, NOW, APP)), 'newer cyberdeck_terminal'],
    ['a damaged layout', JSON.stringify({ format: BACKUP_FORMAT, version: 1, layout: { schemaVersion: 1 } }), 'damaged or incomplete'],
    ['an oversized file', ' '.repeat(BACKUP_MAX_BYTES + 1), 'too big'],
  ])('refuses %s with a plain message', (_name, text, message) => {
    expect(() => parseBackup(text)).toThrow(BackupError);
    expect(() => parseBackup(text)).toThrow(message);
  });
});

describe('snapshots', () => {
  const layoutWith = (days: number) => ({ ...defaultLayout(), prefs: { backupReminderDays: days, rainGlow: 'high' as const, palette: 'phosphor' as const, wallpaperPalette: 'phosphor' as const, wallpaperZoom: {}, switchTabs: [], uiScale: 1, textScale: 1, moduleScale: 0.7, cancelBrowserZoom: true } });

  it('skips a copy identical to the newest (by content fingerprint)', () => {
    const newest = makeSnapshot(defaultLayout(), 'startup', NOW);
    expect(shouldSnapshot(undefined, layoutFingerprint(defaultLayout()))).toBe(true);
    expect(shouldSnapshot(newest, layoutFingerprint(defaultLayout()))).toBe(false);
    expect(shouldSnapshot(newest, layoutFingerprint(layoutWith(7)))).toBe(true);
  });

  it('fingerprints content, not key order', () => {
    const a = defaultLayout();
    const reordered = JSON.parse(JSON.stringify({ modules: a.modules, panels: a.panels, bookmarks: a.bookmarks, prefs: a.prefs, wallpaper: a.wallpaper, schemaVersion: a.schemaVersion }));
    expect(layoutFingerprint(reordered)).toBe(layoutFingerprint(a));
    expect(layoutFingerprint(layoutWith(30))).not.toBe(layoutFingerprint(a));
  });

  it(`keeps the ${SNAPSHOT_KEEP} newest`, () => {
    // 30 snapshots one minute apart, all today.
    const list = Array.from({ length: 30 }, (_, i) => makeSnapshot(layoutWith(i), 'change', NOW - i * 60_000));
    const { keep, drop } = pruneSnapshots(list, NOW);
    expect(keep).toHaveLength(SNAPSHOT_KEEP);
    expect(keep[0]!.at).toBe(NOW);
    expect(drop).toHaveLength(10);
    expect(Math.max(...drop.map((s) => s.at))).toBeLessThan(Math.min(...keep.map((s) => s.at)));
  });

  it(`keeps the newest of each of the last ${DAILY_KEEP_DAYS} days, even past the limit`, () => {
    // A burst of 25 today, plus one on each of the 10 days before.
    const burst = Array.from({ length: 25 }, (_, i) => makeSnapshot(layoutWith(i), 'change', NOW - i * 1000));
    const daily = Array.from({ length: 10 }, (_, i) => makeSnapshot(layoutWith(100 + i), 'startup', NOW - (i + 1) * DAY));
    const { keep } = pruneSnapshots([...daily, ...burst], NOW);
    const kept = new Set(keep.map((s) => s.at));
    // Days 1–7 back are within the window (7 days ago counts) and survive the burst; older ones don't.
    for (let i = 1; i <= DAILY_KEEP_DAYS; i++) expect(kept.has(NOW - i * DAY)).toBe(true);
    expect(kept.has(NOW - 8 * DAY)).toBe(false);
    expect(keep.length).toBe(SNAPSHOT_KEEP + DAILY_KEEP_DAYS);
  });
});

describe('backup reminder', () => {
  const meta = freshMeta(NOW - 30 * DAY);

  it('never reminds when off or when the layout has nothing of its own', () => {
    expect(backupDue(meta, 0, true, NOW)).toBe(false);
    expect(backupDue(meta, 14, false, NOW)).toBe(false);
  });

  it('counts from the last export, or from the first run if never exported', () => {
    expect(backupDue(meta, 14, true, NOW)).toBe(true);
    expect(backupDue({ ...meta, lastExportAt: NOW - 3 * DAY }, 14, true, NOW)).toBe(false);
    expect(backupDue({ ...meta, lastExportAt: NOW - 15 * DAY }, 14, true, NOW)).toBe(true);
    expect(backupDue(freshMeta(NOW - DAY), 14, true, NOW)).toBe(false);
  });

  it('stays quiet while snoozed', () => {
    expect(backupDue({ ...meta, snoozedUntil: NOW + 1 }, 14, true, NOW)).toBe(false);
    expect(backupDue({ ...meta, snoozedUntil: NOW - SNOOZE_MS }, 14, true, NOW)).toBe(true);
  });

  it('describes the last export’s age', () => {
    expect(exportAge(meta, NOW)).toBe('NEVER');
    expect(exportAge({ ...meta, lastExportAt: NOW - 1000 }, NOW)).toBe('TODAY');
    expect(exportAge({ ...meta, lastExportAt: NOW - DAY }, NOW)).toBe('1 DAY AGO');
    expect(exportAge({ ...meta, lastExportAt: NOW - 12 * DAY }, NOW)).toBe('12 DAYS AGO');
  });
});
