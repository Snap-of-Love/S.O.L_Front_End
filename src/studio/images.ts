export const MAX_PHOTOS = 8;
export const MAX_FILE_BYTES = 12 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 36_000_000;
export interface StudioPhoto { id: string; name: string; frames: string[] }
export function imageKind(bytes: Uint8Array): 'jpeg' | 'png' | 'webp' | null {
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'jpeg';
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v)) return 'png';
  const text = (a: number, b: number) => String.fromCharCode(...bytes.slice(a, b));
  return text(0, 4) === 'RIFF' && text(8, 12) === 'WEBP' ? 'webp' : null;
}
export async function validatePhoto(file: File): Promise<{ kind: string; bytes: Uint8Array }> {
  if (!file.size || file.size > MAX_FILE_BYTES) throw new Error(`${file.name}: choose a photo under 12 MB.`);
  const bytes = new Uint8Array(await file.slice(0, 262144).arrayBuffer());
  const kind = imageKind(bytes);
  if (!kind || !['image/jpeg', 'image/png', 'image/webp', ''].includes(file.type)) throw new Error(`${file.name}: use a JPEG, PNG or WebP photo. Convert HEIC to JPEG first.`);
  if (file.type && file.type !== `image/${kind}`) throw new Error(`${file.name}: file contents do not match its image type.`);
  if (kind === 'png' && bytes.length >= 24) {
    const view = new DataView(bytes.buffer), width = view.getUint32(16), height = view.getUint32(20);
    if (!width || !height || width * height > MAX_IMAGE_PIXELS) throw new Error(`${file.name}: use a photo below 36 megapixels.`);
  }
  if (kind === 'webp' && bytes.length >= 30) {
    const chunk = String.fromCharCode(...bytes.slice(12, 16));
    const u24 = (offset: number) => bytes[offset]! + (bytes[offset + 1]! << 8) + (bytes[offset + 2]! << 16);
    let width = 0, height = 0;
    if (chunk === 'VP8X') { width = 1 + u24(24); height = 1 + u24(27); }
    else if (chunk === 'VP8L' && bytes[20] === 47) { const bits = new DataView(bytes.buffer).getUint32(21, true); width = (bits & 16383) + 1; height = ((bits >>> 14) & 16383) + 1; }
    else if (chunk === 'VP8 ') { const view = new DataView(bytes.buffer); width = view.getUint16(26, true) & 16383; height = view.getUint16(28, true) & 16383; }
    if (!width || !height || width * height > MAX_IMAGE_PIXELS) throw new Error(`${file.name}: use a valid photo below 36 megapixels.`);
  }
  if (kind === 'jpeg') {
    let offset = 2, found = false;
    while (offset + 8 < bytes.length) {
      if (bytes[offset] !== 255) break;
      const marker = bytes[offset + 1]!; if (marker === 217 || marker === 218) break;
      const length = (bytes[offset + 2]! << 8) + bytes[offset + 3]!;
      if (length < 2) break;
      if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker)) {
        const height = (bytes[offset + 5]! << 8) + bytes[offset + 6]!, width = (bytes[offset + 7]! << 8) + bytes[offset + 8]!;
        if (!width || !height || width * height > MAX_IMAGE_PIXELS) throw new Error(`${file.name}: use a photo below 36 megapixels.`);
        found = true; break;
      }
      offset += 2 + length;
    }
    if (!found) throw new Error(`${file.name}: this JPEG is damaged or has an unsupported header. Re-export it and try again.`);
  }
  return { kind, bytes };
}
export function fittedSize(width: number, height: number, maximum = 1600) {
  if (!Number.isFinite(width * height) || width <= 0 || height <= 0 || width * height > MAX_IMAGE_PIXELS) throw new Error('Photo dimensions are unsupported.');
  const scale = Math.min(1, maximum / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export function loadImage(source: string, signal?: AbortSignal): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image(); image.decoding = 'async';
    const clean = () => { clearTimeout(timer); image.onload = null; image.onerror = null; signal?.removeEventListener('abort', abort); };
    const abort = () => { clean(); image.src = ''; reject(new DOMException('Photo loading cancelled.', 'AbortError')); };
    const timer = setTimeout(() => { clean(); image.src = ''; reject(new Error('Photo decoding timed out. Try a smaller photo.')); }, 15000);
    image.onload = () => { clean(); resolve(image); };
    image.onerror = () => { clean(); reject(new Error('This photo could not be decoded. Try re-exporting it as JPEG or PNG.')); };
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) { abort(); return; }
    image.src = source;
  });
}
export async function normalizePhoto(file: File, signal?: AbortSignal): Promise<StudioPhoto> {
  await validatePhoto(file);
  if (signal?.aborted) throw new DOMException('Import cancelled.', 'AbortError');
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url, signal);
    const size = fittedSize(image.naturalWidth, image.naturalHeight);
    const canvas = document.createElement('canvas'); canvas.width = size.width; canvas.height = size.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Photo editing is unavailable in this browser.');
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, size.width, size.height);
    context.drawImage(image, 0, 0, size.width, size.height);
    return { id: crypto.randomUUID(), name: file.name.slice(0, 100), frames: [canvas.toDataURL('image/jpeg', 0.9)] };
  } finally { URL.revokeObjectURL(url); }
}
export async function importPhotos(files: readonly File[], signal?: AbortSignal): Promise<StudioPhoto[]> {
  if (!files.length || files.length > MAX_PHOTOS) throw new Error('Choose between one and eight photos.');
  const photos: StudioPhoto[] = [];
  // Decode sequentially so several large photos do not allocate full-sized bitmaps together.
  for (const file of files) photos.push(await normalizePhoto(file, signal));
  return photos;
}
export async function photoCanvases(photos: readonly StudioPhoto[], signal?: AbortSignal): Promise<HTMLCanvasElement[][]> {
  const result: HTMLCanvasElement[][] = [];
  for (const photo of photos) {
    const frames: HTMLCanvasElement[] = [];
    for (const url of photo.frames) {
      const image = await loadImage(url, signal), size = fittedSize(image.naturalWidth, image.naturalHeight);
      const canvas = document.createElement('canvas'); canvas.width = size.width; canvas.height = size.height;
      const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Canvas is unavailable.');
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height); frames.push(canvas);
    }
    result.push(frames);
  }
  return result;
}
