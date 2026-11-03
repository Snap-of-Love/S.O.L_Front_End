import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTemplate, starterTemplate, figmaGuide } from '../src/studio/templates.ts';
test('templates enforce bounded paper, contained nonoverlapping slots and safe artwork',()=>{
 const t=starterTemplate(); assert.equal(parseTemplate(t).slots.length,4);
 for(const change of [{width:NaN},{height:4000},{name:''},{overlay:'data:image/svg+xml,<script/>'},{slots:[{x:0,y:0,w:700,h:100}]},{slots:[t.slots[0],t.slots[0]]}]) assert.throws(()=>parseTemplate({...t,...change}));
});
test('Figma guide preserves exact logical paper and slot dimensions without markup from names',()=>{
 const t=starterTemplate(); t.name='<script>alert(1)</script>'; const svg=figmaGuide(t); assert.match(svg,/width="600" height="1800"/); assert.match(svg,/PHOTO_1_x40_y50_w520_h350/); assert.doesNotMatch(svg,/<script/);
});
