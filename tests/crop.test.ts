import test from 'node:test';
import assert from 'node:assert/strict';
import { cropTransform, defaultCrop, validCrop } from '../src/studio/crop.ts';

test('cover crops fill portrait and landscape frames without exposed borders', () => {
  assert.equal(cropTransform(1000, 500, 500, 500).scale, 1);
  assert.equal(cropTransform(500, 1000, 500, 500).scale, 1);
  const right = cropTransform(1000, 500, 500, 500, { ...defaultCrop(), x: 1 }); assert.equal(right.offsetX, -250);
  const bottom = cropTransform(500, 1000, 500, 500, { ...defaultCrop(), y: 1 }); assert.equal(bottom.offsetY, -250);
});
test('quarter-turn dimensions and zoom use the rotated aspect ratio', () => {
  const transform = cropTransform(1000, 500, 500, 1000, { ...defaultCrop(), rotation: 90 }); assert.equal(transform.scale, 1); assert.equal(transform.offsetX, 0); assert.equal(transform.radians, Math.PI / 2);
  assert.equal(cropTransform(500, 500, 500, 500, { ...defaultCrop(), zoom: 2 }).scale, 2);
});
test('invalid and nonfinite crops cannot enter renderer state', () => {
  assert.equal(validCrop({ ...defaultCrop(), zoom: Infinity }), false);
  assert.equal(validCrop({ ...defaultCrop(), x: 2 }), false);
  assert.throws(() => cropTransform(0, 100, 100, 100));
});

test('cover bounds hold across all rotations and extreme alignments', () => {
  for (const rotation of [0,90,180,270] as const) for (const x of [-1,0,1]) for (const y of [-1,0,1]) {
    const c = { x, y, rotation, zoom: 3, flip: true }, t = cropTransform(1920,1080,440,600,c);
    const w = (rotation % 180 ? 1080 : 1920) * t.scale, h = (rotation % 180 ? 1920 : 1080) * t.scale;
    assert.ok(w / 2 - Math.abs(t.offsetX) >= 220 - 1e-8);
    assert.ok(h / 2 - Math.abs(t.offsetY) >= 300 - 1e-8);
  }
});
