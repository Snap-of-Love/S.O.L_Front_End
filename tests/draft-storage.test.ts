import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { saveDraft, loadDraft, clearDraft, closeStudioDatabase, writeLocal } from '../src/studio/storage.ts';
import { emptyProject, DRAFT_RETENTION_MS } from '../src/studio/project.ts';

test('draft survives connection recreation, rejects stale writes and clears on request', async () => {
  await clearDraft(); const project = emptyProject(); project.caption = 'Latest'; const now = Date.now();
  await saveDraft(project, now); await closeStudioDatabase();
  assert.equal((await loadDraft())?.project.caption, 'Latest');
  await saveDraft({ ...project, caption: 'Older' }, now - 1000); assert.equal((await loadDraft())?.project.caption, 'Latest');
  await clearDraft(); assert.equal(await loadDraft(), null); await closeStudioDatabase();
});
test('expired drafts are deleted while corrupt drafts produce a recoverable error', async () => {
  await clearDraft(); await saveDraft(emptyProject(), Date.now() - DRAFT_RETENTION_MS - 1000); assert.equal(await loadDraft(), null);
  await writeLocal('drafts', 'active', { version: 999 }); await assert.rejects(loadDraft());
  await clearDraft(); assert.equal(await loadDraft(), null); await closeStudioDatabase();
});
