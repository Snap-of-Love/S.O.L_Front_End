import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {starterTemplate} from '../src/studio/templates.ts';
import {validateOverlayHeader,saveTemplate,loadTemplates,removeTemplate} from '../src/studio/templateStorage.ts';
import {closeStudioDatabase} from '../src/studio/storage.ts';
test('artwork dimensions match logical paper at 1x or 2x before image decoding',()=>{
 const bytes=new Uint8Array(24);bytes.set([137,80,78,71,13,10,26,10]);const view=new DataView(bytes.buffer);view.setUint32(16,1200);view.setUint32(20,3600);assert.doesNotThrow(()=>validateOverlayHeader(bytes,starterTemplate()));view.setUint32(16,1201);assert.throws(()=>validateOverlayHeader(bytes,starterTemplate()),/Export PNG/);
});
test('concurrent saves retain both frames and library removal preserves the other',async()=>{
 const a=starterTemplate(),b=starterTemplate();await Promise.all([saveTemplate(a),saveTemplate(b)]);assert.equal((await loadTemplates()).length,2);await removeTemplate(a.id);assert.equal((await loadTemplates())[0]!.id,b.id);await closeStudioDatabase();
});
