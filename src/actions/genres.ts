"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guards";
import { genreSchema } from "@/lib/validators";
import { slugify, uniqueSlug } from "@/lib/slug";
import { isUniqueViolation, type ActionResult } from "@/lib/actions";

async function slugTaken(slug: string, exceptId?: string): Promise<boolean> {
  const count = await prisma.genre.count({
    where: { slug, ...(exceptId ? { id: { not: exceptId } } : {}) },
  });
  return count > 0;
}

export async function createGenre(name: string): Promise<ActionResult<{ id: string; name: string; slug: string }>> {
  if (!(await requireAdmin())) return { ok: false, error: "Not authorized." };

  const parsed = genreSchema.safeParse({ name });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const slug = await uniqueSlug(slugify(parsed.data.name), (s) => slugTaken(s));
    const genre = await prisma.genre.create({ data: { name: parsed.data.name, slug } });
    revalidatePath("/admin/genres");
    revalidateTag("genres", "max");
    return { ok: true, data: { id: genre.id, name: genre.name, slug: genre.slug } };
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, error: "A genre with this name already exists." };
    console.error("[GENRE] create failed:", e);
    return { ok: false, error: "Could not create genre." };
  }
}

export async function renameGenre(id: string, name: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Not authorized." };

  const parsed = genreSchema.safeParse({ name });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const slug = await uniqueSlug(slugify(parsed.data.name), (s) => slugTaken(s, id));
    await prisma.genre.update({ where: { id }, data: { name: parsed.data.name, slug } });
    revalidatePath("/admin/genres");
    revalidateTag("genres", "max");
    return { ok: true };
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, error: "A genre with this name already exists." };
    console.error("[GENRE] rename failed:", e);
    return { ok: false, error: "Could not rename genre." };
  }
}

export async function deleteGenre(id: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Not authorized." };

  try {
    await prisma.genre.delete({ where: { id } });
    revalidatePath("/admin/genres");
    revalidateTag("genres", "max");
    return { ok: true };
  } catch (e) {
    console.error("[GENRE] delete failed:", e);
    return { ok: false, error: "Could not delete genre." };
  }
}
