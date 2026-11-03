import { validCrop, type PhotoCrop } from './crop.ts';
import type { StudioPhoto } from './images.ts';
import type { FilterType, LensEffectType } from '../lib/renderUtils.ts';
export interface StudioProject {
  photos: StudioPhoto[];
  layoutId: string;
  themeId: string;
  filterId: FilterType;
  lens: LensEffectType;
  grain: number;
  showDate: boolean;
  caption: string;
  frames: number[];
  crops: PhotoCrop[];
}
export interface DraftRecord { version: 1; savedAt: number; project: StudioProject }
export const DRAFT_RETENTION_MS = 7 * 86400000;
export function emptyProject(): StudioProject { return { photos: [], layoutId: '1x4', themeId: 'alabaster', filterId: 'none', lens: 'none', grain: 12, showDate: true, caption: '', frames: [], crops: [] }; }
export function parseDraft(value: unknown, now = Date.now()): DraftRecord {
  if (!value || typeof value !== 'object') throw new Error('Draft is damaged.');
  const record = value as DraftRecord, project = record.project;
  if (record.version !== 1 || !Number.isFinite(record.savedAt) || record.savedAt > now + 86400000 || !project || typeof project !== 'object') throw new Error('This draft version cannot be restored.');
  if (!Array.isArray(project.photos) || project.photos.length > 8 || !Array.isArray(project.frames) || project.frames.some(x => !Number.isInteger(x) || x < 0 || x > 4)) throw new Error('Draft photos are damaged.');
  project.crops ??= [];
  if (!Array.isArray(project.crops) || project.crops.length > 8 || !project.crops.every(validCrop)) throw new Error('Draft crop settings are damaged.');
  let bytes = 0;
  for (const photo of project.photos) {
    if (!photo || typeof photo.id !== 'string' || photo.id.length > 100 || typeof photo.name !== 'string' || photo.name.length > 100 || !Array.isArray(photo.frames) || photo.frames.length < 1 || photo.frames.length > 5) throw new Error('Draft photos are damaged.');
    for (const frame of photo.frames) { if (typeof frame !== 'string' || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(frame) || frame.length > 3_000_000) throw new Error('Draft contains an invalid photo.'); bytes += frame.length; }
  }
  if (bytes > 24_000_000) throw new Error('This session is too large for local draft recovery.');
  if (typeof project.layoutId !== 'string' || project.layoutId.length > 100 || !['alabaster', 'obsidian', 'blossom', 'parchment', 'cyber'].includes(project.themeId) || !['none', 'mono', 'vintage', 'cyber'].includes(project.filterId) || !['none', 'fisheye', 'toycam', 'filmburn'].includes(project.lens) || !Number.isFinite(project.grain) || project.grain < 0 || project.grain > 100 || typeof project.showDate !== 'boolean' || typeof project.caption !== 'string' || project.caption.length > 240) throw new Error('Draft settings are damaged.');
  return structuredClone(record);
}
