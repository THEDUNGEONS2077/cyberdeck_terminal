// @vitest-environment jsdom
/**
 * src/__tests__/recovery.test.tsx: when part of the page fails to draw
 * (app/Recovery.tsx, 1.0): the guard shows its fallback and keeps the
 * failure to its own part, a new reset key tries again, and the recovery
 * panel offers its ways back against a real (in-memory) layout store.
 * The panel's successful RESTORE reloads the page, so e2e/walk.mjs checks
 * that one on the real page.
 */
import { fireEvent, render, screen } from '@testing-library/react';

import { CrashGuard, CrashPanel } from '@/app/Recovery';
import { KEYS, memoryKV } from '@/store/kv';
import { setLayoutStore } from '@/store/instance';
import { createLayoutStore } from '@/store/layout';
import { boot } from '@/store/persist';

/** A part that fails to draw when `fail` is set. */
function Part({ fail, label }: { fail: boolean; label: string }) {
  if (fail) throw new Error(`${label} broke`);
  return <p>{label} drawn</p>;
}

const NOW = new Date(2026, 9, 30, 12, 0).getTime();

describe('crash recovery', () => {
  // React reports every error a guard catches on the console; the tests expect them.
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}));
  afterEach(() => vi.restoreAllMocks());

  it('draws its part until it throws, then its fallback; a new reset key tries again', () => {
    const fallback = (e: Error) => <p role="alert">fell back: {e.message}</p>;
    const { rerender } = render(
      <CrashGuard name="test" resetKey={1} fallback={fallback}>
        <Part fail={false} label="clock" />
      </CrashGuard>,
    );
    expect(screen.getByText('clock drawn')).toBeTruthy();
    rerender(
      <CrashGuard name="test" resetKey={1} fallback={fallback}>
        <Part fail label="clock" />
      </CrashGuard>,
    );
    expect(screen.getByRole('alert').textContent).toBe('fell back: clock broke');
    // Fixed, but the same key: still the fallback (nothing has changed that would help).
    rerender(
      <CrashGuard name="test" resetKey={1} fallback={fallback}>
        <Part fail={false} label="clock" />
      </CrashGuard>,
    );
    expect(screen.queryByText('clock drawn')).toBeNull();
    // A new key (its settings were reset): drawn again.
    rerender(
      <CrashGuard name="test" resetKey={2} fallback={fallback}>
        <Part fail={false} label="clock" />
      </CrashGuard>,
    );
    expect(screen.getByText('clock drawn')).toBeTruthy();
  });

  it('keeps a failure to its own part: the parts beside it are still drawn', () => {
    render(
      <>
        <CrashGuard name="a" fallback={() => <p>a failed</p>}>
          <Part fail label="a" />
        </CrashGuard>
        <CrashGuard name="b" fallback={() => <p>b failed</p>}>
          <Part fail={false} label="b" />
        </CrashGuard>
      </>,
    );
    expect(screen.getByText('a failed')).toBeTruthy();
    expect(screen.getByText('b drawn')).toBeTruthy();
  });

  it('offers RELOAD, EXPORT BACKUP and the newest snapshots; a snapshot that can’t be read changes nothing and says so', async () => {
    const kv = memoryKV();
    const store = createLayoutStore(kv, await boot(kv, NOW), undefined, () => NOW + 10);
    setLayoutStore(store);
    const before = store.getState().layout;
    const snap = store.getState().snapshots[0]!;
    // The snapshot's copy is gone (the index still lists it).
    await kv.del(KEYS.snapshotPrefix + snap.at);
    render(<CrashPanel error={new Error('it broke')} details={'\n    at Clock'} />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('THE DASHBOARD HIT AN ERROR');
    expect(screen.getByRole('button', { name: 'RELOAD' })).toBe(document.activeElement);
    expect(screen.getByRole('button', { name: 'EXPORT BACKUP' })).toBeTruthy();
    expect(screen.getByText(/it broke/).textContent).toContain('at Clock');
    fireEvent.click(screen.getByRole('button', { name: /Restore the snapshot from/ }));
    expect(await screen.findByText('THAT SNAPSHOT COULDN’T BE READ · NOTHING CHANGED')).toBeTruthy();
    expect(store.getState().layout).toBe(before);
  });
});
