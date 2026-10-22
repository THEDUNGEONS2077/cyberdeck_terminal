/**
 * src/__tests__/store.test.ts: startup (persist.ts boot) and the layout
 * store, against in-memory storage: damaged data is kept aside, snapshots
 * are taken and pruned, and replacing a layout can always be undone.
 */
import { defaultLayout, type LayoutDocument } from '@/lib/layout';
import { CHANGE_DEBOUNCE_MS, SNAPSHOT_KEEP } from '@/lib/snapshots';
import { KEYS, memoryKV } from '@/store/kv';
import { createLayoutStore } from '@/store/layout';
import { boot, NOTICE_DAMAGED, NOTICE_NEWER, storeSnapshot } from '@/store/persist';

const NOW = new Date(2026, 9, 22, 14, 30).getTime();
const custom: LayoutDocument = { ...defaultLayout(), prefs: { backupReminderDays: 30 } };

describe('boot', () => {
  it('starts a new browser with a default layout, fresh meta and one snapshot', async () => {
    const kv = memoryKV();
    const b = await boot(kv, NOW);
    expect(b.layout).toEqual(defaultLayout());
    expect(b.meta).toEqual({ lastExportAt: null, snoozedUntil: null, firstRunAt: NOW });
    expect(b.snapshots).toHaveLength(1);
    expect(b.snapshots[0]!.reason).toBe('startup');
    expect(b.notice).toBeNull();
    expect(kv.data.get(KEYS.meta)).toEqual(b.meta);
  });

  it('loads a saved layout, and takes no second startup snapshot of the same content', async () => {
    const kv = memoryKV({ [KEYS.layout]: custom });
    await boot(kv, NOW);
    const again = await boot(kv, NOW + 1000);
    expect(again.layout).toEqual(custom);
    expect(again.snapshots).toHaveLength(1);
  });

  it('keeps damaged data under corrupt.*, starts fresh, and says so', async () => {
    const damaged = { schemaVersion: 1, wallpaper: 42 };
    const kv = memoryKV({ [KEYS.layout]: damaged });
    const b = await boot(kv, NOW);
    expect(kv.data.get(KEYS.corruptPrefix + NOW)).toEqual(damaged);
    expect(b.layout).toEqual(defaultLayout());
    expect(kv.data.get(KEYS.layout)).toEqual(defaultLayout());
    expect(b.notice).toBe(NOTICE_DAMAGED);
  });

  it('leaves a newer version’s layout in place (and keeps a copy)', async () => {
    const newer = { schemaVersion: 99, wallpaper: 'future' };
    const kv = memoryKV({ [KEYS.layout]: newer });
    const b = await boot(kv, NOW);
    expect(kv.data.get(KEYS.layout)).toEqual(newer);
    expect(kv.data.get(KEYS.corruptPrefix + NOW)).toEqual(newer);
    expect(b.notice).toBe(NOTICE_NEWER);
    expect(b.snapshots).toHaveLength(0);
  });

  it('skips unreadable snapshots without deleting them', async () => {
    const kv = memoryKV({ [KEYS.snapshotPrefix + 1]: { at: 1, layout: { broken: true } } });
    const b = await boot(kv, NOW);
    expect(b.snapshots.every((s) => s.at !== 1)).toBe(true);
    expect(kv.data.has(KEYS.snapshotPrefix + 1)).toBe(true);
  });
});

describe('storeSnapshot', () => {
  it(`deletes what pruning drops (never more than ${SNAPSHOT_KEEP} from today)`, async () => {
    const kv = memoryKV();
    let list = await storeSnapshot(kv, [], defaultLayout(), 'startup', NOW);
    for (let i = 1; i <= SNAPSHOT_KEEP + 5; i++) {
      list = await storeSnapshot(kv, list, { ...defaultLayout(), prefs: { backupReminderDays: i } }, 'change', NOW + i);
    }
    expect(list).toHaveLength(SNAPSHOT_KEEP);
    const stored = [...kv.data.keys()].filter((k) => k.startsWith(KEYS.snapshotPrefix));
    expect(stored).toHaveLength(SNAPSHOT_KEEP);
  });
});

describe('layout store', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  /** A booted store on fresh memory storage, with a controllable clock. */
  async function setup(initial: Record<string, unknown> = {}) {
    const kv = memoryKV(initial);
    let clock = NOW;
    const store = createLayoutStore(kv, await boot(kv, clock), undefined, () => clock);
    return { kv, store, tick: (ms: number) => (clock += ms) };
  }

  it('saves a change at once, and snapshots it once the layout is still', async () => {
    const { kv, store, tick } = await setup();
    store.getState().setReminderDays(30);
    await store.getState().settled();
    expect(kv.data.get(KEYS.layout)).toEqual(custom);
    expect(store.getState().snapshots).toHaveLength(1);

    tick(CHANGE_DEBOUNCE_MS);
    await vi.advanceTimersByTimeAsync(CHANGE_DEBOUNCE_MS);
    await store.getState().settled();
    expect(store.getState().snapshots).toHaveLength(2);
    expect(store.getState().snapshots[0]!.reason).toBe('change');
    expect(store.getState().snapshots[0]!.layout).toEqual(custom);
  });

  it('a burst of changes gives one snapshot, of the last state', async () => {
    const { store } = await setup();
    store.getState().setReminderDays(7);
    await vi.advanceTimersByTimeAsync(CHANGE_DEBOUNCE_MS / 2);
    store.getState().setReminderDays(90);
    await vi.advanceTimersByTimeAsync(CHANGE_DEBOUNCE_MS);
    await store.getState().settled();
    expect(store.getState().snapshots).toHaveLength(2);
    expect(store.getState().snapshots[0]!.layout.prefs.backupReminderDays).toBe(90);
  });

  it('replacing the layout snapshots the current one first (so it can be undone)', async () => {
    const { kv, store, tick } = await setup();
    store.getState().setReminderDays(7);
    tick(1000);
    await store.getState().replaceLayout(custom, 'before-import');
    const [newest] = store.getState().snapshots;
    expect(newest!.reason).toBe('before-import');
    expect(newest!.layout.prefs.backupReminderDays).toBe(7);
    expect(store.getState().layout).toEqual(custom);
    expect(kv.data.get(KEYS.layout)).toEqual(custom);
  });

  it('flushes a pending change snapshot on demand (leaving the page)', async () => {
    const { store } = await setup();
    store.getState().setReminderDays(30);
    await store.getState().flushSnapshot();
    expect(store.getState().snapshots[0]!.reason).toBe('change');
    // Nothing pending afterwards: a second flush adds nothing.
    await store.getState().flushSnapshot();
    expect(store.getState().snapshots).toHaveLength(2);
  });

  it('records exports and snoozes', async () => {
    const { kv, store } = await setup();
    store.getState().snoozeReminder();
    expect(store.getState().meta.snoozedUntil).toBeGreaterThan(NOW);
    store.getState().markExported();
    await store.getState().settled();
    expect(kv.data.get(KEYS.meta)).toMatchObject({ lastExportAt: NOW, snoozedUntil: null });
  });

  it('reports a failed save instead of throwing', async () => {
    const kv = memoryKV();
    const booted = await boot(kv, NOW);
    kv.set = async () => {
      throw new Error('quota');
    };
    const onError = vi.fn();
    const store = createLayoutStore(kv, booted, onError, () => NOW);
    store.getState().setReminderDays(30);
    await store.getState().settled();
    expect(onError).toHaveBeenCalledOnce();
  });
});
