export interface StudioPhoto { id: string; name: string; frames: string[] }

function fittedSize(width: number, height: number) {
  if (!Number.isFinite(width * height) || width <= 0 || height <= 0 || width * height > 36_000_000) throw new Error('Photo dimensions are unsupported.');
  const scale = Math.min(1, 1600 / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    const clean = () => {
      clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
    };
    const timer = setTimeout(() => {
      clean();
      image.removeAttribute('src');
      reject(new Error('A saved photo took too long to open.'));
    }, 15000);
    image.onload = () => {
      clean();
      resolve(image);
    };
    image.onerror = () => {
      clean();
      reject(new Error('A saved photo could not be opened.'));
    };
    image.src = source;
  });
}
export async function photoCanvases(photos: readonly StudioPhoto[]): Promise<HTMLCanvasElement[][]> {
  const result: HTMLCanvasElement[][] = [];
  for (const photo of photos) {
    const frames: HTMLCanvasElement[] = [];
    for (const url of photo.frames) {
      const image = await loadImage(url);
      const size = fittedSize(image.naturalWidth, image.naturalHeight);
      const canvas = document.createElement('canvas');
      canvas.width = size.width;
      canvas.height = size.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas is unavailable.');
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      frames.push(canvas);
    }
    result.push(frames);
  }
  return result;
}
