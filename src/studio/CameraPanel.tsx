import { useEffect, useRef, useState } from 'react';
import { Camera, ArrowLeft } from 'lucide-react';
import type { StudioPhoto } from './images';
import { playShutter } from '../lib/audioUtils';

export function CameraPanel({ count, onComplete, onCancel }: { count: number; onComplete: (photos: StudioPhoto[]) => void; onCancel: () => void }) {
  const video = useRef<HTMLVideoElement>(null), stream = useRef<MediaStream | null>(null), active = useRef(true), job = useRef<AbortController | null>(null);
  const [ready, setReady] = useState(false), [error, setError] = useState(''), [busy, setBusy] = useState(false), [delay, setDelay] = useState(3), [countdown, setCountdown] = useState<number | null>(null), [pose, setPose] = useState(0), [sound, setSound] = useState(false);
  async function setup() {
    setError(''); setReady(false); stream.current?.getTracks().forEach(track => track.stop());
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access needs a supported browser and a secure HTTPS connection. You can import photos instead.');
      const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 720 } }, audio: false });
      if (!active.current) { media.getTracks().forEach(track => track.stop()); return; }
      stream.current = media;
      if (video.current) { video.current.srcObject = media; await video.current.play(); if (active.current) setReady(true); }
    } catch (reason) {
      if (!active.current) return;
      const name = reason instanceof Error ? reason.name : '';
      setError(name === 'NotAllowedError' ? 'Camera access was blocked. Allow the camera in your browser’s site settings, then choose Retry camera. You can also import photos.' : name === 'NotFoundError' ? 'No camera was found. Connect one or import photos instead.' : name === 'NotReadableError' ? 'Another app may be using the camera. Close it, then retry.' : reason instanceof Error && name === 'Error' ? reason.message : 'The camera could not start. Check permissions or import photos instead.');
    }
  }
  useEffect(() => { active.current = true; void setup(); return () => { active.current = false; job.current?.abort(); stream.current?.getTracks().forEach(track => track.stop()); }; }, []);
  async function capture() {
    if (!video.current || !ready || busy) return;
    const controller = new AbortController(); job.current = controller; setBusy(true);
    const pause = (ms: number) => new Promise<boolean>(resolve => { const timer = setTimeout(() => { controller.signal.removeEventListener('abort', abort); resolve(true); }, ms); const abort = () => { clearTimeout(timer); resolve(false); }; controller.signal.addEventListener('abort', abort, { once: true }); if (controller.signal.aborted) abort(); });
    const photos: StudioPhoto[] = [];
    try {
      for (let i = 0; i < count; i++) {
        setPose(i + 1);
        for (let n = delay; n > 0; n--) { setCountdown(n); if (!await pause(1000)) return; }
        setCountdown(null); if (sound) playShutter(); const frames: string[] = [];
        for (let f = 0; f < 5; f++) {
          const element = video.current; if (!element?.videoWidth) throw new Error('Camera disconnected. Your existing photos are safe; retry or import photos.');
          const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = Math.round(640 * element.videoHeight / element.videoWidth);
          const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Canvas is unavailable.');
          ctx.translate(canvas.width, 0); ctx.scale(-1, 1); ctx.drawImage(element, 0, 0, canvas.width, canvas.height); frames.push(canvas.toDataURL('image/jpeg', 0.88));
          if (!await pause(100)) return;
        }
        photos.push({ id: crypto.randomUUID(), name: `Camera photo ${i + 1}`, frames });
      }
      if (!controller.signal.aborted) onComplete(photos);
    } catch (reason) { if (active.current) setError(reason instanceof Error ? reason.message : 'Capture failed. Please retry.'); }
    finally { if (active.current) { setBusy(false); setCountdown(null); } }
  }
  return <section className="camera-panel" aria-label="Photo capture">
    <div className="section-heading"><button type="button" className="button button-quiet" onClick={onCancel}><ArrowLeft size={18} /> Back to studio</button><span>{busy ? `Photo ${pose} of ${count}` : `${count} ${count === 1 ? 'photo' : 'photos'} · five frames per pose`}</span></div>
    <div className="camera-view"><video ref={video} playsInline muted aria-label="Live mirrored camera preview" /><div className="viewfinder" aria-hidden="true" />{countdown !== null && <span className="countdown" aria-live="assertive">{countdown}</span>}{!ready && !error && <p className="camera-hint" role="status">Starting your camera…</p>}</div>
    {error && <div className="error-panel" role="alert"><p>{error}</p><button type="button" className="button button-secondary" onClick={() => void setup()}>Retry camera</button></div>}
    <div className="capture-bar"><label>Countdown <select value={delay} disabled={busy} onChange={event => setDelay(Number(event.target.value))}>{[2,3,5,10].map(n => <option key={n} value={n}>{n} seconds</option>)}</select></label><label className="checkbox-label"><input type="checkbox" checked={sound} onChange={event => setSound(event.target.checked)} /> Shutter sound</label><button type="button" className="button button-primary" disabled={!ready || busy} onClick={() => void capture()}><Camera size={20} /> {busy ? 'Capturing…' : 'Start capture'}</button>{busy && <button type="button" className="button button-secondary" onClick={() => job.current?.abort()}>Cancel capture</button>}</div>
  </section>;
}
