export type ShareFormat = 'jpg' | 'png' | 'gif';
export type ShareTtlHours = 1 | 24 | 168 | null;
export type CaptionMood = 'nostalgic' | 'playful' | 'romantic' | 'minimal';
export interface ShareData { id?: string; imageUrl: string; layout: string; format?: ShareFormat; caption?: string; createdAt: unknown; expiresAt?: string | null; isExpired?: boolean }
export interface CreateSharePayload { imageUrl: string; layout: string; format: ShareFormat; caption?: string; ttlHours?: ShareTtlHours }
export interface CaptionResult { caption: string; dateStamp: string; mood: CaptionMood; source: 'gemini' | 'curated'; offlineFallback?: boolean }
export interface CreatedShare { id: string; expiresAt?: string | null; ownerToken: string }
export class ApiError extends Error {
  status: number; requestId: string | undefined; errors: { field: string; message: string }[];
  constructor(status: number, message: string, requestId?: string, errors: { field: string; message: string }[] = []) { super(message); this.status = status; this.requestId = requestId; this.errors = errors; }
}
const base = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim().replace(/\/+$/, '') ?? '';
function endpoint(path: string) {
  if (base && !base.startsWith('/')) {
    const url = new URL(base);
    if (url.username || url.password || url.search || url.hash || !['http:', 'https:'].includes(url.protocol) || (url.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) throw new ApiError(503, 'Cloud sharing is not configured securely. You can still download your photos.');
  }
  if (base.startsWith('//')) throw new ApiError(503, 'Invalid cloud sharing configuration.');
  return `${base}${path}`;
}
let cached: { token: string; expiresAt: string } | null = null;
let pending: Promise<string> | null = null;
try { const raw: unknown = JSON.parse(sessionStorage.getItem('sol_session_v2') ?? 'null'); if (raw && typeof raw === 'object' && 'token' in raw && typeof raw.token === 'string' && 'expiresAt' in raw && typeof raw.expiresAt === 'string') cached = { token: raw.token, expiresAt: raw.expiresAt }; } catch { /* Storage is optional. */ }
async function request(path: string, init: RequestInit = {}, signal?: AbortSignal): Promise<unknown> {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 12000);
  const abort = () => controller.abort(); signal?.addEventListener('abort', abort, { once: true }); if (signal?.aborted) controller.abort();
  try {
    const response = await fetch(endpoint(path), { ...init, headers: { Accept: 'application/json, application/problem+json', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers }, signal: controller.signal });
    if (response.status === 204) return null;
    if (!response.headers.get('content-type')?.includes('json')) throw new ApiError(503, 'Cloud sharing is unavailable here. Download your photos or try again later.');
    const data = await response.json() as Record<string, unknown>;
    if (!response.ok) {
      const errors = Array.isArray(data.errors) ? data.errors.filter((e): e is { field: string; message: string } => !!e && typeof e.field === 'string' && typeof e.message === 'string') : [];
      throw new ApiError(response.status, typeof data.detail === 'string' ? data.detail : `Request failed (${response.status}).`, typeof data.request_id === 'string' ? data.request_id : response.headers.get('x-request-id') ?? undefined, errors);
    }
    return data;
  } catch (error) {
    if (signal?.aborted) throw new DOMException('Request cancelled.', 'AbortError');
    if (error instanceof ApiError) throw error;
    throw new ApiError(503, controller.signal.aborted ? 'The request timed out. Your local photos are safe; please retry.' : 'Unable to connect. Your local photos are safe; check your connection and retry.');
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
}
async function token(force = false): Promise<string> {
  if (!force && cached && Date.parse(cached.expiresAt) - 30000 > Date.now()) return cached.token;
  pending ??= (async () => {
    const data = await request('/v1/sessions', { method: 'POST', headers: cached ? { Authorization: `Bearer ${cached.token}` } : {} }) as Record<string, unknown>;
    if (typeof data.token !== 'string' || !data.token.startsWith('sol_sess.') || typeof data.expiresAt !== 'string' || !Number.isFinite(Date.parse(data.expiresAt))) throw new ApiError(503, 'The server returned an invalid session. Please retry.');
    cached = { token: data.token, expiresAt: data.expiresAt };
    try { sessionStorage.setItem('sol_session_v2', JSON.stringify(cached)); } catch { /* In-memory sessions still work. */ }
    return cached.token;
  })().finally(() => { pending = null; });
  return pending;
}
export function safeImageSource(value: unknown): value is string { return typeof value === 'string' && value.length <= 810000 && /^data:image\/(jpeg|png|gif);base64,[A-Za-z0-9+/]+={0,2}$/.test(value); }
function validShare(data: unknown): data is ShareData {
  if (!data || typeof data !== 'object') return false;
  const value = data as ShareData;
  return safeImageSource(value.imageUrl) && typeof value.layout === 'string' && typeof value.createdAt === 'string' && Number.isFinite(Date.parse(value.createdAt)) && (!value.expiresAt || typeof value.expiresAt === 'string' && Number.isFinite(Date.parse(value.expiresAt))) && (!value.caption || typeof value.caption === 'string' && value.caption.length <= 240);
}
export async function createCloudShare(payload: CreateSharePayload, operationKey: string = crypto.randomUUID()): Promise<CreatedShare> {
  let auth = await token(), result: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try { result = await request('/v1/shares', { method: 'POST', headers: { Authorization: `Bearer ${auth}`, 'Idempotency-Key': operationKey }, body: JSON.stringify(payload) }); break; }
    catch (error) { if (error instanceof ApiError && error.status === 401 && attempt === 0) auth = await token(true); else throw error; }
  }
  const data = result as Record<string, unknown>;
  if (!data || !validShare(data) || typeof data.id !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(data.id) || typeof data.ownerToken !== 'string') throw new ApiError(503, 'The server returned an invalid share. Please retry with the same photos.');
  return { id: data.id, ownerToken: data.ownerToken, expiresAt: typeof data.expiresAt === 'string' ? data.expiresAt : null };
}
export async function fetchCloudShare(id: string, signal?: AbortSignal): Promise<ShareData | null> {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(id)) throw new ApiError(400, 'This share reference is invalid.');
  try { const data = await request(`/v1/shares/${id}`, {}, signal); if (!validShare(data)) throw new ApiError(503, 'This shared photo could not be validated.'); return data; }
  catch (error) { if (error instanceof ApiError && error.status === 404) return null; if (error instanceof ApiError && error.status === 410) return { id, imageUrl: '', layout: '', createdAt: null, isExpired: true }; throw error; }
}
export async function deleteCloudShare(id: string, owner: string): Promise<void> { await request(`/v1/shares/${encodeURIComponent(id)}`, { method: 'DELETE', headers: { 'X-Owner-Token': owner } }); }
export function sharePageUrl(id: string): string { return `${window.location.origin}/share?id=${encodeURIComponent(id)}`; }
export function socialShareUrl(id: string): string { return new URL(endpoint(`/v1/shares/${encodeURIComponent(id)}/og`), window.location.origin).href; }
export async function generateRetroCaption(mood: CaptionMood, layout = '1x4'): Promise<CaptionResult> {
  try { const data = await request('/v1/shares/caption', { method: 'POST', body: JSON.stringify({ mood, layout }) }) as CaptionResult; if (typeof data.caption !== 'string' || data.caption.length > 240 || !['gemini', 'curated'].includes(data.source)) throw new Error('Invalid caption'); return data; }
  catch { return { caption: { nostalgic: 'A little moment, kept forever.', playful: 'Caught in the middle of a good day.', romantic: 'My favorite place is next to you.', minimal: 'HERE. TOGETHER.' }[mood], dateStamp: new Date().toISOString().slice(0, 10), mood, source: 'curated', offlineFallback: true }; }
}
