import { format } from 'date-fns';
import qrcode from 'qrcode-generator';

export type LensEffectType = 'none' | 'fisheye' | 'toycam' | 'filmburn';

export interface LayoutDef {
  id: string;
  name: string;
  width: number;
  height: number;
  slots: { x: number; y: number; w: number; h: number; rotation?: number }[];
  datePos: { x: number; y: number };
}

export interface CardTheme {
  id: string;
  name: string;
  bgClass: string; // Tailwind bg color representation
  bgHex: string;   // Native canvas background color
  borderHex: string;
  fontHex: string;
  stampColor: string;
  label: string;
}

export const CARD_THEMES: Record<string, CardTheme> = {
  'alabaster': {
    id: 'alabaster',
    name: 'Warm Alabaster',
    bgClass: 'bg-[#faf9f6]',
    bgHex: '#faf9f6',
    borderHex: '#eaeaea',
    fontHex: '#1a1a1a',
    stampColor: '#8e1616', // Deep Ruby date stamp
    label: 'S.O.L ARCHIVE',
  },
  'obsidian': {
    id: 'obsidian',
    name: 'Ink Obsidian',
    bgClass: 'bg-[#121212]',
    bgHex: '#121212',
    borderHex: '#2a2a2a',
    fontHex: '#e0e0e0',
    stampColor: '#ffcc00', // Yellow date stamp
    label: 'SNAP OF LOVE • DIGITAL',
  },
  'blossom': {
    id: 'blossom',
    name: 'Cherry Blossom',
    bgClass: 'bg-[#fff0f3]',
    bgHex: '#fff0f3',
    borderHex: '#ffccd5',
    fontHex: '#590d22',
    stampColor: '#ff4d6d', // Sweet Pink date stamp
    label: 'S.O.L • CHERRY MOMENTS',
  },
  'parchment': {
    id: 'parchment',
    name: 'Vintage Parchment',
    bgClass: 'bg-[#f4ecd8]',
    bgHex: '#f4ecd8',
    borderHex: '#dfd5be',
    fontHex: '#3d3423',
    stampColor: '#8e1616', // Deep Ruby date stamp
    label: 'S.O.L MEMORIES EST. 2026',
  },
  'cyber': {
    id: 'cyber',
    name: 'Cyber Silver',
    bgClass: 'bg-[#e2e8f0]',
    bgHex: '#e2e8f0',
    borderHex: '#94a3b8',
    fontHex: '#0f172a',
    stampColor: '#06b6d4', // Electric Cyan date stamp
    label: 'S.O.L • CYBERSPACE v2.0',
  },
};

export const LAYOUTS: Record<string, LayoutDef> = {
  '1x4': {
    id: '1x4',
    name: 'Classic 4-Strip',
    width: 600,
    height: 1800,
    slots: [
      { x: 40, y: 40, w: 520, h: 390 },
      { x: 40, y: 450, w: 520, h: 390 },
      { x: 40, y: 860, w: 520, h: 390 },
      { x: 40, y: 1270, w: 520, h: 390 },
    ],
    datePos: { x: 40, y: 1730 },
  },
  '2x2': {
    id: '2x2',
    name: 'Quad (Square)',
    width: 1200,
    height: 1040,
    slots: [
      { x: 60, y: 60, w: 520, h: 390 },
      { x: 620, y: 60, w: 520, h: 390 },
      { x: 60, y: 490, w: 520, h: 390 },
      { x: 620, y: 490, w: 520, h: 390 },
    ],
    datePos: { x: 60, y: 980 },
  },
  '1x3': {
    id: '1x3',
    name: 'Minimal 3-Strip',
    width: 600,
    height: 1400,
    slots: [
      { x: 40, y: 40, w: 520, h: 390 },
      { x: 40, y: 450, w: 520, h: 390 },
      { x: 40, y: 860, w: 520, h: 390 },
    ],
    datePos: { x: 40, y: 1330 },
  },
  '1x1': {
    id: '1x1',
    name: 'Vintage Polaroid',
    width: 600,
    height: 720,
    slots: [
      { x: 50, y: 50, w: 500, h: 500 },
    ],
    datePos: { x: 50, y: 640 },
  },
  '2x1': {
    id: '2x1',
    name: 'Cinematic Duo',
    width: 1200,
    height: 600,
    slots: [
      { x: 60, y: 60, w: 510, h: 380 },
      { x: 630, y: 60, w: 510, h: 380 },
    ],
    datePos: { x: 60, y: 540 },
  },
  'scrapbook': {
    id: 'scrapbook',
    name: 'Retro Scrapbook',
    width: 700,
    height: 1600,
    slots: [
      { x: 90, y: 70, w: 520, h: 340, rotation: -3 },
      { x: 90, y: 440, w: 520, h: 340, rotation: 2.5 },
      { x: 90, y: 810, w: 520, h: 340, rotation: -1.5 },
      { x: 90, y: 1180, w: 520, h: 340, rotation: 3 },
    ],
    datePos: { x: 90, y: 1560 },
  },
  'filmstrip': {
    id: 'filmstrip',
    name: 'Retro Filmstrip',
    width: 680,
    height: 1800,
    slots: [
      { x: 90, y: 60, w: 500, h: 375 },
      { x: 90, y: 475, w: 500, h: 375 },
      { x: 90, y: 890, w: 500, h: 375 },
      { x: 90, y: 1305, w: 500, h: 375 },
    ],
    datePos: { x: 90, y: 1735 },
  },
};

