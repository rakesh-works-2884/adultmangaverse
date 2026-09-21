"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth-guards";
import { pdf } from "pdf-to-img";
import { processChapterPage, processChapterPageBuffer } from "@/lib/images";
import { storage } from "@/lib/storage";
import { signPageUrl } from "@/lib/image-urls";
import type { ActionResult } from "@/lib/actions";

export type UploadedPage = {
  id: string;
  index: number;
  imageUrl: string;
  width: number;
  height: number;
};

async function revalidateReader(chapterId: string, knownSlug?: string) {
  const chapter = knownSlug ? null : await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: { manga: { select: { slug: true } } },
  });
  revalidatePath(`/admin/chapters/${chapterId}/pages`);
  const slug = knownSlug ?? chapter?.manga.slug;
  if (slug) revalidatePath(`/manga/${slug}`, "layout");
}

/** Upload a single page image (called sequentially per file so the client can show progress). */
export async function uploadChapterPage(chapterId: string, fd: FormData): Promise<ActionResult<UploadedPage>> {
  if (!(await requireStaff())) return { ok: false, error: "Not authorized." };

  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No file provided." };
  }

  try {
    const [chapter, agg, processed] = await Promise.all([prisma.chapter.findUnique({
      where: { id: chapterId },
      select: { number: true, manga: { select: { slug: true } } },
    }), prisma.page.aggregate({ where: { chapterId }, _max: { index: true } }), processChapterPage(file)]);
    if (!chapter) return { ok: false, error: "Chapter not found." };

    const nextIndex = (agg._max.index ?? -1) + 1;

    const rand = Math.random().toString(36).slice(2, 8);
    const key = `manga/${chapter.manga.slug}/ch-${chapter.number}/page-${Date.now()}-${rand}.webp`;
    const storedKey = await storage.save(key, processed.buffer, "protected");

    const page = await prisma.page.create({
      data: { chapterId, index: nextIndex, imageUrl: storedKey, width: processed.width, height: processed.height },
    });

    await revalidateReader(chapterId, chapter.manga.slug);
    const signedUrl = await signPageUrl(storedKey);
    return { ok: true, data: { id: page.id, index: page.index, imageUrl: signedUrl, width: page.width, height: page.height } };
  } catch (e) {
    console.error("[PAGE] upload failed:", e);
    return { ok: false, error: "Could not upload page. Check the image format and size, then retry." };
  }
}

/** Upload a PDF and split every page into a chapter page image (WebP). */
export async function uploadChapterPdf(chapterId: string, fd: FormData): Promise<ActionResult<UploadedPage[]>> {
  if (!(await requireStaff())) return { ok: false, error: "Not authorized." };

  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "No PDF provided." };
  if (file.type !== "application/pdf") return { ok: false, error: "File is not a PDF." };

  try {
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      select: { number: true, manga: { select: { slug: true } } },
    });
    if (!chapter) return { ok: false, error: "Chapter not found." };

    const buffer = Buffer.from(await file.arrayBuffer());
    const doc = await pdf(buffer, { scale: 2 });
    if (doc.length === 0) return { ok: false, error: "That PDF has no pages." };

    const agg = await prisma.page.aggregate({ where: { chapterId }, _max: { index: true } });
    let nextIndex = (agg._max.index ?? -1) + 1;

    const created: UploadedPage[] = [];
    for await (const pageImage of doc) {
      const processed = await processChapterPageBuffer(pageImage);
      const rand = Math.random().toString(36).slice(2, 8);
      const key = `manga/${chapter.manga.slug}/ch-${chapter.number}/page-${Date.now()}-${nextIndex}-${rand}.webp`;
      const storedKey = await storage.save(key, processed.buffer, "protected");
      const page = await prisma.page.create({
        data: { chapterId, index: nextIndex, imageUrl: storedKey, width: processed.width, height: processed.height },
      });
      const signedUrl = await signPageUrl(storedKey);
      created.push({ id: page.id, index: page.index, imageUrl: signedUrl, width: page.width, height: page.height });
      nextIndex += 1;
    }

    await revalidateReader(chapterId, chapter.manga.slug);
    return { ok: true, data: created };
  } catch (e) {
    console.error("[PAGE] pdf upload failed:", e);
    return { ok: false, error: "Could not process the PDF. Please check the file and retry." };
  }
}

/** Fetch a chapter's pages (for inline editing on the manga editor). */
export async function getChapterPages(chapterId: string): Promise<ActionResult<UploadedPage[]>> {
  if (!(await requireStaff())) return { ok: false, error: "Not authorized." };
  const pages = await prisma.page.findMany({
    where: { chapterId },
    orderBy: { index: "asc" },
    select: { id: true, index: true, imageUrl: true, width: true, height: true },
  });
  const signed = await Promise.all(pages.map(async (p) => ({ ...p, imageUrl: await signPageUrl(p.imageUrl) })));
  return { ok: true, data: signed };
}

/** Reorder pages: two-phase offset to avoid transient unique(chapterId,index) collisions. */
export async function reorderPages(chapterId: string, orderedIds: string[]): Promise<ActionResult> {
  if (!(await requireStaff())) return { ok: false, error: "Not authorized." };

  try {
    await prisma.$transaction([
      ...orderedIds.map((id, i) =>
        prisma.page.update({ where: { id }, data: { index: 1_000_000 + i } }),
      ),
      ...orderedIds.map((id, i) => prisma.page.update({ where: { id }, data: { index: i } })),
    ]);
    await revalidateReader(chapterId);
    return { ok: true };
  } catch (e) {
    console.error("[PAGE] reorder failed:", e);
    return { ok: false, error: "Could not reorder pages." };
  }
}

export async function deletePage(pageId: string): Promise<ActionResult> {
  if (!(await requireStaff())) return { ok: false, error: "Not authorized." };

  try {
    const page = await prisma.page.findUnique({ where: { id: pageId }, select: { imageUrl: true, chapterId: true, chapter: { select: { manga: { select: { slug: true } } } } } });
    if (!page) return { ok: false, error: "Page not found." };

    await prisma.page.delete({ where: { id: pageId } });

    // The page is already removed from the reader. Clean up its object after
    // responding, so storage latency does not hold up the admin interface.
    after(async () => {
      try { await storage.remove(page.imageUrl, "protected"); }
      catch { console.error("[PAGE] storage cleanup failed"); }
    });

    await revalidateReader(page.chapterId, page.chapter.manga.slug);
    return { ok: true };
  } catch (e) {
    console.error("[PAGE] delete failed:", e);
    return { ok: false, error: "Could not delete page." };
  }
}
