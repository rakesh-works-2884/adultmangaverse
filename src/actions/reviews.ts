"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { reviewSchema } from "@/lib/validators";
import type { ActionResult } from "@/lib/actions";

async function recomputeRating(mangaId: string) {
  const agg = await prisma.review.aggregate({
    where: { mangaId },
    _avg: { rating: true },
    _count: true,
  });
  await prisma.manga.update({
    where: { id: mangaId },
    data: { rating: agg._avg.rating ?? 0, ratingCount: agg._count },
  });
}

export async function submitReview(mangaId: string, input: unknown): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { ok: false, error: "Please sign in to write a review." };

  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const manga = await prisma.manga.findUnique({ where: { id: mangaId }, select: { slug: true } });
    if (!manga) return { ok: false, error: "Manga not found." };

    await prisma.review.upsert({
      where: { mangaId_userId: { mangaId, userId: session.user.id } },
      update: { rating: parsed.data.rating, body: parsed.data.body ?? "" },
      create: { mangaId, userId: session.user.id, rating: parsed.data.rating, body: parsed.data.body ?? "" },
    });
    await recomputeRating(mangaId);
    revalidatePath(`/manga/${manga.slug}`);
    return { ok: true };
  } catch (e) {
    console.error("[REVIEW] submit failed:", e);
    return { ok: false, error: "Could not submit review." };
  }
}
