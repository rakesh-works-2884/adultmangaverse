"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guards";
import { blogSchema } from "@/lib/validators";
import { slugify, uniqueSlug } from "@/lib/slug";
import { sanitizeRichText } from "@/lib/sanitize";
import { processBlogCover } from "@/lib/images";
import { storage, keyFromUrl } from "@/lib/storage";
import { isUniqueViolation, type ActionResult } from "@/lib/actions";

function parseForm(fd: FormData) {
  const slugRaw = String(fd.get("slug") ?? "").trim();
  return {
    title: String(fd.get("title") ?? ""),
    slug: slugRaw === "" ? undefined : slugRaw,
    excerpt: String(fd.get("excerpt") ?? "").trim() || undefined,
    contentHtml: String(fd.get("contentHtml") ?? ""),
    author: String(fd.get("author") ?? "").trim() || undefined,
    published: fd.get("published") === "true",
    seoTitle: String(fd.get("seoTitle") ?? "").trim() || undefined,
    seoDescription: String(fd.get("seoDescription") ?? "").trim() || undefined,
    focusKeyword: String(fd.get("focusKeyword") ?? "").trim() || undefined,
    canonicalUrl: String(fd.get("canonicalUrl") ?? "").trim() || undefined,
    noindex: fd.get("noindex") === "on" || fd.get("noindex") === "true",
    nofollow: fd.get("nofollow") === "on" || fd.get("nofollow") === "true",
  };
}

async function saveCover(file: File, slug: string): Promise<string> {
  const processed = await processBlogCover(file);
  const key = `blog/${slug}/cover-${Date.now().toString(36)}.webp`;
  return storage.save(key, processed.buffer, "public");
}

function revalidateBlog(slug: string) {
  revalidatePath("/admin/blogs");
  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
}

export async function createBlog(fd: FormData): Promise<ActionResult<{ id: string; slug: string }>> {
  if (!(await requireAdmin())) return { ok: false, error: "Not authorized." };
  const parsed = blogSchema.safeParse(parseForm(fd));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;

  try {
    const slug = await uniqueSlug(slugify(data.slug || data.title), async (s) => (await prisma.blog.count({ where: { slug: s } })) > 0);

    let coverImage: string | undefined;
    const cover = fd.get("cover");
    if (cover instanceof File && cover.size > 0) {
      coverImage = await saveCover(cover, slug);
    }

    const blog = await prisma.blog.create({
      data: {
        title: data.title,
        slug,
        excerpt: data.excerpt ?? null,
        contentHtml: data.contentHtml ? sanitizeRichText(data.contentHtml) : "",
        coverImage,
        author: data.author ?? null,
        published: data.published,
        publishedAt: data.published ? new Date() : null,
        seoTitle: data.seoTitle ?? null,
        seoDescription: data.seoDescription ?? null,
        focusKeyword: data.focusKeyword ?? null,
        canonicalUrl: data.canonicalUrl ?? null,
        noindex: data.noindex ?? false,
        nofollow: data.nofollow ?? false,
      },
    });

    revalidateBlog(slug);
    return { ok: true, data: { id: blog.id, slug } };
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, error: "A blog post with this slug already exists." };
    console.error("[BLOG] create failed:", e);
    return { ok: false, error: "Could not create blog post." };
  }
}

export async function updateBlog(id: string, fd: FormData): Promise<ActionResult<{ slug: string }>> {
  if (!(await requireAdmin())) return { ok: false, error: "Not authorized." };
  const parsed = blogSchema.safeParse(parseForm(fd));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;

  try {
    const existing = await prisma.blog.findUnique({ where: { id } });
    if (!existing) return { ok: false, error: "Blog post not found." };

    let slug = existing.slug;
    const desired = slugify(data.slug || data.title);
    if (desired !== existing.slug) {
      slug = await uniqueSlug(desired, async (s) => (await prisma.blog.count({ where: { slug: s, id: { not: id } } })) > 0);
    }

    let coverImage = existing.coverImage;
    const cover = fd.get("cover");
    if (cover instanceof File && cover.size > 0) {
      coverImage = await saveCover(cover, slug);
      if (existing.coverImage) {
        const oldKey = keyFromUrl(existing.coverImage);
        if (oldKey) await storage.remove(oldKey, "public");
      }
    }

    await prisma.blog.update({
      where: { id },
      data: {
        title: data.title,
        slug,
        excerpt: data.excerpt ?? null,
        contentHtml: data.contentHtml ? sanitizeRichText(data.contentHtml) : "",
        coverImage,
        author: data.author ?? null,
        published: data.published,
        // First publish sets the date; later edits (even unpublish/republish)
        // don't reset it, so a post doesn't look "new" every time it's toggled.
        publishedAt: data.published ? (existing.publishedAt ?? new Date()) : existing.publishedAt,
        seoTitle: data.seoTitle ?? null,
        seoDescription: data.seoDescription ?? null,
        focusKeyword: data.focusKeyword ?? null,
        canonicalUrl: data.canonicalUrl ?? null,
        noindex: data.noindex ?? false,
        nofollow: data.nofollow ?? false,
      },
    });

    revalidateBlog(slug);
    if (existing.slug !== slug) revalidateBlog(existing.slug);
    return { ok: true, data: { slug } };
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, error: "A blog post with this slug already exists." };
    console.error("[BLOG] update failed:", e);
    return { ok: false, error: "Could not update blog post." };
  }
}

export async function deleteBlog(id: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Not authorized." };
  try {
    const existing = await prisma.blog.findUnique({ where: { id } });
    if (!existing) return { ok: false, error: "Blog post not found." };

    await prisma.blog.delete({ where: { id } });

    if (existing.coverImage) {
      const key = keyFromUrl(existing.coverImage);
      if (key) await storage.remove(key, "public");
    }

    revalidateBlog(existing.slug);
    return { ok: true };
  } catch (e) {
    console.error("[BLOG] delete failed:", e);
    return { ok: false, error: "Could not delete blog post." };
  }
}

export async function toggleBlogPublished(id: string, published: boolean): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Not authorized." };
  try {
    const existing = await prisma.blog.findUnique({ where: { id }, select: { slug: true, publishedAt: true } });
    if (!existing) return { ok: false, error: "Blog post not found." };

    await prisma.blog.update({
      where: { id },
      data: { published, publishedAt: published ? (existing.publishedAt ?? new Date()) : existing.publishedAt },
    });
    revalidateBlog(existing.slug);
    return { ok: true };
  } catch (e) {
    console.error("[BLOG] toggle publish failed:", e);
    return { ok: false, error: "Could not update publish state." };
  }
}
