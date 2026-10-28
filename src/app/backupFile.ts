/**
 * src/app/backupFile.ts: saving the layout as a backup file, and reading
 * a chosen file back.
 *
 * Layer: UI (a browser download and the File API). Used by SYSTEM ▸ BACKUP
 * and by the reminder toast's EXPORT.
 */
import { type ParsedBackup, backupFileName, checkBackupSize, makeBackup, parseBackup } from '@/lib/backup';
import { activeProfile } from '@/lib/profiles';
import { layoutStore } from '@/store/instance';
import { uiStore } from '@/store/ui';

declare const __APP_VERSION__: string;
declare const __APP_BUILD__: number;

/** This build, as recorded in backups. */
export const APP_INFO = { version: __APP_VERSION__, build: __APP_BUILD__ };

/** Downloads a backup of the current layout and every other profile, records when, and says so. */
export async function downloadBackup(): Promise<void> {
  const store = layoutStore().getState();
  const others = await store.otherProfiles();
  const now = Date.now();
  const json = JSON.stringify(makeBackup(store.layout, now, APP_INFO, activeProfile(store.profiles).name, others), null, 2);
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = backupFileName(now);
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  layoutStore().getState().markExported();
  uiStore.getState().showToast('BACKUP EXPORTED');
}

/** Reads and checks a chosen backup file. Throws BackupError with a message for the user. */
export async function readBackupFile(file: File): Promise<ParsedBackup> {
  checkBackupSize(file.size);
  return parseBackup(await file.text());
}
