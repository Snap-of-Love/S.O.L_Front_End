import { parseDraft, DRAFT_RETENTION_MS, type DraftRecord, type StudioProject } from './project.ts';
let opening: Promise<IDBDatabase> | null = null;
export function openStudioDatabase(): Promise<IDBDatabase> {
  if (!globalThis.indexedDB) return Promise.reject(new Error('Local draft storage is unavailable in this browser.'));
  opening ??= new Promise((resolve, reject) => {
    const request = indexedDB.open('sol-studio-v1', 1);
    let settled = false;
    const timer = setTimeout(() => { settled = true; opening = null; reject(new Error('Local storage is busy in another tab. Close that tab and retry.')); }, 8000);
    request.onupgradeneeded = () => { request.result.createObjectStore('drafts'); };
    request.onerror = () => { settled = true; clearTimeout(timer); opening = null; reject(new Error('Unable to open local storage.')); };
    request.onblocked = () => { settled = true; clearTimeout(timer); opening = null; reject(new Error('Close another S.O.L tab to use local storage.')); };
    request.onsuccess = () => { clearTimeout(timer); const db = request.result; if (settled) { db.close(); return; } settled = true; db.onversionchange = () => { db.close(); opening = null; }; resolve(db); };
  });
  return opening;
}
export async function closeStudioDatabase() { if (opening) { const db = await opening; db.close(); opening = null; } }
async function readLocal<T>(key: string): Promise<T | undefined> {
  const db = await openStudioDatabase();
  return new Promise((resolve, reject) => { const tx = db.transaction('drafts', 'readonly'), request = tx.objectStore('drafts').get(key); tx.oncomplete = () => resolve(request.result as T | undefined); tx.onerror = tx.onabort = () => reject(new Error('Unable to read local storage.')); });
}
export async function clearDraft(): Promise<void> {
  const db = await openStudioDatabase();
  return new Promise((resolve, reject) => { const tx = db.transaction('drafts', 'readwrite'); tx.objectStore('drafts').delete('active'); tx.oncomplete = () => resolve(); tx.onerror = tx.onabort = () => reject(new Error('Unable to clear local storage.')); });
}
export async function saveDraft(project: StudioProject, savedAt = Date.now()): Promise<number> {
  const record = parseDraft({ version: 1, savedAt, project }), db = await openStudioDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('drafts', 'readwrite'), store = tx.objectStore('drafts'), previous = store.get('active');
    previous.onsuccess = () => { const old = previous.result as DraftRecord | undefined; if (!old || old.savedAt <= savedAt) store.put(record, 'active'); };
    tx.oncomplete = () => resolve(savedAt); tx.onerror = tx.onabort = () => reject(new Error('Draft could not be saved. Local storage may be full. Download your work before leaving.'));
  });
}
export async function loadDraft(now = Date.now()): Promise<DraftRecord | null> {
  const value = await readLocal<unknown>('active');
  if (value === undefined) return null;
  const record = parseDraft(value, now);
  if (now - record.savedAt > DRAFT_RETENTION_MS) { await clearDraft(); return null; }
  return record;
}
