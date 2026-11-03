import test from 'node:test';
import assert from 'node:assert/strict';
import { layoutForCount } from '../src/studio/layouts.ts';

test('every supported batch has exactly one slot per imported photo', () => {
  for (let count = 1; count <= 8; count++) {
    const layout = layoutForCount(count); assert.equal(layout.slots.length, count);
    for (const slot of layout.slots) { assert.ok(slot.x >= 0 && slot.y >= 0); assert.ok(slot.x + slot.w <= layout.width); assert.ok(slot.y + slot.h <= layout.height); }
  }
  assert.throws(() => layoutForCount(9));
});
