"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-guards";
import type { ActionResult } from "@/lib/actions";
import { offlineLimitFor, type OfflineManga } from "@/lib/offline-types";
import { signPages, OFFLINE_TTL_SECONDS } from "@/lib/image-urls";

export type OfflineUsage = { tier: string; limit: number | null; used: number; allowed: boolean };

/** Current user's offline-save tier, limit, and usage — drives the OfflineButton UI. */
export async function getOfflineUsage(): Promise<OfflineUsage | null> {
  const session = await requireUser();
  if (!session) return null;
  const [user, used] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id }, select: { tier: true, tierUntil: true } }),
    prisma.offlineSave.count({ where: { userId: session.user.id } }),
  ]);
  if (!user) return null;
  const tier = user.tierUntil && user.tierUntil <= new Date() ? "FREE" : user.tier;
  const limit = offlineLimitFor(tier);
  return { tier, limit, used, allowed: limit === null || limit > 0 };
}

/** Titles the user has saved offline — shown on /library so they can jump to /offline. */
export async function listOfflineSaves(): Promise<{ mangaId: string; slug: string; title: string; coverUrl: string | null }[]> {
  const session = await requireUser();
  if (!session) return [];
  const rows = await prisma.offlineSave.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: { manga: { select: { id: true, slug: true, title: true, coverUrl: true } } },
  });
  return rows.map((r) => ({ mangaId: r.manga.id, slug: r.manga.slug, title: r.manga.title, coverUrl: r.manga.coverUrl }));
}

/**
 * Record a title as saved-offline (server-side source of truth for the
 * Premium 50-title / VIP unlimited cap) and return everything the client
 * needs to cache it: chapter/page metadata for localStorage, and the full
 * list of image URLs for the Service Worker to fetch into Cache Storage.
 */
export async function saveOffline(mangaId: string): Promise<ActionResult<{ manga: OfflineManga; imageUrls: string[] }>> {
  const session = await requireUser();
  if (!session) return { ok: false, error: "Please sign in." };

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { tier: true, tierUntil: true } });
  if (!user) return { ok: false, error: "Please sign in." };
  const limit = offlineLimitFor(user.tierUntil && user.tierUntil <= new Date() ? "FREE" : user.tier);
  if (limit === 0) return { ok: false, error: "Offline reading is a Premium/VIP perk. Upgrade to save titles offline." };

  const existing = await prisma.offlineSave.findUnique({
    where: { userId_mangaId: { userId: session.user.id, mangaId } },
    select: { id: true },
  });
  if (!existing && limit !== null) {
    const used = await prisma.offlineSave.count({ where: { userId: session.user.id } });
    if (used >= limit) {
      return { ok: false, error: `Offline limit reached (${limit}). Remove a title or upgrade to VIP for unlimited offline titles.` };
    }
  }

  const manga = await prisma.manga.findFirst({
    where: { id: mangaId, published: true },
    select: {
      id: true,
      slug: true,
      title: true,
      coverUrl: true,
      chapters: {
        where: { publishedAt: { not: null, lte: new Date() } },
        orderBy: { number: "asc" },
        select: {
          id: true,
          number: true,
          title: true,
          pages: { orderBy: { index: "asc" }, select: { id: true, imageUrl: true, width: true, height: true } },
        },
      },
    },
  });
  if (!manga) return { ok: false, error: "Title not found." };

  try {
    await prisma.offlineSave.upsert({
      where: { userId_mangaId: { userId: session.user.id, mangaId } },
      update: {},
      create: { userId: session.user.id, mangaId },
    });
  } catch (e) {
    console.error("[OFFLINE] save failed:", e);
    return { ok: false, error: "Could not save this title offline." };
  }

  const offlineManga: OfflineManga = {
    id: manga.id,
    slug: manga.slug,
    title: manga.title,
    coverUrl: manga.coverUrl,
    savedAt: Date.now(),
    chapters: await Promise.all(
      manga.chapters.map(async (c) => ({
        id: c.id,
        number: c.number.toString(),
        title: c.title,
        // Signed with extra headroom (OFFLINE_TTL_SECONDS) so the Service
        // Worker has time to fetch every page into Cache Storage — once
        // cached, the bytes are served offline regardless of the token
        // expiring later, since cache lookups never re-validate against us.
        pages: await signPages(c.pages, OFFLINE_TTL_SECONDS),
      })),
    ),
  };
  const imageUrls = [
    ...(manga.coverUrl ? [manga.coverUrl] : []),
    ...offlineManga.chapters.flatMap((c) => c.pages.map((p) => p.imageUrl)),
  ];

  return { ok: true, data: { manga: offlineManga, imageUrls } };
}

/** Remove a title from offline saves. Returns the image URLs so the client can evict them from Cache Storage. */
export async function removeOffline(mangaId: string): Promise<ActionResult> {
  const session = await requireUser();
  if (!session) return { ok: false, error: "Please sign in." };
  try {
    await prisma.offlineSave.deleteMany({ where: { userId: session.user.id, mangaId } });
    return { ok: true };
  } catch (e) {
    console.error("[OFFLINE] remove failed:", e);
    return { ok: false, error: "Could not remove this title." };
  }
}
