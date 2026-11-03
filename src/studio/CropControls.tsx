import { RotateCw, FlipHorizontal, Undo2 } from 'lucide-react';
import { defaultCrop, type PhotoCrop } from './crop';
export function CropControls({ value, onChange }: { value: PhotoCrop; onChange: (crop: PhotoCrop) => void }) {
  return <fieldset className="crop-controls"><legend>Crop & align this photo</legend>
    <label>Zoom <output>{value.zoom.toFixed(2)}×</output><input type="range" min="1" max="3" step="0.01" value={value.zoom} onChange={event => onChange({ ...value, zoom: Number(event.target.value) })} /></label>
    <label>Horizontal position <input type="range" min="-1" max="1" step="0.01" value={value.x} onChange={event => onChange({ ...value, x: Number(event.target.value) })} /></label>
    <label>Vertical position <input type="range" min="-1" max="1" step="0.01" value={value.y} onChange={event => onChange({ ...value, y: Number(event.target.value) })} /></label>
    <div className="button-row"><button type="button" className="button button-secondary" onClick={() => onChange({ ...value, rotation: ((value.rotation + 90) % 360) as PhotoCrop['rotation'] })}><RotateCw size={16} /> Rotate</button><button type="button" className="button button-secondary" aria-pressed={value.flip} onClick={() => onChange({ ...value, flip: !value.flip })}><FlipHorizontal size={16} /> Mirror</button><button type="button" className="button button-quiet" onClick={() => onChange(defaultCrop())}><Undo2 size={16} /> Reset crop</button></div>
    <p className="quiet-copy">Arrow keys adjust the sliders. Edits apply only to the selected photo.</p>
  </fieldset>;
}
