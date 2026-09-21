"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-guards";
import { requireStaff } from "@/lib/auth-guards";
import { commentSchema } from "@/lib/validators";
import type { ActionResult } from "@/lib/actions";
import type { CommentStatus } from "@/generated/prisma/client";

export async function postComment(input: {
  mangaId?: string;
  chapterId?: string;
  body: string;
}): Promise<ActionResult> {
  const session = await requireUser();
  if (!session) return { ok: false, error: "Please sign in to comment." };
  if (!input.mangaId && !input.chapterId) return { ok: false, error: "Nothing to comment on." };

  const parsed = commentSchema.safeParse({ body: input.body });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    await prisma.comment.create({
      data: {
        userId: session.user.id,
        mangaId: input.mangaId ?? null,
        chapterId: input.chapterId ?? null,
        body: parsed.data.body,
        status: "PENDING",
      },
    });
    if (input.mangaId) {
      const m = await prisma.manga.findUnique({ where: { id: input.mangaId }, select: { slug: true } });
      if (m) revalidatePath(`/manga/${m.slug}`);
    }
    return { ok: true };
  } catch (e) {
    console.error("[COMMENT] post failed:", e);
    return { ok: false, error: "Could not post comment." };
  }
}

export async function moderateComment(id: string, status: CommentStatus): Promise<ActionResult> {
  if (!(await requireStaff())) return { ok: false, error: "Not authorized." };
  try {
    const c = await prisma.comment.update({
      where: { id },
      data: { status },
      select: { manga: { select: { slug: true } } },
    });
    revalidatePath("/admin/comments");
    if (c.manga) revalidatePath(`/manga/${c.manga.slug}`);
    return { ok: true };
  } catch (e) {
    console.error("[COMMENT] moderate failed:", e);
    return { ok: false, error: "Could not update comment." };
  }
}

export async function deleteComment(id: string): Promise<ActionResult> {
  if (!(await requireStaff())) return { ok: false, error: "Not authorized." };
  try {
    await prisma.comment.delete({ where: { id } });
    revalidatePath("/admin/comments");
    return { ok: true };
  } catch (e) {
    console.error("[COMMENT] delete failed:", e);
    return { ok: false, error: "Could not delete comment." };
  }
}
