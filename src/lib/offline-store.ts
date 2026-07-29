"use client";

import type { OfflineManga } from "@/lib/offline-types";

// Client-only offline library store. Metadata (titles, chapter/page lists,
// URLs — all small text) lives in localStorage; the actual page image bytes
// live in the Service Worker's Cache Storage (see public/sw.js). Keeping
// them separate means we never hit localStorage's ~5-10MB quota.

const INDEX_KEY = "amv_offline_index";
const MANGA_KEY = (id: string) => `amv_offline_manga_${id}`;
export const OFFLINE_CHANGE_EVENT = "amv-offline-changed";

export type OfflineIndexEntry = { id: string; slug: string; title: string; coverUrl: string | null; savedAt: number };

function notify() {
  try {
    window.dispatchEvent(new Event(OFFLINE_CHANGE_EVENT));
  } catch {
    /* ignore */
  }
}

// useSyncExternalStore requires getSnapshot to return a stable reference
// when nothing changed, or React re-renders forever. Cache the parsed array
// and only reparse when the raw localStorage string actually differs.
let cachedRaw: string | null = null;
let cachedIndex: OfflineIndexEntry[] = [];

export function getOfflineIndex(): OfflineIndexEntry[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedIndex = raw ? (JSON.parse(raw) as OfflineIndexEntry[]) : [];
    }
    return cachedIndex;
  } catch {
    return [];
  }
}

export function isSavedOffline(mangaId: string): boolean {
  return getOfflineIndex().some((e) => e.id === mangaId);
}

export function getOfflineManga(mangaId: string): OfflineManga | null {
  try {
    const raw = localStorage.getItem(MANGA_KEY(mangaId));
    return raw ? (JSON.parse(raw) as OfflineManga) : null;
  } catch {
    return null;
  }
}

export function putOfflineManga(manga: OfflineManga): void {
  try {
    localStorage.setItem(MANGA_KEY(manga.id), JSON.stringify(manga));
    const index = getOfflineIndex().filter((e) => e.id !== manga.id);
    index.unshift({ id: manga.id, slug: manga.slug, title: manga.title, coverUrl: manga.coverUrl, savedAt: manga.savedAt });
    localStorage.setItem(INDEX_KEY, JSON.stringify(index));
    notify();
  } catch (e) {
    console.error("[OFFLINE] failed to store title locally:", e);
  }
}

export function deleteOfflineManga(mangaId: string): void {
  try {
    localStorage.removeItem(MANGA_KEY(mangaId));
    const index = getOfflineIndex().filter((e) => e.id !== mangaId);
    localStorage.setItem(INDEX_KEY, JSON.stringify(index));
    notify();
  } catch (e) {
    console.error("[OFFLINE] failed to remove title locally:", e);
  }
}
