"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import type { ActionResult } from "@/lib/actions";
import { signPages } from "@/lib/image-urls";

/**
 * Signed page image URLs, fetched client-side by ReaderView after the shell
 * mounts rather than embedded in the page's own render. This is what lets
 * the chapter page itself be ISR-cached (see manga/[slug]/[chapter]/page.tsx)
 * — a signed URL baked into cached HTML would go stale for whoever hits that
 * cache after the URL's TTL, so signing has to happen per-visit instead.
 * Re-validates the chapter is currently published even if the cached shell
 * around it is stale, so unpublishing a chapter still cuts off new access
 * to its pages immediately.
 */
export async function getChapterPages(chapterId: string): Promise<{ id: string; imageUrl: string; width: number; height: number }[]> {
  const chapter = await prisma.chapter.findFirst({
    where: { id: chapterId, publishedAt: { not: null, lte: new Date() }, manga: { published: true } },
    select: { id: true },
  });
  if (!chapter) return [];

  const rawPages = await prisma.page.findMany({
    where: { chapterId },
    orderBy: { index: "asc" },
    select: { id: true, imageUrl: true, width: true, height: true },
  });
  return signPages(rawPages);
}

/** Fire-and-forget view increments (client calls once per session). */
export async function recordMangaView(mangaId: string): Promise<void> {
  try {
    await prisma.manga.update({ where: { id: mangaId }, data: { views: { increment: 1 } } });
  } catch {
    /* non-critical */
  }
}

export async function recordChapterView(chapterId: string): Promise<void> {
  try {
    await prisma.chapter.update({ where: { id: chapterId }, data: { views: { increment: 1 } } });
  } catch {
    /* non-critical */
  }
}

/** Save reading progress for logged-in users. Guests persist to localStorage client-side. */
export async function saveProgress(mangaId: string, chapterId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { ok: false, error: "Not logged in." };
  try {
    await prisma.readProgress.upsert({
      where: { userId_mangaId: { userId: session.user.id, mangaId } },
      update: { chapterId },
      create: { userId: session.user.id, mangaId, chapterId },
    });
    return { ok: true };
  } catch (e) {
    console.error("[READ] save progress failed:", e);
    return { ok: false, error: "Could not save progress." };
  }
}