export const VISUAL_FILTERS = {
  none: { id: 'none', name: 'Classic Color', style: 'none', canvasFilter: 'none' },
  grayscale: { id: 'grayscale', name: 'Noir Monochromatic', style: 'grayscale(100%) contrast(115%) brightness(105%)', canvasFilter: 'grayscale(1) contrast(1.15) brightness(1.05)' },
  vintage: { id: 'vintage', name: 'Warm Nostalgia', style: 'sepia(35%) saturate(120%) hue-rotate(-5deg) contrast(105%)', canvasFilter: 'sepia(0.35) saturate(1.2) hue-rotate(-5deg) contrast(1.05)' },
  cyber: { id: 'cyber', name: 'Chrome Velvet', style: 'saturate(145%) hue-rotate(15deg) contrast(115%) brightness(102%)', canvasFilter: 'saturate(1.45) hue-rotate(15deg) contrast(1.15) brightness(1.02)' },
};

export type FilterType = keyof typeof VISUAL_FILTERS;

/**
 * Cached 256x256 film-grain noise canvases keyed by quantized intensity (1..100) (`FE-02`).
 * Eliminates per-slot canvas allocation and 262,144 `Math.random()` calls on every frame render.
 */
const grainCanvasCache = new Map<number, HTMLCanvasElement>();

/**
 * Cached static QR matrix for `https://www.instagram.com/snapoflove.id/` (`FE-02`).
 */
let cachedInstagramQr: ReturnType<typeof qrcode> | null = null;

function getInstagramQr(): ReturnType<typeof qrcode> {
  if (!cachedInstagramQr) {
    const qr = qrcode(0, 'M');
    qr.addData('https://www.instagram.com/snapoflove.id/');
    qr.make();
    cachedInstagramQr = qr;
  }
  return cachedInstagramQr;
}

/**
 * Renders an analog film-grain pattern over the current clipped region using a cached noise tile (`FE-02`).
 *
 * @param {CanvasRenderingContext2D} ctx - Destination 2D canvas context
 * @param {number} width - Strip width in pixels
 * @param {number} height - Strip height in pixels
 * @param {number} intensity - Film grain intensity (`0` to `100`)
 */
export function drawGrain(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  intensity: number
): void {
  if (intensity <= 0) return;

  const bucket = Math.max(1, Math.min(100, Math.round(intensity)));
  let noiseCanvas = grainCanvasCache.get(bucket);

  if (!noiseCanvas) {
    noiseCanvas = document.createElement('canvas');
    noiseCanvas.width = 256;
    noiseCanvas.height = 256;
    const nCtx = noiseCanvas.getContext('2d');
    if (!nCtx) return;

    const imgData = nCtx.createImageData(256, 256);
    const data = imgData.data;
    const maxAlpha = Math.min((bucket / 100) * 80, 255);

    for (let i = 0; i < data.length; i += 4) {
      const v = Math.random() * 255;
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = Math.random() * maxAlpha;
    }
    nCtx.putImageData(imgData, 0, 0);
    grainCanvasCache.set(bucket, noiseCanvas);
  }

  ctx.globalCompositeOperation = 'source-over';
  const pattern = ctx.createPattern(noiseCanvas, 'repeat');
  if (pattern) {
    ctx.fillStyle = pattern;
    ctx.fillRect(-width, -height, width * 2, height * 2);
  }
}

