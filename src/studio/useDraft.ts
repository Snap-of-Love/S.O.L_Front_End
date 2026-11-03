import { useCallback, useEffect, useRef, useState } from 'react';
import { clearDraft, loadDraft, saveDraft } from './storage';
import type { DraftRecord, StudioProject } from './project';

export function useDraft(project: StudioProject, onRestore: (project: StudioProject) => void) {
  const restore = useRef(onRestore); restore.current = onRestore;
  const [pending, setPending] = useState<DraftRecord | null>(null), [ready, setReady] = useState(false);
  const [enabled, setEnabled] = useState(() => { try { return localStorage.getItem('sol_drafts_enabled') !== 'false'; } catch { return true; } });
  const [status, setStatus] = useState('Checking for a local draft…'), [error, setError] = useState('');
  const latest = useRef(project); latest.current = project;
  const enabledRef = useRef(false); enabledRef.current = enabled && ready;
  useEffect(() => {
    let active = true;
    void loadDraft().then(record => { if (!active) return; setPending(record); setReady(!record); setStatus(record ? 'A previous session is ready to restore.' : 'Drafts stay on this device for 7 days.'); }).catch(reason => { if (active) { setReady(true); setEnabled(false); setError(reason instanceof Error ? reason.message : 'Unable to read a draft.'); setStatus('Draft recovery is unavailable. You can still edit and download.'); } });
    return () => { active = false; };
  }, []);
  useEffect(() => { try { localStorage.setItem('sol_drafts_enabled', String(enabled)); } catch { /* Storage failure is reported by the IndexedDB operation. */ } }, [enabled]);
  useEffect(() => {
    if (!enabled || !ready || !project.photos.length) return;
    let active = true;
    const timer = setTimeout(() => { setStatus('Saving draft on this device…'); void saveDraft(project).then(() => { if (active) { setStatus('Draft saved on this device.'); setError(''); } }).catch(reason => { if (active) { setError(reason instanceof Error ? reason.message : 'Draft could not be saved.'); setStatus('Download your work before leaving.'); } }); }, 700);
    return () => { active = false; clearTimeout(timer); };
  }, [project, enabled, ready]);
  useEffect(() => {
    const flush = () => { if (enabledRef.current && latest.current.photos.length) void saveDraft(latest.current).catch(() => {}); };
    const hidden = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush); document.addEventListener('visibilitychange', hidden);
    return () => { window.removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', hidden); };
  }, []);
  const resume = () => { if (pending) { restore.current(pending.project); setPending(null); setReady(true); setError(''); setStatus('Draft restored.'); } };
  const discard = useCallback(async (disable = true) => {
    if (disable) { enabledRef.current = false; setEnabled(false); }
    try { await clearDraft(); setPending(null); setReady(true); setError(''); if (disable) setEnabled(false); setStatus('Local draft cleared.'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Draft could not be cleared.'); }
  }, []);
  return { pending, ready, enabled, setEnabled, status, error, resume, discard };
}
