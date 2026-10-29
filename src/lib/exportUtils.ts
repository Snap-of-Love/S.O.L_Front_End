import { GIFEncoder, quantize, applyPalette } from 'gifenc';

/**
 * Encodes an array of composited HTMLCanvasElement strip frames into an animated GIF Blob.
 * Yields to the browser event loop between frames so UI animations remain responsive.
 *
 * @param {HTMLCanvasElement[]} frames - Ordered sequence of rendered strip canvases
 * @param {number} width - Output GIF width in pixels
 * @param {number} height - Output GIF height in pixels
 * @param {number} [fps=8] - Playback frame rate in frames per second
 * @returns {Promise<Blob>} Encoded `image/gif` Blob
 */
export async function createGifExporter(
  frames: HTMLCanvasElement[],
  width: number,
  height: number,
  fps: number = 8
): Promise<Blob> {
  const gif = GIFEncoder();
  let palette: number[][] | null = null;

  for (let i = 0; i < frames.length; i++) {
    const frameCanvas = frames[i];
    if (!frameCanvas) continue;
    const ctx = frameCanvas.getContext('2d');
    if (!ctx) continue;

    const imageData = ctx.getImageData(0, 0, width, height).data;

    // Quantize to 256 colors using rgba4444 format (computed once for palette stability)
    if (!palette) {
      palette = quantize(imageData, 256, { format: 'rgba4444' });
    }
    const index = applyPalette(imageData, palette, 'rgba4444');

    gif.writeFrame(index, width, height, { palette, delay: 1000 / fps });

    // Yield to the event loop so the UI doesn't freeze during encoding
    await new Promise<void>((r) => setTimeout(r, 0));
  }

  gif.finish();
  return new Blob([gif.bytes()], { type: 'image/gif' });
}
