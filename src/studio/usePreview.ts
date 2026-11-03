import { templateLayout } from './templates';
import { validateOverlay } from './templateStorage';
import { useEffect, useState } from 'react';
import { photoCanvases } from './images';
import type { StudioProject } from './project';
import { LAYOUTS } from './layouts';
import { renderStrip } from '../lib/renderUtils';
export function compose(canvases: HTMLCanvasElement[][], project: StudioProject, frame?: number, overlay?: HTMLImageElement) {
  const custom = project.customTemplate?.id === project.layoutId ? project.customTemplate : null;
  const layout = custom ? templateLayout(custom) : LAYOUTS[project.layoutId] ?? LAYOUTS['1x4']!;
  if (custom?.overlay && !overlay) throw new Error('Frame artwork is still loading.');
  return renderStrip(canvases, layout, project.grain, project.showDate, frame ?? project.frames, project.themeId, project.filterId, project.lens, project.caption, { crops: project.crops, decorations: project.decorations, overlay, customFrame: !!custom });
}
export function usePreview(project: StudioProject) {
  const [canvases, setCanvases] = useState<HTMLCanvasElement[][]>([]), [url, setUrl] = useState(''), [error, setError] = useState(''), [preparing, setPreparing] = useState(false);
  const [overlay,setOverlay] = useState<HTMLImageElement>(), [overlayBusy,setOverlayBusy] = useState(false);
  const custom = project.customTemplate?.id === project.layoutId ? project.customTemplate : null;
  useEffect(() => {
    const controller = new AbortController(); setOverlay(undefined); setOverlayBusy(!!custom?.overlay);
    if (custom?.overlay) void validateOverlay(custom.overlay,custom,controller.signal).then(image => { if (!controller.signal.aborted) { setOverlay(image); setError(''); } }).catch(e => { if (!controller.signal.aborted) setError(e.message); }).finally(() => { if (!controller.signal.aborted) setOverlayBusy(false); });
    return () => controller.abort();
  }, [custom]);
  useEffect(() => {
    const controller = new AbortController(); setCanvases([]); setUrl(''); setError('');
    if (!project.photos.length) { setPreparing(false); return () => controller.abort(); }
    setPreparing(true);
    void photoCanvases(project.photos, controller.signal).then(result => { if (!controller.signal.aborted) setCanvases(result); }).catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Preview failed.'); }).finally(() => { if (!controller.signal.aborted) setPreparing(false); });
    return () => controller.abort();
  }, [project.photos]);
  useEffect(() => {
    if (!canvases.length || custom?.overlay && !overlay) return;
    const timer = setTimeout(() => {
      try { const full = compose(canvases, project, undefined, overlay), small = document.createElement('canvas'); const ratio = Math.min(1, 900 / Math.max(full.width, full.height)); small.width = Math.round(full.width * ratio); small.height = Math.round(full.height * ratio); small.getContext('2d')?.drawImage(full, 0, 0, small.width, small.height); setUrl(small.toDataURL('image/jpeg', 0.9)); setError(''); }
      catch { setError('This preview could not be rendered. Try another layout or smaller photos.'); }
    }, 140);
    return () => clearTimeout(timer);
  }, [canvases, project, overlay]);
  return { canvases, url, error, preparing: preparing || overlayBusy, overlay };
}
