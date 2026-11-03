import { readLocal, writeLocal } from './storage';
import { parseTemplate, type StudioTemplate } from './templates';
import { imageKind, loadImage } from './images';
export function validateOverlayHeader(bytes: Uint8Array, template: StudioTemplate) {
  if (imageKind(bytes) !== 'png' || bytes.length < 24) throw new Error('Export your frame artwork as PNG.');
  const view = new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength), width=view.getUint32(16),height=view.getUint32(20);
  if (!([1,2].some(scale => width === template.width*scale && height === template.height*scale)) || width*height > 16_000_000) throw new Error(`Export PNG at ${template.width} × ${template.height} px (1×) or ${template.width*2} × ${template.height*2} px (2×).`);
}
export async function validateOverlay(source: string, template: StudioTemplate, signal?: AbortSignal): Promise<HTMLImageElement> {
  if (source.length > 7_000_000 || !source.startsWith('data:image/png;base64,')) throw new Error('Use a PNG frame under 5 MB.');
  let bytes: Uint8Array;
  try { bytes=Uint8Array.from(atob(source.split(',')[1]!.slice(0,64)),c=>c.charCodeAt(0)); } catch { throw new Error('This PNG is damaged.'); }
  validateOverlayHeader(bytes,template);
  const image=await loadImage(source,signal),canvas=document.createElement('canvas'); canvas.width=template.width;canvas.height=template.height;const ctx=canvas.getContext('2d'); if(!ctx) throw new Error('Canvas is unavailable.'); ctx.drawImage(image,0,0,canvas.width,canvas.height);
  for(const [index,slot] of template.slots.entries()) if(ctx.getImageData(Math.floor(slot.x+slot.w/2),Math.floor(slot.y+slot.h/2),1,1).data[3]! > 32) throw new Error(`Photo slot ${index+1} is covered by the artwork. Cut a transparent opening in Figma, hide guide layers, then export PNG again.`);
  return image;
}
export async function importOverlay(file: File, template: StudioTemplate) {
  if (!file.size || file.size > 5_000_000) throw new Error('Use a PNG frame under 5 MB.');
  const bytes=new Uint8Array(await file.arrayBuffer()); validateOverlayHeader(bytes,template);
  const source=await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=()=>reject(new Error('Could not read frame artwork.'));r.readAsDataURL(file);});
  await validateOverlay(source,template); return source;
}
export async function loadTemplates(): Promise<StudioTemplate[]> {
  const values=await readLocal<unknown>('templates','catalog'); if(values===undefined)return [];
  if(!Array.isArray(values)||values.length>10)throw new Error('The saved template library is damaged.'); return values.map(parseTemplate);
}
export async function saveTemplate(template: StudioTemplate) {
  const checked=parseTemplate(template);if(checked.overlay)await validateOverlay(checked.overlay,checked);
  const list=await loadTemplates(),next=[...list.filter(t=>t.id!==checked.id),checked];
  if(next.length>10||JSON.stringify(next).length>24_000_000)throw new Error('Keep up to 10 templates and 24 MB of artwork. Export then remove an older template first.');
  await writeLocal('templates','catalog',next);return next;
}
export async function removeTemplate(id: string) {const next=(await loadTemplates()).filter(t=>t.id!==id);await writeLocal('templates','catalog',next);return next;}
