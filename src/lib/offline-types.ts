// Shared shape between the server (src/actions/offline.ts) and the client
// offline store (src/lib/offline-store.ts) — kept dependency-free so it can
// be imported from both "use server" and "use client" code.

export type OfflinePage = { id: string; imageUrl: string; width: number; height: number };

export type OfflineChapter = { id: string; number: string; title: string | null; pages: OfflinePage[] };

export type OfflineManga = {
  id: string;
  slug: string;
  title: string;
  coverUrl: string | null;
  savedAt: number;
  chapters: OfflineChapter[];
};

export const OFFLINE_LIMITS: Record<string, number | null> = {
  FREE: 0,
  PREMIUM: 50,
  VIP: null, // unlimited
};

/**
 * `OFFLINE_LIMITS[tier] ?? 0` looks right but isn't: VIP's limit is `null`
 * (unlimited), and `??` treats `null` as missing just like `undefined`,
 * silently collapsing "unlimited" down to "blocked". Use this instead —
 * it only falls back to 0 for a tier that's genuinely not in the map.
 */
export function offlineLimitFor(tier: string): number | null {
  return tier in OFFLINE_LIMITS ? OFFLINE_LIMITS[tier] : 0;
}
