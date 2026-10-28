/**
 * src/__tests__/profiles.test.ts: layout profiles (C9, 0.21.0): the list's
 * rules (lib/profiles.ts), saving, switching, renaming and deleting them in
 * the store against in-memory storage (never losing a layout), and carrying
 * them in backup files, old files included.
 */
import { BACKUP_FORMAT, makeBackup, parseBackup } from '@/lib/backup';
import { defaultLayout, layoutFingerprint, type LayoutDocument } from '@/lib/layout';
import { FIRST_PROFILE, MAX_PROFILES, MAX_PROFILE_NAME, addProfile, cleanProfileName, defaultProfiles, normalizeProfiles, profilesToAdd, removeProfile, renameProfile, uniqueName } from '@/lib/profiles';
import { KEYS, memoryKV } from '@/store/kv';
import { createLayoutStore } from '@/store/layout';
import { boot } from '@/store/persist';

const NOW = new Date(2026, 9, 28, 16, 0).getTime();
const APP = { version: '0.21.0', build: 37 };
/** A layout told apart from the default by its wallpaper and palette. */
const look = (wallpaper: string, palette: 'synth' | 'blood' | 'amber'): LayoutDocument => ({ ...defaultLayout(), wallpaper, prefs: { ...defaultLayout().prefs, palette, wallpaperPalette: palette } });

describe('the profiles list', () => {
  it('is MAIN alone, open, until another is saved', () => {
    expect(defaultProfiles()).toEqual({ active: 'main', list: [FIRST_PROFILE] });
    expect(normalizeProfiles(undefined, () => false)).toEqual(defaultProfiles());
  });

  it('cleans names: spaces collapsed, capped, upper case, never empty', () => {
    expect(cleanProfileName('  late   night ')).toBe('LATE NIGHT');
    expect(cleanProfileName('   ')).toBe('PROFILE');
    expect(cleanProfileName('x'.repeat(40))).toHaveLength(MAX_PROFILE_NAME);
  });

  it('keeps names unique: a taken one gets a number', () => {
    const index = addProfile(defaultProfiles(), { id: 'pw', name: 'WORK' }, false);
    expect(uniqueName(index, 'work')).toBe('WORK 2');
    expect(uniqueName(addProfile(index, { id: 'pw2', name: 'WORK 2' }, false), 'Work')).toBe('WORK 3');
    // Renaming onto another's name makes it free; renaming to its own name changes nothing.
    expect(renameProfile(index, 'main', 'work').list[0]!.name).toBe('WORK 2');
    expect(renameProfile(index, 'pw', 'work')).toBe(index);
  });

  it('never removes the open profile, and stops at the most', () => {
    expect(removeProfile(defaultProfiles(), 'main')).toEqual(defaultProfiles());
    let index = defaultProfiles();
    for (let i = 0; i < MAX_PROFILES + 3; i++) index = addProfile(index, { id: `p${i}`, name: `P${i}` }, false);
    expect(index.list).toHaveLength(MAX_PROFILES);
  });

  it('reads a stored list back checked: bad entries and missing copies dropped, the open one kept', () => {
    const stored = new Set(['pa']);
    const index = normalizeProfiles(
      { active: 'main', list: [{ id: 'main', name: 'Main' }, { id: 'pa', name: 'games' }, { id: 'pb', name: 'gone' }, { id: 'BAD ID', name: 'x' }, { id: 'pa', name: 'again' }, 7] },
      (id) => stored.has(id),
    );
    expect(index).toEqual({ active: 'main', list: [{ id: 'main', name: 'MAIN' }, { id: 'pa', name: 'GAMES' }] });
    // An open id that isn't listed: MAIN stands in, open.
    expect(normalizeProfiles({ active: 'zz', list: [{ id: 'pa', name: 'games' }] }, () => true)).toEqual({ active: 'main', list: [FIRST_PROFILE, { id: 'pa', name: 'GAMES' }] });
  });

  it('adds only the backup profiles that aren’t here already, by content, with free names', () => {
    const index = addProfile(defaultProfiles(), { id: 'pw', name: 'WORK' }, false);
    const here = [defaultLayout(), look('horizon', 'synth')].map(layoutFingerprint);
    const add = profilesToAdd(index, [{ name: 'WORK', layout: look('horizon', 'synth') }, { name: 'WORK', layout: look('sunset', 'amber') }, { name: 'night', layout: look('neural-net', 'blood') }, { name: 'twin', layout: look('neural-net', 'blood') }], here);
    expect(add.map((c) => c.name)).toEqual(['WORK 2', 'NIGHT']);
  });
});

