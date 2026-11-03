import type { LayoutDef } from '../lib/renderUtils.ts';
export interface StudioTemplate { version: 1; id: string; name: string; width: number; height: number; slots: { x:number; y:number; w:number; h:number }[]; overlay: string | null }
export function parseTemplate(value: unknown): StudioTemplate {
  if (!value || typeof value !== 'object') throw new Error('Choose a S.O.L template JSON file.');
  const t = value as StudioTemplate, integer = (n:number,min:number,max:number) => Number.isInteger(n) && n >= min && n <= max;
  if (t.version !== 1 || typeof t.id !== 'string' || !/^custom-[a-zA-Z0-9-]{1,80}$/.test(t.id) || typeof t.name !== 'string' || !t.name.trim() || t.name.length > 60 || !integer(t.width,200,2400) || !integer(t.height,200,2400) || t.width*t.height > 4_000_000) throw new Error('Use a named template, 200–2400 px per side and at most 4 megapixels.');
  if (!Array.isArray(t.slots) || t.slots.length < 1 || t.slots.length > 8) throw new Error('Add between 1 and 8 photo slots.');
  const slots = t.slots.map(s => { if (!s || !integer(s.x,0,t.width) || !integer(s.y,0,t.height) || !integer(s.w,64,t.width) || !integer(s.h,64,t.height) || s.x+s.w > t.width || s.y+s.h > t.height) throw new Error('Photo slots must stay inside the paper and be at least 64 × 64 px.'); return {x:s.x,y:s.y,w:s.w,h:s.h}; });
  for (let i=0;i<slots.length;i++) for (let j=i+1;j<slots.length;j++) { const a=slots[i]!,b=slots[j]!; if (a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y) throw new Error('Photo slots must not overlap.'); }
  if (t.overlay !== null && (typeof t.overlay !== 'string' || t.overlay.length > 7_000_000 || !/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(t.overlay))) throw new Error('Frame artwork must be a local PNG under 5 MB.');
  return {version:1,id:t.id,name:t.name.trim(),width:t.width,height:t.height,slots,overlay:t.overlay};
}
export function templateLayout(template: StudioTemplate): LayoutDef { return {...template,datePos:{x:0,y:0}}; }
export function starterTemplate(): StudioTemplate { return {version:1,id:`custom-${crypto.randomUUID()}`,name:'My 2 × 6 strip',width:600,height:1800,slots:[0,1,2,3].map(i=>({x:40,y:50+i*390,w:520,h:350})),overlay:null}; }
export function figmaGuide(template: StudioTemplate) {
  const t = parseTemplate(template);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${t.width}" height="${t.height}" viewBox="0 0 ${t.width} ${t.height}"><rect id="PAPER_GUIDE_DELETE_BEFORE_EXPORT" width="${t.width}" height="${t.height}" fill="#f5f0e7"/>${t.slots.map((s,i)=>`<rect id="PHOTO_${i+1}_x${s.x}_y${s.y}_w${s.w}_h${s.h}" x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" fill="#cc8899"/>`).join('')}</svg>`;
}
