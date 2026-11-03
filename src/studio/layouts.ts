import { LAYOUTS, type LayoutDef } from '../lib/renderUtils.ts';

for (let count = 5; count <= 8; count++) {
  const rows = Math.ceil(count / 2), id = `${count}-photos`;
  const layout: LayoutDef = { id, name: `${count} photo grid`, width: 1200, height: rows * 430 + 160, slots: Array.from({ length: count }, (_, index) => ({ x: 60 + index % 2 * 560, y: 40 + Math.floor(index / 2) * 430, w: 520, h: 390 })), datePos: { x: 60, y: rows * 430 + 95 } };
  LAYOUTS[id] = layout;
}
export { LAYOUTS };
export function layoutForCount(count: number): LayoutDef {
  if (!Number.isInteger(count) || count < 1 || count > 8) throw new Error('Choose one to eight photos.');
  return LAYOUTS[({ 1: '1x1', 2: '2x1', 3: '1x3', 4: '1x4' } as Record<number, string>)[count] ?? `${count}-photos`]!;
}
