"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import type { ActionResult } from "@/lib/actions";

export async function toggleBookmark(mangaId: string): Promise<ActionResult<{ bookmarked: boolean }>> {
  const session = await auth();
  if (!session) return { ok: false, error: "Please sign in to bookmark." };

  try {
    const existing = await prisma.bookmark.findUnique({
      where: { userId_mangaId: { userId: session.user.id, mangaId } },
      select: { id: true },
    });
    if (existing) {
      await prisma.bookmark.delete({ where: { id: existing.id } });
      revalidatePath("/library");
      return { ok: true, data: { bookmarked: false } };
    }
    await prisma.bookmark.create({ data: { userId: session.user.id, mangaId } });
    revalidatePath("/library");
    return { ok: true, data: { bookmarked: true } };
  } catch (e) {
    console.error("[BOOKMARK] toggle failed:", e);
    return { ok: false, error: "Could not update bookmark." };
  }
}
