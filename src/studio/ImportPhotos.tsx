import { useEffect, useId, useRef, useState } from 'react';
import { Upload, LoaderCircle } from 'lucide-react';
import { importPhotos, type StudioPhoto } from './images';

interface Props { onImported: (photos: StudioPhoto[]) => void; onError: (message: string) => void; disabled?: boolean }
export function ImportPhotos({ onImported, onError, disabled = false }: Props) {
  const input = useRef<HTMLInputElement>(null), pending = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false), [dragging, setDragging] = useState(false);
  const help = useId();
  useEffect(() => () => pending.current?.abort(), []);
  async function load(files: FileList | null) {
    if (!files?.length || busy || disabled) return;
    pending.current?.abort(); const controller = new AbortController(); pending.current = controller;
    setBusy(true);
    try { const photos = await importPhotos(Array.from(files), controller.signal); if (!controller.signal.aborted) onImported(photos); }
    catch (error) { if (!controller.signal.aborted) onError(error instanceof Error ? error.message : 'Unable to import these photos.'); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  return <div className={`photo-import ${dragging ? 'is-dragging' : ''}`} onDragOver={event => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); void load(event.dataTransfer.files); }}>
    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden disabled={disabled || busy} aria-label="Choose photos to import" onChange={event => { void load(event.target.files); event.target.value = ''; }} />
    <button type="button" className="button button-secondary" disabled={busy || disabled} aria-describedby={help} onClick={() => input.current?.click()}>
      {busy ? <LoaderCircle size={18} className="spin" /> : <Upload size={18} />} {busy ? 'Preparing photos…' : 'Upload photos'}
    </button>
    <p id={help}>Choose or drop 1–8 JPEG, PNG or WebP photos. Up to 12 MB each.</p>
    <p className="privacy-note">Photos stay on this device until you create a share link.</p>
    <span role="status" className="sr-only">{busy ? 'Importing and preparing photos.' : ''}</span>
  </div>;
}
