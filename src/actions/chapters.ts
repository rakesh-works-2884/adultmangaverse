"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth-guards";
import { chapterSchema } from "@/lib/validators";
import { storage } from "@/lib/storage";
import { isUniqueViolation, type ActionResult } from "@/lib/actions";

export type ChapterFormData = {
  number: number;
  title?: string;
  isPremium: boolean;
  publishedAt: string | null; // datetime-local / ISO string, or null for draft
};

function parsePublishedAt(value: string | null): Date | null | { error: string } {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return { error: "Invalid publish date." };
  return d;
}

async function revalidateChapters(mangaId: string) {
  const manga = await prisma.manga.findUnique({ where: { id: mangaId }, select: { slug: true } });
  revalidatePath(`/admin/manga/${mangaId}/chapters`);
  revalidatePath("/admin/manga");
  if (manga) revalidatePath(`/manga/${manga.slug}`);
}

export async function createChapter(mangaId: string, input: ChapterFormData): Promise<ActionResult<{ id: string }>> {
  // Chapters are editable by MOD too (Architecture §6).
  if (!(await requireStaff())) return { ok: false, error: "Not authorized." };

  const parsed = chapterSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const publishedAt = parsePublishedAt(input.publishedAt);
  if (publishedAt && "error" in publishedAt) return { ok: false, error: publishedAt.error };

  try {
    const chapter = await prisma.chapter.create({
      data: {
        mangaId,
        number: parsed.data.number,
        title: parsed.data.title || null,
        isPremium: parsed.data.isPremium,
        publishedAt,
      },
    });
    await revalidateChapters(mangaId);
    return { ok: true, data: { id: chapter.id } };
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, error: "A chapter with this number already exists." };
    console.error("[CHAPTER] create failed:", e);
    return { ok: false, error: "Could not create chapter." };
  }
}

export async function updateChapter(id: string, input: ChapterFormData): Promise<ActionResult> {
  if (!(await requireStaff())) return { ok: false, error: "Not authorized." };

  const parsed = chapterSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const publishedAt = parsePublishedAt(input.publishedAt);
  if (publishedAt && "error" in publishedAt) return { ok: false, error: publishedAt.error };

  try {
    const chapter = await prisma.chapter.update({
      where: { id },
      data: {
        number: parsed.data.number,
        title: parsed.data.title || null,
        isPremium: parsed.data.isPremium,
        publishedAt,
      },
    });
    await revalidateChapters(chapter.mangaId);
    return { ok: true };
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, error: "A chapter with this number already exists." };
    console.error("[CHAPTER] update failed:", e);
    return { ok: false, error: "Could not update chapter." };
  }
}

export async function deleteChapter(id: string): Promise<ActionResult> {
  if (!(await requireStaff())) return { ok: false, error: "Not authorized." };

  try {
    const chapter = await prisma.chapter.findUnique({
      where: { id },
      include: { pages: { select: { imageUrl: true } } },
    });
    if (!chapter) return { ok: false, error: "Chapter not found." };

    await prisma.chapter.delete({ where: { id } });

    // Best-effort removal of the page image files.
    for (const p of chapter.pages) {
      await storage.remove(p.imageUrl, "protected");
    }

    await revalidateChapters(chapter.mangaId);
    return { ok: true };
  } catch (e) {
    console.error("[CHAPTER] delete failed:", e);
    return { ok: false, error: "Could not delete chapter." };
  }
}
