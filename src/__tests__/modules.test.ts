/**
 * src/__tests__/modules.test.ts: the modules (lib/modules.ts) and each
 * kind's rules: SEARCH's addresses (lib/search.ts), QUICK LAUNCH's tiles
 * and keys (lib/launch.ts), TIME's countdowns, calendar and clock text
 * (lib/time.ts); the layout's schema 4 migration; and the shortcuts' 1–9.
 */
import { NAV_WIDTH, clampPlace } from '@/lib/arrange';
import { MAX_TILES, addTile, cleanUrl, launchTargets, moveTile, normalizeLaunch, removeTile } from '@/lib/launch';
import { defaultLayout, summarizeLayout } from '@/lib/layout';
import { migrateLayout } from '@/lib/migrations';
import {
  MAX_MODULES,
  MODULE_DEFAULT_W,
  MODULE_WIDTH,
  type ModuleInstance,
  addModule,
  isModuleId,
  modulesOf,
  newModule,
  newModuleId,
  normalizeModules,
  placeModule,
  removeModule,
  setSettings,
  setTitle,
} from '@/lib/modules';
import { ENGINES, defaultSearch, isTemplate, normalizeSearch, searchUrl } from '@/lib/search';
import { addCountdown, clampTimer, clockText, countdownText, dateKey, daysUntil, normalizeTime, parseDate, sortCountdowns } from '@/lib/time';
import { withPlace } from '@/store/edit';
import { shortcutFor } from '@/app/useShortcuts';

/** A key press aimed at the page (not a field), no modifiers. */
const press = (key: string) => ({ key, target: null, ctrlKey: false, altKey: false, metaKey: false, repeat: false });

describe('search', () => {
  it('builds each engine’s address, the words encoded', () => {
    expect(searchUrl(defaultSearch(), '  rust & wasm ')).toBe('https://duckduckgo.com/?q=rust%20%26%20wasm');
    expect(searchUrl({ engine: 'google', custom: '' }, 'a/b')).toBe('https://www.google.com/search?q=a%2Fb');
    expect(searchUrl({ engine: 'kagi', custom: '' }, 'x')).toBe('https://kagi.com/search?q=x');
    expect(searchUrl({ engine: 'custom', custom: 'https://s.example/find/%s?again=%s' }, 'ü')).toBe('https://s.example/find/%C3%BC?again=%C3%BC');
  });

  it('opens nothing for nothing typed, or an unusable custom address', () => {
    expect(searchUrl(defaultSearch(), '   ')).toBeNull();
    expect(searchUrl({ engine: 'custom', custom: 'javascript:alert(%s)' }, 'x')).toBeNull();
  });

  it('only takes http(s) custom addresses that hold %s', () => {
    expect(isTemplate('https://a.example/?q=%s')).toBe(true);
    expect(isTemplate('https://a.example/?q=')).toBe(false);
    expect(isTemplate('ftp://a.example/%s')).toBe(false);
    expect(isTemplate('https://a b/%s')).toBe(false);
  });

  it('checks stored settings: unknown engines and unusable custom ones fall back', () => {
    expect(normalizeSearch({ engine: 'bing', custom: 5 })).toEqual({ engine: 'bing', custom: '' });
    expect(normalizeSearch({ engine: 'altavista' })).toEqual(defaultSearch());
    expect(normalizeSearch({ engine: 'custom', custom: 'nope' })).toEqual(defaultSearch());
    expect(normalizeSearch('junk')).toEqual(defaultSearch());
    expect(ENGINES[0]!.id).toBe('ddg');
  });
});

