import test from 'node:test';
import assert from 'node:assert/strict';
import { fittedSize, imageKind, validatePhoto, MAX_FILE_BYTES } from '../src/studio/images.ts';

test('photo formats are checked by content, not just the file name', async () => {
  assert.equal(imageKind(new TextEncoder().encode('<svg>bad</svg>')), null);
  await assert.rejects(validatePhoto(new File(['<script>bad</script>'], 'photo.png', { type: 'image/png' })), /JPEG, PNG or WebP/);
  assert.equal(imageKind(new Uint8Array([255, 216, 255])), 'jpeg');
});
test('photo limits reject oversized files and decompression-sized PNG headers', async () => {
  await assert.rejects(validatePhoto(new File([new Uint8Array(MAX_FILE_BYTES + 1)], 'large.png')), /12 MB/);
  const bytes = new Uint8Array(24); bytes.set([137,80,78,71,13,10,26,10]);
  const view = new DataView(bytes.buffer); view.setUint32(16, 10000); view.setUint32(20, 10000);
  await assert.rejects(validatePhoto(new File([bytes], 'huge.png', { type: 'image/png' })), /36 megapixels/);
});
test('normalization preserves aspect ratio without upscaling', () => {
  assert.deepEqual(fittedSize(4000, 3000), { width: 1600, height: 1200 });
  assert.deepEqual(fittedSize(100, 200), { width: 100, height: 200 });
  assert.throws(() => fittedSize(0, 300));
});

test('imports reject empty and excessive batches before decoding', async () => {
  const { importPhotos } = await import('../src/studio/images.ts');
  await assert.rejects(importPhotos([]), /one and eight/);
  await assert.rejects(importPhotos(Array.from({ length: 9 }, () => new File(['x'], 'x.png'))), /one and eight/);
});
