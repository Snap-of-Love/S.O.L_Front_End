/**
 * Decoupled API client for communicating with the standalone `S.O.L_Back_End` service.
 * Supports ephemeral HMAC-SHA256 session tokens (`POST /v1/sessions`), `Idempotency-Key`
 * deduplication, AI retro captions (`POST /v1/shares/caption`), configurable share TTLs
 * (`FEAT-05`), and RFC 7807 Problem Details error handling.
 */

import { doc, getDoc, setDoc, collection } from 'firebase/firestore';
import { db } from './firebase';

export type ShareFormat = 'jpg' | 'png' | 'gif';
export type ShareTtlHours = 1 | 24 | 168 | null;
export type CaptionMood = 'nostalgic' | 'playful' | 'romantic' | 'minimal';

export interface ShareData {
  readonly id?: string;
  readonly imageUrl: string;
  readonly layout: string;
  readonly format?: ShareFormat;
  readonly caption?: string;
  readonly createdAt: unknown;
  readonly expiresAt?: string | null;
  readonly isExpired?: boolean;
}

export interface CreateSharePayload {
  readonly imageUrl: string;
  readonly layout: string;
  readonly format: ShareFormat;
  readonly caption?: string;
  readonly ttlHours?: ShareTtlHours;
}

export interface CaptionResult {
  readonly caption: string;
  readonly dateStamp: string;
  readonly mood: CaptionMood;
  readonly source: 'gemini' | 'curated';
}

const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, '') ?? '';
const API_KEY: string =
  (import.meta.env.VITE_API_KEY as string | undefined)?.trim() ?? '';

let cachedSessionToken: { token: string; expiresAtMs: number } | null = null;

const LOCAL_CURATED_CAPTIONS: Record<CaptionMood, readonly string[]> = {
  nostalgic: [
    'Golden hour on 35mm — held in amber forever.',
    'Silver halide memories from a slower afternoon.',
    'Four frames of yesterday, still warm in our hands.',
  ],
  playful: [
    'Caught mid-laugh before the flash went off!',
    'Too cool for one frame, needed all four.',
    'No retakes, pure analog mischief.',
  ],
  romantic: [
    'Every frame with you feels like my favorite film.',
    'Two hearts, one booth, four little eternities.',
    'Soft focus on the world, sharp focus on us.',
  ],
  minimal: [
    'S.O.L // STUDIO ARCHIVE',
    '35MM — STILL FRAME',
    'QUIET LIGHT // NO. 04',
  ],
};
let localCaptionCursor = 0;

/**
 * Obtains or reuses a short-lived HMAC-SHA256 bearer session token (`POST /v1/sessions`, `BE-01`).
 *
 * @returns {Promise<string | null>} Bearer token or null if unavailable
 */
async function resolveAuthToken(): Promise<string | null> {
  if (API_KEY.length > 0) {
    return API_KEY;
  }
  if (API_BASE_URL.length === 0) {
    return null;
  }
  if (cachedSessionToken && cachedSessionToken.expiresAtMs - 30_000 > Date.now()) {
    return cachedSessionToken.token;
  }
  try {
    const res = await fetch(`${API_BASE_URL}/v1/sessions`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = (await res.json()) as { token?: string; expiresAt?: string };
      if (data.token && data.expiresAt) {
        cachedSessionToken = {
          token: data.token,
          expiresAtMs: Date.parse(data.expiresAt),
        };
        return data.token;
      }
    }
  } catch {
    // Proceed without session token if backend does not require auth in local dev
  }
  return null;
}

/**
 * Builds standard HTTP headers with optional authentication and `Idempotency-Key`.
 *
 * @param {boolean} hasBody - Whether the request includes a JSON body
 * @param {string | null} token - Optional bearer/API token
 * @param {string} [idempotencyKey] - Optional `Idempotency-Key` for safe retries
 * @returns {Record<string, string>} Request headers map
 */
function buildHeaders(
  hasBody: boolean,
  token: string | null,
  idempotencyKey?: string
): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json, application/problem+json',
  };
  if (hasBody) {
    headers['Content-Type'] = 'application/json';
  }
  if (token && token.length > 0) {
    headers['Authorization'] = `Bearer ${token}`;
    if (!token.startsWith('sol_sess.')) {
      headers['X-API-Key'] = token;
    }
  }
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }
  return headers;
}

