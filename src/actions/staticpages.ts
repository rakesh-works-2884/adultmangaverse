"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guards";
import { staticPageSchema } from "@/lib/validators";
import { slugify, uniqueSlug } from "@/lib/slug";
import { sanitizeRichText } from "@/lib/sanitize";
import { isUniqueViolation, type ActionResult } from "@/lib/actions";

function parseForm(fd: FormData) {
  const slugRaw = String(fd.get("slug") ?? "").trim();
  return {
    title: String(fd.get("title") ?? ""),
    slug: slugRaw === "" ? undefined : slugRaw,
    contentHtml: String(fd.get("contentHtml") ?? ""),
    seoTitle: String(fd.get("seoTitle") ?? "").trim() || undefined,
    seoDescription: String(fd.get("seoDescription") ?? "").trim() || undefined,
  };
}

export async function createStaticPage(fd: FormData): Promise<ActionResult<{ id: string }>> {
  if (!(await requireAdmin())) return { ok: false, error: "Not authorized." };
  const parsed = staticPageSchema.safeParse(parseForm(fd));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;

  try {
    const slug = await uniqueSlug(slugify(data.slug || data.title), async (s) => {
      return (await prisma.staticPage.count({ where: { slug: s } })) > 0;
    });
    const page = await prisma.staticPage.create({
      data: {
        slug,
        title: data.title,
        contentHtml: data.contentHtml ? sanitizeRichText(data.contentHtml) : "",
        seoTitle: data.seoTitle ?? null,
        seoDescription: data.seoDescription ?? null,
      },
    });
    revalidatePath("/admin/pages");
    revalidatePath(`/p/${slug}`);
    return { ok: true, data: { id: page.id } };
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, error: "A page with this slug already exists." };
    console.error("[PAGE] create failed:", e);
    return { ok: false, error: "Could not create page." };
  }
}

export async function updateStaticPage(id: string, fd: FormData): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Not authorized." };
  const parsed = staticPageSchema.safeParse(parseForm(fd));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;

  try {
    const existing = await prisma.staticPage.findUnique({ where: { id } });
    if (!existing) return { ok: false, error: "Page not found." };

    let slug = existing.slug;
    const desired = slugify(data.slug || data.title);
    if (desired !== existing.slug) {
      slug = await uniqueSlug(desired, async (s) => {
        return (await prisma.staticPage.count({ where: { slug: s, id: { not: id } } })) > 0;
      });
    }

    await prisma.staticPage.update({
      where: { id },
      data: {
        slug,
        title: data.title,
        contentHtml: data.contentHtml ? sanitizeRichText(data.contentHtml) : "",
        seoTitle: data.seoTitle ?? null,
        seoDescription: data.seoDescription ?? null,
      },
    });
    revalidatePath("/admin/pages");
    revalidatePath(`/p/${slug}`);
    if (existing.slug !== slug) revalidatePath(`/p/${existing.slug}`);
    return { ok: true };
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, error: "A page with this slug already exists." };
    console.error("[PAGE] update failed:", e);
    return { ok: false, error: "Could not update page." };
  }
}

export async function deleteStaticPage(id: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Not authorized." };
  try {
    const p = await prisma.staticPage.delete({ where: { id } });
    revalidatePath("/admin/pages");
    revalidatePath(`/p/${p.slug}`);
    return { ok: true };
  } catch (e) {
    console.error("[PAGE] delete failed:", e);
    return { ok: false, error: "Could not delete page." };
  }
}
