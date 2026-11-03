import type { useDraft } from './useDraft';
type DraftState = ReturnType<typeof useDraft>;
export function DraftBar({ draft }: { draft: DraftState }) {
  return <section className="draft-bar" aria-label="Local draft recovery">
    {draft.pending ? <div className="restore-banner">
      <div><strong>Welcome back. Your photos are still here.</strong><p>A local draft from {new Date(draft.pending.savedAt).toLocaleString()} is available on this device.</p></div>
      <div className="button-row"><button type="button" className="button button-primary" onClick={draft.resume}>Restore session</button><button type="button" className="button button-quiet" onClick={() => void draft.discard(false)}>Discard old draft</button></div>
    </div> : <div className="draft-status"><label><input type="checkbox" checked={draft.enabled} onChange={event => { if (event.target.checked) draft.setEnabled(true); else void draft.discard(); }} /> Recover my session on this device</label><button type="button" className="text-button" onClick={() => void draft.discard()}>Clear local draft</button></div>}
    <p role="status">{draft.status}</p>
    {draft.error && <p role="alert" className="error-text">{draft.error} <button type="button" className="text-button" onClick={() => void draft.discard()}>Clear unreadable draft</button></p>}
  </section>;
}