describe('quick launch', () => {
  it('makes typed addresses openable, and refuses what a page can’t open', () => {
    expect(cleanUrl('github.com/x')).toBe('https://github.com/x');
    expect(cleanUrl(' http://a.example ')).toBe('http://a.example/');
    expect(cleanUrl('chrome://settings')).toBeNull();
    expect(cleanUrl('javascript:alert(1)')).toBeNull();
    expect(cleanUrl('two words')).toBeNull();
    expect(cleanUrl('')).toBeNull();
  });

  it('adds each address once, titled by its site when untitled, and caps the tiles', () => {
    let s = addTile({ tiles: [] }, 'https://www.github.com/', '');
    expect(s.tiles).toEqual([{ url: 'https://www.github.com/', title: 'github.com' }]);
    expect(addTile(s, 'https://www.github.com/', 'again')).toBe(s);
    for (let i = 0; i < MAX_TILES + 5; i++) s = addTile(s, `https://s${i}.example/`, `S${i}`);
    expect(s.tiles).toHaveLength(MAX_TILES);
  });

  it('moves tiles a place at a time, and removes them', () => {
    const s = { tiles: ['a', 'b', 'c'].map((t) => ({ url: `https://${t}/`, title: t })) };
    expect(moveTile(s, 'https://a/', 1).tiles.map((t) => t.title)).toEqual(['b', 'a', 'c']);
    expect(moveTile(s, 'https://a/', -1)).toBe(s);
    expect(moveTile(s, 'https://c/', 1)).toBe(s);
    expect(removeTile(s, 'https://b/').tiles.map((t) => t.title)).toEqual(['a', 'c']);
  });

  it('gives keys 1–9 to the first nine tiles across modules, in order', () => {
    const tiles = (n: number, p: string) => ({ tiles: Array.from({ length: n }, (_, i) => ({ url: `https://${p}${i}/`, title: `${p}${i}` })) });
    const keyed = launchTargets([tiles(4, 'a'), tiles(8, 'b')]);
    expect(keyed).toHaveLength(9);
    expect(keyed.map((t) => t.title).slice(3, 6)).toEqual(['a3', 'b0', 'b1']);
  });

  it('checks stored tiles: bad addresses and repeats go, titles are capped', () => {
    const s = normalizeLaunch({ tiles: [{ url: 'https://a/', title: 'x'.repeat(99) }, { url: 'https://a/' }, { url: 'chrome://x' }, 'junk', { url: 7 }] });
    expect(s.tiles).toEqual([{ url: 'https://a/', title: 'x'.repeat(40) }]);
    expect(normalizeLaunch(null)).toEqual({ tiles: [] });
  });

  it('opens a tile on 1–9, never 0 (the zoom’s reset)', () => {
    expect(shortcutFor(press('1'))).toBe('launch-1');
    expect(shortcutFor(press('9'))).toBe('launch-9');
    expect(shortcutFor(press('0'))).toBe('zoom-reset');
    expect(shortcutFor({ ...press('3'), ctrlKey: true })).toBeNull();
  });
});

describe('time', () => {
  // Thursday 22 October 2026, mid-afternoon, local time.
  const NOW = new Date(2026, 9, 22, 15, 30);

  it('counts calendar days, past and future', () => {
    expect(daysUntil('2026-10-22', NOW)).toBe(0);
    expect(daysUntil('2026-10-23', NOW)).toBe(1);
    expect(daysUntil('2026-12-25', NOW)).toBe(64);
    expect(daysUntil('2026-10-19', NOW)).toBe(-3);
    // Across the clocks going back (25 October in Europe): still whole days.
    expect(daysUntil('2026-11-01', NOW)).toBe(10);
    expect(daysUntil('2026-02-30', NOW)).toBeNull();
  });

  it('reads countdowns as words', () => {
    expect([0, 1, -1, 12, -3].map(countdownText)).toEqual(['TODAY', 'TOMORROW', 'YESTERDAY', '12 DAYS', '3 DAYS AGO']);
  });

  it('sorts the coming countdowns soonest first, past ones after', () => {
    const list = [
      { id: 'a', label: 'PAST', date: '2026-10-01' },
      { id: 'b', label: 'LATER', date: '2026-12-01' },
      { id: 'c', label: 'SOON', date: '2026-10-25' },
      { id: 'd', label: 'RECENT', date: '2026-10-20' },
    ];
    expect(sortCountdowns(list, NOW).map((c) => c.label)).toEqual(['SOON', 'LATER', 'RECENT', 'PAST']);
  });

  it('shows lengths of time as a clock', () => {
    expect(clockText(0)).toBe('00:00');
    expect(clockText(25 * 60_000)).toBe('25:00');
    expect(clockText(3_727_000)).toBe('1:02:07');
    expect(clockText(-5)).toBe('00:00');
  });

  it('checks dates, labels and the timer', () => {
    expect(parseDate('2026-10-22')).toEqual({ y: 2026, m: 10, d: 22 });
    expect(parseDate('22/10/2026')).toBeNull();
    expect(dateKey(NOW)).toBe('2026-10-22');
    expect([0, 1.4, 5000, Number.NaN].map(clampTimer)).toEqual([1, 1, 999, 25]);
    const s = addCountdown(normalizeTime(undefined), 'c1', ' launch day ', '2026-11-03');
    expect(s.countdowns).toEqual([{ id: 'c1', label: 'LAUNCH DAY', date: '2026-11-03' }]);
    expect(addCountdown(s, 'c2', 'x', '2026-13-01')).toBe(s);
    expect(normalizeTime({ timerMinutes: 0, toolsOpen: 'yes', countdowns: [{ id: 'c1', date: '2026-01-01' }, { id: 'c1', date: '2026-01-02' }, { id: 'c3', date: 'soon' }] })).toEqual({
      timerMinutes: 1,
      toolsOpen: false,
      countdowns: [{ id: 'c1', label: 'COUNTDOWN', date: '2026-01-01' }],
    });
  });
});