/**
 * Uploads a composited photo strip or animated GIF to the decoupled backend (`/v1/shares`).
 * Falls back to direct Firestore persistence only if `VITE_API_BASE_URL` is not configured.
 *
 * @param {CreateSharePayload} payload - Image data URI, layout ID, export format, caption, and TTL
 * @returns {Promise<{ id: string; expiresAt?: string | null }>} Created share document identifier
 */
export async function createCloudShare(
  payload: CreateSharePayload
): Promise<{ readonly id: string; readonly expiresAt?: string | null }> {
  const expiresAtIso =
    typeof payload.ttlHours === 'number' && payload.ttlHours > 0
      ? new Date(Date.now() + payload.ttlHours * 3_600_000).toISOString()
      : null;

  if (API_BASE_URL.length > 0) {
    const token = await resolveAuthToken();
    const idempotencyKey = `sol_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const response = await fetch(`${API_BASE_URL}/v1/shares`, {
      method: 'POST',
      headers: buildHeaders(true, token, idempotencyKey),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Backend share creation failed with HTTP ${response.status}`);
    }

    const created = (await response.json()) as { id: string; expiresAt?: string | null };
    return { id: created.id, expiresAt: created.expiresAt ?? expiresAtIso };
  }

  // Fallback when standalone backend URL is not configured
  const shareDocRef = doc(collection(db, 'shares'));
  await setDoc(shareDocRef, {
    imageUrl: payload.imageUrl,
    layout: payload.layout,
    format: payload.format,
    ...(payload.caption ? { caption: payload.caption } : {}),
    ...(expiresAtIso ? { expiresAt: expiresAtIso } : {}),
    createdAt: new Date(),
  });
  return { id: shareDocRef.id, expiresAt: expiresAtIso };
}

/**
 * Fetches a shared photo strip or GIF by ID from the decoupled backend (`/v1/shares/:id`).
 *
 * @param {string} id - Unique share identifier
 * @returns {Promise<ShareData | null>} Share record (with `isExpired: true` if 410 Gone) or `null` if not found
 */
export async function fetchCloudShare(id: string): Promise<ShareData | null> {
  if (API_BASE_URL.length > 0) {
    const response = await fetch(
      `${API_BASE_URL}/v1/shares/${encodeURIComponent(id)}`,
      {
        method: 'GET',
        headers: buildHeaders(false, null),
      }
    );

    if (response.status === 404) {
      return null;
    }

    if (response.status === 410) {
      return {
        id,
        imageUrl: '',
        layout: '1x4',
        createdAt: null,
        isExpired: true,
      };
    }

    if (!response.ok) {
      throw new Error(`Backend share lookup failed with HTTP ${response.status}`);
    }

    return (await response.json()) as ShareData;
  }

  const docRef = doc(db, 'shares', id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    return null;
  }
  const raw = docSnap.data() as ShareData;
  if (raw.expiresAt && Date.parse(raw.expiresAt) <= Date.now()) {
    return {
      ...raw,
      isExpired: true,
    };
  }
  return raw;
}

/**
 * Generates an AI or curated retro photobooth strip caption (`POST /v1/shares/caption`, `FEAT-01`).
 *
 * @param {CaptionMood} mood - Emotional tone (`'nostalgic' | 'playful' | 'romantic' | 'minimal'`)
 * @param {string} [layout='1x4'] - Active strip layout ID
 * @returns {Promise<CaptionResult>} Generated caption and date-stamp
 */
export async function generateRetroCaption(
  mood: CaptionMood,
  layout = '1x4'
): Promise<CaptionResult> {
  if (API_BASE_URL.length > 0) {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/shares/caption`, {
        method: 'POST',
        headers: buildHeaders(true, null),
        body: JSON.stringify({ mood, layout }),
      });
      if (response.ok) {
        return (await response.json()) as CaptionResult;
      }
    } catch {
      // Fall back to curated local library below
    }
  }

  const pool = LOCAL_CURATED_CAPTIONS[mood] ?? LOCAL_CURATED_CAPTIONS.nostalgic;
  const chosen = pool[localCaptionCursor % pool.length] ?? pool[0]!;
  localCaptionCursor += 1;
  const now = new Date();
  const dateStamp = `'98 ${String(now.getMonth() + 1).padStart(2, '0')} ${String(now.getDate()).padStart(2, '0')}`;

  return {
    caption: chosen,
    dateStamp,
    mood,
    source: 'curated',
  };
}
