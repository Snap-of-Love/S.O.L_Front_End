declare module 'gifenc' {
  export function GIFEncoder(): { writeFrame(index: Uint8Array, width: number, height: number, options: { palette: number[][]; delay: number }): void; finish(): void; bytes(): Uint8Array<ArrayBuffer> };
  export function quantize(data: Uint8ClampedArray, colors: number, options: { format: string }): number[][];
  export function applyPalette(data: Uint8ClampedArray, palette: number[][], format: string): Uint8Array;
}
