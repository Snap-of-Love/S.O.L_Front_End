import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyProject, parseDraft } from '../src/studio/project.ts';

test('draft serialization preserves session state and returns an independent snapshot', () => {
  const project = emptyProject(); project.caption = 'Our afternoon'; project.photos = [{ id: 'a', name: 'Photo', frames: ['data:image/jpeg;base64,/9j/AA=='] }]; project.frames = [0];
  const record = { version: 1, savedAt: Date.now(), project }; const parsed = parseDraft(JSON.parse(JSON.stringify(record)));
  assert.deepEqual(parsed.project, project); parsed.project.caption = 'Changed'; assert.equal(project.caption, 'Our afternoon');
});
test('unknown versions, remote photo URLs and invalid settings are rejected', () => {
  assert.throws(() => parseDraft({ version: 2, savedAt: Date.now(), project: emptyProject() }));
  const project = emptyProject(); project.photos = [{ id: 'a', name: 'Unsafe', frames: ['https://example.com/image.jpg'] }];
  assert.throws(() => parseDraft({ version: 1, savedAt: Date.now(), project }), /invalid photo/);
  project.photos = []; project.grain = NaN; assert.throws(() => parseDraft({ version: 1, savedAt: Date.now(), project }));
});

test('per-photo crops survive recovery and invalid transforms are rejected', async () => {
  const { defaultCrop } = await import('../src/studio/crop.ts'); const project = emptyProject(); project.crops = [{ ...defaultCrop(), zoom: 2, x: 0.5, rotation: 90 }];
  assert.deepEqual(parseDraft({ version: 1, savedAt: Date.now(), project }).project.crops, project.crops);
  project.crops[0]!.zoom = 10; assert.throws(() => parseDraft({ version: 1, savedAt: Date.now(), project }), /crop/);
});

test('decoration layers restore without losing stroke geometry', () => {
  const project = emptyProject(); project.decorations = [{id:'line',kind:'doodle',color:'#a92b35',width:.01,points:[{x:.1,y:.2},{x:.4,y:.9}]}];
  assert.deepEqual(parseDraft({version:1,savedAt:Date.now(),project}).project.decorations,project.decorations);
});

test('legacy custom-frame drafts recover all photos and edits in a built-in layout', () => {
  const project = {
    ...emptyProject(),
    layoutId: 'previous-custom-frame',
    customTemplate: { id: 'previous-custom-frame', overlay: 'old artwork' },
    photos: Array.from({ length: 6 }, (_, i) => ({
      id: String(i), name: `Photo ${i + 1}`, frames: ['data:image/jpeg;base64,/9j/AA=='],
    })),
    caption: 'Our afternoon',
  };
  const restored = parseDraft({ version: 1, savedAt: Date.now(), project }).project;
  assert.equal(restored.layoutId, '6-photos');
  assert.deepEqual(restored.photos, project.photos);
  assert.equal(restored.caption, project.caption);
  assert.equal(Object.hasOwn(restored, 'customTemplate'), false);
  assert.equal(project.layoutId, 'previous-custom-frame');
});

test('known preset layouts and the current monochrome filter survive draft recovery', () => {
  const record = { version: 1, savedAt: Date.now(), project: { ...emptyProject(), layoutId: 'filmstrip', filterId: 'grayscale' } };
  assert.equal(parseDraft(record).project.layoutId, 'filmstrip');
  assert.equal(parseDraft(record).project.filterId, 'grayscale');
  assert.equal(parseDraft({ ...record, project: { ...record.project, filterId: 'mono' } }).project.filterId, 'grayscale');
  assert.throws(() => parseDraft({ ...record, project: { ...record.project, filterId: 'constructor' } }), /settings/);
});
