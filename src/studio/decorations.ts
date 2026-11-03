export const STICKERS = ['♡','♥','✦','★','✿','☀','☺','LOVE'] as const;
export const INKS = ['#a92b35','#ffffff','#171717','#efbf78','#cf83aa'] as const;
export type Point = { x: number; y: number };
export type Decoration = { id: string; color: string } & ({ kind: 'sticker'; text: string; x: number; y: number; size: number; rotation: number } | { kind: 'doodle'; points: Point[]; width: number });
const unit = (n: number) => Number.isFinite(n) && n >= 0 && n <= 1;
export function validDecorations(value: unknown): value is Decoration[] {
  return Array.isArray(value) && value.length <= 40 && value.every((d: Decoration) => d && typeof d.id === 'string' && d.id.length <= 100 && INKS.includes(d.color as typeof INKS[number]) && (d.kind === 'sticker' ? STICKERS.includes(d.text as typeof STICKERS[number]) && unit(d.x) && unit(d.y) && Number.isFinite(d.size) && d.size >= .02 && d.size <= .4 && Number.isFinite(d.rotation) && Math.abs(d.rotation) <= 180 : d.kind === 'doodle' && Number.isFinite(d.width) && d.width >= .001 && d.width <= .03 && Array.isArray(d.points) && d.points.length >= 1 && d.points.length <= 400 && d.points.every(p => p && unit(p.x) && unit(p.y))));
}
export function renderDecorations(ctx: CanvasRenderingContext2D, layers: readonly Decoration[], width: number, height: number) {
  if (!validDecorations(layers)) throw new Error('Invalid decoration layers.');
  ctx.save(); ctx.beginPath(); ctx.rect(0,0,width,height); ctx.clip();
  for (const layer of layers) {
    ctx.save(); ctx.fillStyle = ctx.strokeStyle = layer.color;
    if (layer.kind === 'sticker') { ctx.translate(layer.x * width, layer.y * height); ctx.rotate(layer.rotation * Math.PI / 180); ctx.font = `bold ${Math.min(width,height) * layer.size}px Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(layer.text,0,0); }
    else { ctx.lineWidth = layer.width * Math.min(width,height); ctx.lineCap = ctx.lineJoin = 'round'; ctx.beginPath(); const first = layer.points[0]!; ctx.moveTo(first.x * width,first.y * height); for (const p of layer.points.slice(1)) ctx.lineTo(p.x * width,p.y * height); if (layer.points.length === 1) ctx.lineTo(first.x * width + .01,first.y * height); ctx.stroke(); }
    ctx.restore();
  }
  ctx.restore();
}
