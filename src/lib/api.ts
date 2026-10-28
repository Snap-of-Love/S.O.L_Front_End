/**
 * Decoupled API client for communicating with the standalone `S.O.L_Back_End` service.
 * Configures base URL, authentication headers (`Authorization` / `X-API-Key`),
 * and RFC 7807 Problem Details error handling.
 */

import { doc, getDoc, setDoc, collection } from 'firebase/firestore';
import { db } from './firebase';

export type ShareFormat = 'jpg' | 'png' | 'gif';

export interface ShareData {
  readonly id?: string;
  readonly imageUrl: string;
  readonly layout: string;
  readonly format?: ShareFormat;
  readonly createdAt: unknown;
}

export interface CreateSharePayload {
  readonly imageUrl: string;
  readonly layout: string;
  readonly format: ShareFormat;
}

const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, '') ?? '';
const API_KEY: string =
  (import.meta.env.VITE_API_KEY as string | undefined)?.trim() ?? '';

function buildHeaders(hasBody: boolean): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json, application/problem+json',
  };
  if (hasBody) {
    headers['Content-Type'] = 'application/json';
  }
  if (API_KEY.length > 0) {
    headers['Authorization'] = `Bearer ${API_KEY}`;
    headers['X-API-Key'] = API_KEY;
  }
  return headers;
}

/**
 * Uploads a composited photo strip or animated GIF to the decoupled backend (`/v1/shares`).
 * Falls back to direct Firestore persistence only if `VITE_API_BASE_URL` is not configured.
 *
 * @param {CreateSharePayload} payload - Image data URI, layout ID, and export format
 * @returns {Promise<{ id: string }>} Created share document identifier
 */
export async function createCloudShare(
  payload: CreateSharePayload
): Promise<{ readonly id: string }> {
  if (API_BASE_URL.length > 0) {
    const response = await fetch(`${API_BASE_URL}/v1/shares`, {
      method: 'POST',
      headers: buildHeaders(true),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Backend share creation failed with HTTP ${response.status}`);
    }

    const created = (await response.json()) as { id: string };
    return { id: created.id };
  }

  // Fallback when standalone backend URL is not configured
  const shareDocRef = doc(collection(db, 'shares'));
  await setDoc(shareDocRef, {
    imageUrl: payload.imageUrl,
    layout: payload.layout,
    format: payload.format,
    createdAt: new Date(),
  });
  return { id: shareDocRef.id };
}

/**
 * Fetches a shared photo strip or GIF by ID from the decoupled backend (`/v1/shares/:id`).
 *
 * @param {string} id - Unique share identifier
 * @returns {Promise<ShareData | null>} Share record or `null` if not found
 */
export async function fetchCloudShare(id: string): Promise<ShareData | null> {
  if (API_BASE_URL.length > 0) {
    const response = await fetch(
      `${API_BASE_URL}/v1/shares/${encodeURIComponent(id)}`,
      {
        method: 'GET',
        headers: buildHeaders(false),
      }
    );

    if (response.status === 404) {
      return null;
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
  return docSnap.data() as ShareData;
}