function applyManualFilter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  filterId: FilterType
) {
  if (filterId === 'none') return;
  const imgData = ctx.getImageData(x, y, w, h);
  const data = imgData.data;

  if (filterId === 'grayscale') {
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      let gray = 0.299 * r + 0.587 * g + 0.114 * b;
      gray = gray * 1.05; // Brightness (1.05)
      const factor = (259 * (38.25 + 255)) / (255 * (259 - 38.25));
      gray = factor * (gray - 128) + 128; // Contrast (1.15)
      const finalVal = Math.min(255, Math.max(0, gray));
      data[i] = finalVal;
      data[i + 1] = finalVal;
      data[i + 2] = finalVal;
    }
  } else if (filterId === 'vintage') {
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      const sr = (r * 0.393 + g * 0.769 + b * 0.189);
      const sg = (r * 0.349 + g * 0.686 + b * 0.168);
      const sb = (r * 0.272 + g * 0.534 + b * 0.131);
      
      let fr = r * 0.65 + sr * 0.35;
      let fg = g * 0.65 + sg * 0.35;
      let fb = b * 0.65 + sb * 0.35;
      
      const gray = 0.299 * fr + 0.587 * fg + 0.114 * fb;
      fr = gray + (fr - gray) * 1.2; // Saturation (1.2)
      fg = gray + (fg - gray) * 1.2;
      fb = gray + (fb - gray) * 1.2;

      const factor = (259 * (12.75 + 255)) / (255 * (259 - 12.75));
      fr = factor * (fr - 128) + 128; // Contrast (1.05)
      fg = factor * (fg - 128) + 128;
      fb = factor * (fb - 128) + 128;
      
      data[i] = Math.min(255, Math.max(0, fr));
      data[i + 1] = Math.min(255, Math.max(0, fg));
      data[i + 2] = Math.min(255, Math.max(0, fb));
    }
  } else if (filterId === 'cyber') {
    for (let i = 0; i < data.length; i += 4) {
      let r = data[i] * 1.02; // Brightness (1.02)
      let g = data[i + 1] * 1.02;
      let b = data[i + 2] * 1.02;
      
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = gray + (r - gray) * 1.45; // Saturation (1.45)
      g = gray + (g - gray) * 1.45;
      b = gray + (b - gray) * 1.45;
      
      const factor = (259 * (38.25 + 255)) / (255 * (259 - 38.25));
      r = factor * (r - 128) + 128; // Contrast (1.15)
      g = factor * (g - 128) + 128;
      b = factor * (b - 128) + 128;
      
      data[i] = Math.min(255, Math.max(0, r));
      data[i + 1] = Math.min(255, Math.max(0, g));
      data[i + 2] = Math.min(255, Math.max(0, b));
    }
  }
  ctx.putImageData(imgData, x, y);
}

/**
 * Apply camera lens distortion and effects to a photo slot canvas
 */