describe('profiles in the store', () => {
  /** A store over fresh storage, with the layout `layout` open. */
  const start = async (layout: LayoutDocument = defaultLayout()) => {
    const kv = memoryKV({ [KEYS.layout]: layout });
    const store = createLayoutStore(kv, await boot(kv, NOW), undefined, () => NOW);
    return { kv, store };
  };

  it('stores nothing extra until a second profile is saved', async () => {
    const { kv } = await start();
    expect(kv.data.has(KEYS.profiles)).toBe(false);
  });

  it('SAVE AS NEW: the new profile opens on the same layout, the old one keeps it', async () => {
    const { kv, store } = await start(look('horizon', 'synth'));
    const name = await store.getState().saveProfileAs('night');
    expect(name).toBe('NIGHT');
    const { profiles } = store.getState();
    expect(profiles.list.map((p) => p.name)).toEqual(['MAIN', 'NIGHT']);
    expect(profiles.active).not.toBe('main');
    expect(kv.data.get(KEYS.profilePrefix + 'main')).toEqual(look('horizon', 'synth'));
    expect(kv.data.get(KEYS.profiles)).toEqual(profiles);
  });

  it('switching swaps the layouts, snapshots the one left, and survives a restart', async () => {
    const { kv, store } = await start(look('horizon', 'synth'));
    await store.getState().saveProfileAs('night');
    const night = store.getState().profiles.active;
    store.getState().setWallpaper('neural-net');
    await store.getState().settled();
    expect(await store.getState().switchProfile('main')).toBe(true);
    expect(store.getState().layout.wallpaper).toBe('horizon');
    expect((kv.data.get(KEYS.profilePrefix + night) as LayoutDocument).wallpaper).toBe('neural-net');
    // The open one's copy is gone (its layout is the layout), and RESTORE has the one left.
    expect(kv.data.has(KEYS.profilePrefix + 'main')).toBe(false);
    expect(store.getState().snapshots[0]!.reason).toBe('before-switch');
    // After a restart: the same profile open, the same layouts.
    const again = await boot(kv, NOW + 1000);
    expect(again.profiles.active).toBe('main');
    expect(again.layout.wallpaper).toBe('horizon');
    expect(again.profiles.list).toHaveLength(2);
  });

  it('a profile that can’t be read isn’t opened, and is kept aside', async () => {
    const { kv, store } = await start();
    await store.getState().saveProfileAs('broken');
    kv.data.set(KEYS.profilePrefix + 'main', { schemaVersion: 6, wallpaper: '' });
    expect(await store.getState().switchProfile('main')).toBe(false);
    expect([...kv.data.keys()].some((k) => k.startsWith(KEYS.corruptPrefix))).toBe(true);
    expect(store.getState().profiles.list).toHaveLength(2);
  });

  it('renames, and deletes (not the open one) with its layout kept in RESTORE', async () => {
    const { kv, store } = await start(look('sunset', 'amber'));
    await store.getState().saveProfileAs('work');
    store.getState().setWallpaper('megacity');
    await store.getState().settled();
    store.getState().renameProfile('main', 'home');
    expect(store.getState().profiles.list.map((p) => p.name)).toEqual(['HOME', 'WORK']);
    await store.getState().deleteProfile(store.getState().profiles.active);
    expect(store.getState().profiles.list).toHaveLength(2);
    await store.getState().deleteProfile('main');
    expect(store.getState().profiles.list.map((p) => p.name)).toEqual(['WORK']);
    expect(kv.data.has(KEYS.profilePrefix + 'main')).toBe(false);
    // Its layout is in RESTORE (here already, from startup: an identical snapshot isn't stored twice).
    expect(store.getState().snapshots.some((s) => s.fingerprint === layoutFingerprint(look('sunset', 'amber')))).toBe(true);
  });

  it('a deleted profile is snapshotted as it goes, unless it’s the newest snapshot already', async () => {
    const { store } = await start();
    await store.getState().saveProfileAs('scratch');
    store.getState().setWallpaper('sunset');
    await store.getState().settled();
    // Back to MAIN and on with other changes, so SCRATCH's layout isn't the newest snapshot; then it's deleted.
    const scratch = store.getState().profiles.active;
    await store.getState().switchProfile('main');
    await store.getState().snapshotNow('change');
    store.getState().setWallpaper('velocity');
    await store.getState().snapshotNow('change');
    await store.getState().deleteProfile(scratch);
    expect(store.getState().snapshots[0]!.reason).toBe('profile-deleted');
  });

  it('a backup carries every profile; importing one adds the new ones, removing none', async () => {
    const a = await start(look('horizon', 'synth'));
    await a.store.getState().saveProfileAs('night');
    a.store.getState().setWallpaper('neural-net');
    await a.store.getState().settled();
    const file = makeBackup(a.store.getState().layout, NOW, APP, 'NIGHT', await a.store.getState().otherProfiles());
    expect(file.profiles?.map((p) => p.name)).toEqual(['MAIN']);

    const b = await start(look('sunset', 'amber'));
    const parsed = parseBackup(JSON.stringify(file));
    await b.store.getState().replaceLayout(parsed.layout, 'before-import');
    expect(await b.store.getState().addProfiles(parsed.profiles)).toEqual(['MAIN 2']);
    expect(b.store.getState().profiles.list.map((p) => p.name)).toEqual(['MAIN', 'MAIN 2']);
    // The same backup again adds nothing (same content).
    expect(await b.store.getState().addProfiles(parsed.profiles)).toEqual([]);
  });
});

