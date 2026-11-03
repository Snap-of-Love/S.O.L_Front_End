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