export function applyLensEffects(
  srcCanvas: HTMLCanvasElement,
  effect: LensEffectType
): HTMLCanvasElement {
  if (effect === 'none') return srcCanvas;

  const w = srcCanvas.width;
  const h = srcCanvas.height;

  // Create a destination canvas
  const dstCanvas = document.createElement('canvas');
  dstCanvas.width = w;
  dstCanvas.height = h;
  const dstCtx = dstCanvas.getContext('2d');
  if (!dstCtx) return srcCanvas;

  const srcCtx = srcCanvas.getContext('2d');
  if (!srcCtx) return srcCanvas;

  // 1. Film Burn Light Leaks
  if (effect === 'filmburn') {
    // Copy the original canvas
    dstCtx.drawImage(srcCanvas, 0, 0);

    // Apply color grading (warm sepia multiplication layer)
    dstCtx.fillStyle = 'rgba(240, 180, 0, 0.08)';
    dstCtx.globalCompositeOperation = 'multiply';
    dstCtx.fillRect(0, 0, w, h);

    // Light Leak 1: Soft orange/red flare in top-left
    const grad1 = dstCtx.createRadialGradient(0, 0, 0, 0, 0, w * 0.7);
    grad1.addColorStop(0, 'rgba(255, 65, 0, 0.45)');  // fiery orange
    grad1.addColorStop(0.5, 'rgba(255, 0, 100, 0.18)'); // soft neon magenta
    grad1.addColorStop(1, 'rgba(0, 0, 0, 0)');
    dstCtx.fillStyle = grad1;
    dstCtx.globalCompositeOperation = 'screen';
    dstCtx.fillRect(0, 0, w, h);

    // Light Leak 2: Warm yellow flare bottom-right
    const grad2 = dstCtx.createRadialGradient(w, h, 0, w, h, w * 0.55);
    grad2.addColorStop(0, 'rgba(255, 200, 0, 0.35)');  // sunny yellow
    grad2.addColorStop(0.6, 'rgba(255, 60, 0, 0.12)');  // warm red glow
    grad2.addColorStop(1, 'rgba(0, 0, 0, 0)');
    dstCtx.fillStyle = grad2;
    dstCtx.fillRect(0, 0, w, h);

    dstCtx.globalCompositeOperation = 'source-over'; // reset
    return dstCanvas;
  }

  // 2. Toy Cam & Fish-eye (require pixel coordinate distortion)
  if (effect === 'fisheye' || effect === 'toycam') {
    const srcImgData = srcCtx.getImageData(0, 0, w, h);
    const srcData = srcImgData.data;

    const dstImgData = dstCtx.createImageData(w, h);
    const dstData = dstImgData.data;

    const cx = w / 2;
    const cy = h / 2;
    // Calculate diagonal radius for normalization
    const maxR = Math.sqrt(cx * cx + cy * cy);

    const isFisheye = effect === 'fisheye';
    const distortionFactor = 1.35; // Bulge power
    const shiftScale = 0.012; // Chromatic aberration shift factor

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const theta = Math.atan2(dy, dx);
        const rNorm = dist / maxR;

        // Warp radius if fisheye, otherwise keep original flat grid
        const warpedRNorm = isFisheye ? Math.pow(rNorm, distortionFactor) : rNorm;

        // Radial offset chromatic shift (more pronounced near edges)
        const shiftPixels = shiftScale * dist;

        // Red lookup coordinates (shifted slightly outwards along the angle)
        const rx = cx + Math.cos(theta) * (warpedRNorm * maxR + shiftPixels);
        const ry = cy + Math.sin(theta) * (warpedRNorm * maxR + shiftPixels);

        // Green lookup coordinates (base/center)
        const gx = cx + Math.cos(theta) * (warpedRNorm * maxR);
        const gy = cy + Math.sin(theta) * (warpedRNorm * maxR);

        // Blue lookup coordinates (shifted slightly inwards along the angle)
        const bx = cx + Math.cos(theta) * (warpedRNorm * maxR - shiftPixels);
        const by = cy + Math.sin(theta) * (warpedRNorm * maxR - shiftPixels);

        const destIdx = (y * w + x) * 4;

        // 1. Red Channel lookup
        if (rx >= 0 && rx < w && ry >= 0 && ry < h) {
          const sIdx = (Math.floor(ry) * w + Math.floor(rx)) * 4;
          dstData[destIdx] = srcData[sIdx];
        } else {
          dstData[destIdx] = 0; // Black vignette boundary
        }

        // 2. Green Channel lookup
        if (gx >= 0 && gx < w && gy >= 0 && gy < h) {
          const sIdx = (Math.floor(gy) * w + Math.floor(gx)) * 4;
          dstData[destIdx + 1] = srcData[sIdx + 1];
        } else {
          dstData[destIdx + 1] = 0;
        }

        // 3. Blue Channel lookup
        if (bx >= 0 && bx < w && by >= 0 && by < h) {
          const sIdx = (Math.floor(by) * w + Math.floor(bx)) * 4;
          dstData[destIdx + 2] = srcData[sIdx + 2];
        } else {
          dstData[destIdx + 2] = 0;
        }

        // 4. Alpha (Opaque)
        // circular alpha softening for the outer ring boundary
        if (isFisheye && rNorm > 0.88) {
          const fade = Math.max(0, 1 - (rNorm - 0.88) / 0.12);
          dstData[destIdx + 3] = Math.floor(fade * 255);
        } else {
          dstData[destIdx + 3] = 255;
        }
      }
    }

    dstCtx.putImageData(dstImgData, 0, 0);

    // Overlay vignette shadow & 3D lens highlight reflections for fisheye camera
    if (isFisheye) {
      dstCtx.save();
      // Outer lens border vignette
      const vignette = dstCtx.createRadialGradient(cx, cy, w * 0.35, cx, cy, maxR);
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(0.7, 'rgba(0,0,0,0.35)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.92)');
      dstCtx.fillStyle = vignette;
      dstCtx.fillRect(0, 0, w, h);

      // Spherical glass reflections
      const glass = dstCtx.createRadialGradient(cx - w * 0.15, cy - h * 0.15, 0, cx - w * 0.15, cy - h * 0.15, w * 0.5);
      glass.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
      glass.addColorStop(1, 'rgba(255, 255, 255, 0)');
      dstCtx.fillStyle = glass;
      dstCtx.fillRect(0, 0, w, h);
      dstCtx.restore();
    }

    return dstCanvas;
  }

  return srcCanvas;
}

