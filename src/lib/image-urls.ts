import "server-only";
import { storage } from "@/lib/storage";

// Chapter page images are "protected" storage (see storage.ts) — the DB only
// ever holds a bare key, never a browsable URL. Every render signs a fresh,
// short-lived URL here. Covers stay public and are used straight from the DB.

export const READER_TTL_SECONDS = 30 * 60; // one reading session's worth
export const OFFLINE_TTL_SECONDS = 60 * 60; // headroom for the Service Worker to finish fetching every page

export async function signPageUrl(key: string, ttlSeconds = READER_TTL_SECONDS): Promise<string> {
  return storage.getSignedUrl(key, ttlSeconds);
}

/** Maps `imageUrl` (a storage key) on every item to a fresh signed URL, keeping all other fields. */
export async function signPages<T extends { imageUrl: string }>(pages: T[], ttlSeconds = READER_TTL_SECONDS): Promise<T[]> {
  return Promise.all(pages.map(async (p) => ({ ...p, imageUrl: await signPageUrl(p.imageUrl, ttlSeconds) })));
}