describe('modules', () => {
  it('adds each kind at its own free spot down the right-hand side', () => {
    let list: ModuleInstance[] = [];
    for (const kind of ['search', 'launch', 'time'] as const) list = addModule(list, newModule(kind, `m${kind}`, list));
    expect(list.map((m) => m.place.y)).toEqual([0.02, 0.22, 0.42]);
    expect(list.map((m) => m.place.w)).toEqual([MODULE_DEFAULT_W.search, MODULE_DEFAULT_W.launch, MODULE_DEFAULT_W.time]);
    expect(list[0]!.settings).toEqual(defaultSearch());
    // A moved module frees its spot.
    list = placeModule(list, 'msearch', { x: 0.1, y: 0.5 });
    expect(newModule('time', 'mt2', list).place.y).toBe(0.02);
  });

  it('keeps a place on screen and a width within a module’s limits', () => {
    const list = placeModule([newModule('time', 'mt', [])], 'mt', { x: 3, y: -1, w: 5000 });
    expect(list[0]!.place).toEqual({ x: 0.95, y: 0, w: MODULE_WIDTH.max });
    // A move without a width keeps the module's own.
    expect(placeModule(list, 'mt', { x: 0.5, y: 0.5 })[0]!.place.w).toBe(MODULE_WIDTH.max);
    expect(clampPlace({ x: 0, y: 0, w: 100 }, MODULE_WIDTH).w).toBe(MODULE_WIDTH.min);
    expect(clampPlace({ x: 0, y: 0, w: 100 }).w).toBe(NAV_WIDTH.min);
  });

  it('caps the dashboard, refuses a taken id, and removes', () => {
    let list: ModuleInstance[] = [];
    for (let i = 0; i < MAX_MODULES + 3; i++) list = addModule(list, newModule('time', `m${i}`, list));
    expect(list).toHaveLength(MAX_MODULES);
    expect(addModule(list.slice(0, 2), newModule('search', 'm0', []))).toHaveLength(2);
    expect(removeModule(list, 'm3').map((m) => m.id)).not.toContain('m3');
  });

  it('changes one module’s settings, of its own kind only', () => {
    const list = [newModule('search', 'ms', []), newModule('launch', 'ml', [])];
    const next = setSettings(list, 'ms', 'search', { engine: 'bing', custom: '' });
    expect(modulesOf(next, 'search')[0]!.settings.engine).toBe('bing');
    expect(next[1]).toBe(list[1]);
    // The wrong kind for that id: nothing changes.
    expect(setSettings(list, 'ml', 'search', { engine: 'bing', custom: '' })).toEqual(list);
  });

  it('places NAV, the brand panel and modules through one door (edit mode’s undoable changes)', () => {
    const shape = { arrangement: defaultLayout().bookmarks.arrangement, panels: defaultLayout().panels, modules: [newModule('time', 'mt', [])] };
    expect(withPlace(shape, 'nav', { x: 0.2, y: 0.3, w: 800 }).panels.nav).toEqual({ x: 0.2, y: 0.3, w: 800 });
    expect(withPlace(shape, 'mt', { x: 0.2, y: 0.3, w: 400 }).modules[0]!.place).toEqual({ x: 0.2, y: 0.3, w: 400 });
    expect(withPlace(shape, 'brand', { x: 0.1, y: 0.1 }).modules).toBe(shape.modules);
  });

  it('makes ids that can’t be taken for NAV’s or the brand panel’s', () => {
    expect(isModuleId(newModuleId(1_700_000_000_000, 0.5))).toBe(true);
    expect(isModuleId('nav')).toBe(false);
    expect(isModuleId('brand')).toBe(false);
  });
});