describe('backup files with profiles', () => {
  it('reads a real 0.20.0 file (no profiles) as it always did', () => {
    const old = { format: BACKUP_FORMAT, version: 1, exportedAt: NOW, app: { version: '0.20.0', build: 36 }, layout: look('horizon', 'synth') };
    const parsed = parseBackup(JSON.stringify(old));
    expect(parsed).toEqual({ layout: look('horizon', 'synth'), exportedAt: NOW, profile: null, profiles: [] });
  });

  it('reads the profiles, migrating older layouts in them and leaving out a damaged one', () => {
    const v5 = { ...look('sunset', 'amber'), schemaVersion: 5, modules: [{ id: 'mclock1', kind: 'clock', place: { x: 0.5, y: 0.5, w: 420 }, settings: { seconds: true, hour24: true, date: true }, sizes: { moduleScale: 1 } }] };
    const file = { ...makeBackup(defaultLayout(), NOW, APP, 'MAIN'), profiles: [{ name: 'OLD', layout: v5 }, { name: 'BROKEN', layout: { schemaVersion: 6 } }, { layout: defaultLayout() }] };
    const parsed = parseBackup(JSON.stringify(file));
    expect(parsed.profile).toBe('MAIN');
    expect(parsed.profiles.map((p) => p.name)).toEqual(['OLD']);
    expect(parsed.profiles[0]!.layout.schemaVersion).toBe(6);
    expect(parsed.profiles[0]!.layout.modules[0]!.sizes).toEqual({ scale: 1 });
  });

  it('leaves profiles out of a file when there are none to carry', () => {
    const file = makeBackup(defaultLayout(), NOW, APP);
    expect('profiles' in file || 'profile' in file).toBe(false);
  });
});
