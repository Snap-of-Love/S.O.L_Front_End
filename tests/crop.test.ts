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
