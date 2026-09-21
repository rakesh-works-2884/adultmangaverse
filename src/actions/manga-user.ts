"use server";

import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { getOfflineUsage, type OfflineUsage } from "@/actions/offline";

export type MangaActionsState = {
  isBookmarked: boolean;
  continueChapter: string | null;
  offlineUsage: OfflineUsage | null;
};

const EMPTY_ACTIONS_STATE: MangaActionsState = { isBookmarked: false, continueChapter: null, offlineUsage: null };

/**
 * Everything the manga-detail "actions row" (continue reading / bookmark /
 * offline save) needs for the current session, fetched client-side after the
 * page mounts instead of server-rendered — see MangaActionsPanel. This is
 * what lets the manga detail page itself be cached/ISR'd: none of its own
 * render depends on auth() anymore.
 */
export async function getMangaActionsState(mangaId: string): Promise<MangaActionsState> {
  const session = await requireUser();
  if (!session) return EMPTY_ACTIONS_STATE;

  const [prog, bm, offlineUsage] = await Promise.all([
    prisma.readProgress.findUnique({
      where: { userId_mangaId: { userId: session.user.id, mangaId } },
      select: { chapter: { select: { number: true } } },
    }),
    prisma.bookmark.findUnique({ where: { userId_mangaId: { userId: session.user.id, mangaId } }, select: { id: true } }),
    getOfflineUsage(),
  ]);

  return {
    isBookmarked: !!bm,
    continueChapter: prog ? prog.chapter.number.toString() : null,
    offlineUsage,
  };
}

/** The current user's existing review for this manga, if any — see ReviewForm's self-fetch. */
export async function getMyReview(mangaId: string): Promise<{ rating: number; body: string } | null> {
  const session = await requireUser();
  if (!session) return null;
  return prisma.review.findUnique({
    where: { mangaId_userId: { mangaId, userId: session.user.id } },
    select: { rating: true, body: true },
  });
}
