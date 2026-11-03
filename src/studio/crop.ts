export interface PhotoCrop { x: number; y: number; zoom: number; rotation: 0 | 90 | 180 | 270; flip: boolean }
export function defaultCrop(): PhotoCrop { return { x: 0, y: 0, zoom: 1, rotation: 0, flip: false }; }
export function validCrop(value: unknown): value is PhotoCrop {
  if (!value || typeof value !== 'object') return false;
  const c = value as PhotoCrop;
  return [c.x, c.y, c.zoom].every(Number.isFinite) && Math.abs(c.x) <= 1 && Math.abs(c.y) <= 1 && c.zoom >= 1 && c.zoom <= 3 && [0,90,180,270].includes(c.rotation) && typeof c.flip === 'boolean';
}
export function cropTransform(sourceWidth: number, sourceHeight: number, width: number, height: number, crop: PhotoCrop = defaultCrop()) {
  if (![sourceWidth, sourceHeight, width, height].every(n => Number.isFinite(n) && n > 0) || !validCrop(crop)) throw new Error('Invalid crop dimensions.');
  const quarterTurn = crop.rotation % 180 !== 0;
  const rotatedWidth = quarterTurn ? sourceHeight : sourceWidth, rotatedHeight = quarterTurn ? sourceWidth : sourceHeight;
  const scale = Math.max(width / rotatedWidth, height / rotatedHeight) * crop.zoom;
  return { scale, offsetX: -crop.x * (rotatedWidth * scale - width) / 2 || 0, offsetY: -crop.y * (rotatedHeight * scale - height) / 2 || 0, radians: crop.rotation * Math.PI / 180 };
}
export function drawCroppedPhoto(context: CanvasRenderingContext2D, image: HTMLCanvasElement, width: number, height: number, crop = defaultCrop()) {
  const transform = cropTransform(image.width, image.height, width, height, crop);
  context.save(); context.beginPath(); context.rect(0, 0, width, height); context.clip();
  context.translate(width / 2 + transform.offsetX, height / 2 + transform.offsetY); context.rotate(transform.radians);
  context.scale(transform.scale * (crop.flip ? -1 : 1), transform.scale);
  context.drawImage(image, -image.width / 2, -image.height / 2); context.restore();
}