describe('layout schema 4 (then on to the current one)', () => {
  it('migrates a real version-3 layout: no modules, nothing else changed', () => {
    const v3 = {
      schemaVersion: 3,
      wallpaper: 'megacity',
      prefs: { backupReminderDays: 30, rainGlow: 'high', palette: 'amber', wallpaperPalette: 'neon', wallpaperZoom: { megacity: 1.25 } },
      bookmarks: { imported: null, importedAt: null, open: ['Dev'], arrangement: { order: ['l:https://a/'], areas: [{ id: 'a1', title: 'WORK', items: [], collapsed: false }], hidden: [] } },
      panels: { nav: { x: 0.2, y: 0.15, w: 900 }, brand: null },
    };
    const { doc, migrated } = migrateLayout(v3);
    expect(migrated).toBe(true);
    expect(doc).toEqual({ ...v3, prefs: { ...v3.prefs, switchTabs: [], uiScale: 1, textScale: 1, moduleScale: 0.7, cancelBrowserZoom: true }, schemaVersion: 7, modules: [] });
  });

  it('keeps good modules and drops bad ones one by one, never the layout', () => {
    const { doc } = migrateLayout({
      ...defaultLayout(),
      modules: [
        { id: 'ms', kind: 'search', place: { x: 0.5, y: 0.1, w: 500 }, settings: { engine: 'google' } },
        { id: 'ms', kind: 'time', place: { x: 0, y: 0 }, settings: {} },
        { id: 'mx', kind: 'weather', place: { x: 0, y: 0 }, settings: {} },
        { id: 'nav', kind: 'time', place: { x: 0, y: 0 }, settings: {} },
        'junk',
        { id: 'ml', kind: 'launch', place: 'here', settings: { tiles: [{ url: 'https://a/' }] } },
      ],
    });
    expect(doc.modules).toEqual([
      { id: 'ms', kind: 'search', place: { x: 0.5, y: 0.1, w: 500 }, settings: { engine: 'google', custom: '' } },
      { id: 'ml', kind: 'launch', place: { x: 0.95, y: 0.02, w: MODULE_DEFAULT_W.launch }, settings: { tiles: [{ url: 'https://a/', title: 'a' }] } },
    ]);
  });

  it('reads no modules from what isn’t a list, and at most MAX_MODULES from one', () => {
    expect(normalizeModules({ modules: 1 })).toEqual([]);
    const many = Array.from({ length: MAX_MODULES + 4 }, (_, i) => ({ id: `m${i}`, kind: 'time', place: { x: 0, y: 0 }, settings: {} }));
    expect(normalizeModules(many)).toHaveLength(MAX_MODULES);
  });

  it('says how many modules a snapshot holds', () => {
    expect(summarizeLayout({ ...defaultLayout(), modules: [newModule('time', 'mt', [])] })).toBe('1 MODULE · WALLPAPER MATRIX-RAIN · REMIND 14D');
  });
});

describe('SHOW TITLE (0.27.0)', () => {
  it('is stored only when set, kept through a save and a read, and dropped when back to the usual', () => {
    const time = newModule('time', 'mtime', []);
    expect('title' in time).toBe(false);
    const hidden = setTitle([time], 'mtime', false);
    expect(hidden[0]!.title).toBe(false);
    expect(normalizeModules(JSON.parse(JSON.stringify(hidden)))).toEqual(hidden);
    expect('title' in setTitle(hidden, 'mtime', undefined)[0]!).toBe(false);
    // Anything but true or false is the usual.
    expect('title' in normalizeModules([{ ...time, title: 'yes' }])[0]!).toBe(false);
  });
});

