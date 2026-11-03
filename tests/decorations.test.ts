import test from 'node:test';
import assert from 'node:assert/strict';
import { validDecorations } from '../src/studio/decorations.ts';
const heart = { id:'heart',kind:'sticker',text:'♡',color:'#ffffff',x:.5,y:.5,size:.1,rotation:0 };
test('decoration input rejects unsafe text, colors, unbounded coordinates and excessive paths', () => {
  assert.ok(validDecorations([heart]));
  for (const change of [{text:'<script>'},{x:NaN},{size:3},{color:'url(https://x)'},{rotation:360}]) assert.equal(validDecorations([{...heart,...change}]),false);
  assert.equal(validDecorations(Array(41).fill(heart)),false);
  assert.equal(validDecorations([{id:'x',kind:'doodle',color:'#ffffff',width:.01,points:Array(401).fill({x:0,y:0})}]),false);
});

test('drawings keep normalized geometry when output dimensions change', async () => {
  const { renderDecorations } = await import('../src/studio/decorations.ts');
  const calls: unknown[][] = [];
  const ctx = new Proxy({}, { get: (_,key) => (...args: unknown[]) => calls.push([key,...args]), set: () => true }) as CanvasRenderingContext2D;
  renderDecorations(ctx,[{id:'line',kind:'doodle',color:'#ffffff',width:.01,points:[{x:.25,y:.5},{x:.75,y:1}]}],600,1800);
  assert.ok(calls.some(c => c[0] === 'moveTo' && c[1] === 150 && c[2] === 900));
  assert.ok(calls.some(c => c[0] === 'lineTo' && c[1] === 450 && c[2] === 1800));
  assert.ok(calls.some(c => c[0] === 'clip'));
});
