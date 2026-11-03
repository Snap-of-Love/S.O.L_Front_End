import { useEffect, useState } from 'react';
import { photoCanvases } from './images';
import type { StudioProject } from './project';
import { LAYOUTS } from './layouts';
import { renderStrip } from '../lib/renderUtils';
export function compose(canvases: HTMLCanvasElement[][], project: StudioProject, frame?: number) {
  const layout = LAYOUTS[project.layoutId] ?? LAYOUTS['1x4']!;
  return renderStrip(canvases, layout, project.grain, project.showDate, frame ?? project.frames, project.themeId, project.filterId, project.lens, project.caption, { crops: project.crops });
}
export function usePreview(project: StudioProject) {
  const [canvases, setCanvases] = useState<HTMLCanvasElement[][]>([]), [url, setUrl] = useState(''), [error, setError] = useState(''), [preparing, setPreparing] = useState(false);
  useEffect(() => {
    const controller = new AbortController(); setCanvases([]); setUrl(''); setError('');
    if (!project.photos.length) return () => controller.abort();
    setPreparing(true);
    void photoCanvases(project.photos, controller.signal).then(result => { if (!controller.signal.aborted) setCanvases(result); }).catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Preview failed.'); }).finally(() => { if (!controller.signal.aborted) setPreparing(false); });
    return () => controller.abort();
  }, [project.photos]);
  useEffect(() => {
    if (!canvases.length) return;
    const timer = setTimeout(() => {
      try { const full = compose(canvases, project), small = document.createElement('canvas'); const ratio = Math.min(1, 900 / Math.max(full.width, full.height)); small.width = Math.round(full.width * ratio); small.height = Math.round(full.height * ratio); small.getContext('2d')?.drawImage(full, 0, 0, small.width, small.height); setUrl(small.toDataURL('image/jpeg', 0.9)); setError(''); }
      catch { setError('This preview could not be rendered. Try another layout or smaller photos.'); }
    }, 140);
    return () => clearTimeout(timer);
  }, [canvases, project]);
  return { canvases, url, error, preparing };
}