export function renderStrip(
  photos: HTMLCanvasElement[][],
  layout: LayoutDef,
  grain: number,
  showDate: boolean,
  frameIndex: number,
  themeId: string = 'alabaster',
  filterId: FilterType = 'none',
  lensEffect: LensEffectType = 'none'
): HTMLCanvasElement {
  const bgCanvas = document.createElement('canvas');
  bgCanvas.width = layout.width;
  bgCanvas.height = layout.height;
  const ctx = bgCanvas.getContext('2d');
  if (!ctx) return bgCanvas;

  const theme = CARD_THEMES[themeId] || CARD_THEMES.alabaster;

  // Draw customized premium theme paper background
  ctx.fillStyle = theme.bgHex;
  ctx.fillRect(0, 0, layout.width, layout.height);

  // If filmstrip layout, draw the side sprocket holes and dark vertical film tracks
  if (layout.id === 'filmstrip') {
    ctx.fillStyle = themeId === 'obsidian' ? '#000000' : '#141414';
    ctx.fillRect(0, 0, 70, layout.height);
    ctx.fillRect(layout.width - 70, 0, 70, layout.height);

    ctx.fillStyle = theme.bgHex;
    const holeW = 20;
    const holeH = 12;
    const spacing = 45;
    for (let y = 20; y < layout.height - 20; y += spacing) {
      ctx.fillRect(25, y, holeW, holeH);
      ctx.fillRect(layout.width - 45, y, holeW, holeH);
    }
  }

  // Draw photos into computed slots
  layout.slots.forEach((slot, idx) => {
    if (photos[idx] && photos[idx][frameIndex]) {
      const img = photos[idx][frameIndex];
      const imgRatio = img.width / img.height;
      const slotRatio = slot.w / slot.h;

      let sx = 0,
        sy = 0,
        sw = img.width,
        sh = img.height;

      // Cover crop strategy
      if (imgRatio > slotRatio) {
        sw = sh * slotRatio;
        sx = (img.width - sw) / 2;
      } else {
        sh = sw / slotRatio;
        sy = (img.height - sh) / 2;
      }

      // Draw backdrop border/accent first, then photo with optional rotation and shadow
      ctx.save();
      if (slot.rotation) {
        ctx.translate(slot.x + slot.w / 2, slot.y + slot.h / 2);
        ctx.rotate((slot.rotation * Math.PI) / 180);
        
        ctx.shadowColor = 'rgba(0, 0, 0, 0.22)';
        ctx.shadowBlur = 14;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 6;
        
        ctx.fillStyle = theme.borderHex;
        ctx.fillRect(-slot.w / 2, -slot.h / 2, slot.w, slot.h);
      } else {
        ctx.fillStyle = theme.borderHex;
        ctx.fillRect(slot.x, slot.y, slot.w, slot.h);
      }

      // Create a temporary canvas for this photo slot to apply filters & lens distortion cleanly
      const slotCvs = document.createElement('canvas');
      slotCvs.width = slot.w;
      slotCvs.height = slot.h;
      const slotCtx = slotCvs.getContext('2d');

      if (slotCtx) {
        // Hardware accelerated filter application inside temporary slot canvas
        const activeFilter = VISUAL_FILTERS[filterId] || VISUAL_FILTERS.none;
        if (activeFilter.canvasFilter !== 'none' && ('filter' in slotCtx)) {
          slotCtx.filter = activeFilter.canvasFilter;
        }

        // Draw cropped photo onto the slot canvas
        slotCtx.drawImage(img, sx, sy, sw, sh, 0, 0, slot.w, slot.h);

        // Fallback for Safari/iOS browsers that do not support native Canvas filters
        if (!('filter' in slotCtx) && filterId !== 'none') {
          applyManualFilter(slotCtx, 0, 0, slot.w, slot.h, filterId);
        }

        // Apply advanced camera lens effects (Fish-eye distortion, aberration, light leaks)
        const processedSlotCvs = applyLensEffects(slotCvs, lensEffect);

        // Draw final processed photo slot onto the main photo strip canvas
        if (slot.rotation) {
          ctx.drawImage(processedSlotCvs, -slot.w / 2, -slot.h / 2);
        } else {
          ctx.drawImage(processedSlotCvs, slot.x, slot.y);
        }
      }
      ctx.restore();
    } else {
      // Empty slot placeholder
      if (slot.rotation) {
        ctx.save();
        ctx.translate(slot.x + slot.w / 2, slot.y + slot.h / 2);
        ctx.rotate((slot.rotation * Math.PI) / 180);
        ctx.fillStyle = theme.borderHex;
        ctx.fillRect(-slot.w / 2, -slot.h / 2, slot.w, slot.h);
        ctx.restore();
      } else {
        ctx.fillStyle = theme.borderHex;
        ctx.fillRect(slot.x, slot.y, slot.w, slot.h);
      }
    }
  });

  // Apply Grain filter overlay — scoped to photo slots only (not the card frame)
  if (grain > 0) {
    layout.slots.forEach((slot, idx) => {
      if (photos[idx] && photos[idx][frameIndex]) {
        ctx.save();
        ctx.beginPath();
        if (slot.rotation) {
          ctx.translate(slot.x + slot.w / 2, slot.y + slot.h / 2);
          ctx.rotate((slot.rotation * Math.PI) / 180);
          ctx.rect(-slot.w / 2, -slot.h / 2, slot.w, slot.h);
        } else {
          ctx.rect(slot.x, slot.y, slot.w, slot.h);
        }
        ctx.clip();
        drawGrain(ctx, layout.width, layout.height, grain);
        ctx.restore();
      }
    });
  }

  // Apply Date Stamp
  if (showDate) {
    const dateStr = format(new Date(), 'yy.MM.dd'); // nostalgic camera format e.g. '26.05.20'
    ctx.font = '36px "VT323", monospace';
    ctx.fillStyle = theme.stampColor;
    
    // Position date stamps aesthetically based on layout width & layout definition
    ctx.fillText(`'${dateStr}`, layout.datePos.x, layout.datePos.y);
  }

  // Draw QR code linking to Instagram page and Brand Signature (cached matrix, FE-02)
  try {
    const qr = getInstagramQr();

    const moduleCount = qr.getModuleCount();
    const qrSize = 64; // Enhanced size for 100% scannability across GIF, PNG, and JPG
    const cellSize = qrSize / moduleCount;

    // Position: bottom-right corner of the strip
    const qrX = layout.id === 'filmstrip' ? layout.width - qrSize - 85 : layout.width - qrSize - 35;
    const qrY = layout.datePos.y - qrSize + 6;

    // 1. Draw solid white quiet-zone background box to guarantee high contrast for camera scanners
    const pad = 5;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(qrX - pad, qrY - pad, qrSize + pad * 2, qrSize + pad * 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 1;
    ctx.strokeRect(qrX - pad, qrY - pad, qrSize + pad * 2, qrSize + pad * 2);

    // 2. Draw crisp black QR modules
    ctx.fillStyle = '#000000';
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (qr.isDark(row, col)) {
          ctx.fillRect(
            Math.round(qrX + col * cellSize),
            Math.round(qrY + row * cellSize),
            Math.ceil(cellSize),
            Math.ceil(cellSize)
          );
        }
      }
    }

    // Draw Brand signature on physical paper bottom margin, to the left of the QR
    const textX = qrX - 16;
    const textY = layout.datePos.y;
    ctx.font = 'bold 16px "Inter", sans-serif';
    ctx.fillStyle = theme.fontHex;
    ctx.textAlign = 'right';
    ctx.fillText(theme.label, textX, textY);
    ctx.textAlign = 'left'; // reset

  } catch (e) {
    console.warn('QR code generation failed:', e);
    // Fallback if QR fails
    const textX = layout.id === 'filmstrip' ? layout.width - 90 : layout.width - 40;
    const textY = layout.datePos.y;
    ctx.font = 'bold 16px "Inter", sans-serif';
    ctx.fillStyle = theme.fontHex;
    ctx.textAlign = 'right';
    ctx.fillText(theme.label, textX, textY);
    ctx.textAlign = 'left'; // reset
  }

  return bgCanvas;
}
