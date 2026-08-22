"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guards";
import { mangaSchema } from "@/lib/validators";
import { slugify, uniqueSlug } from "@/lib/slug";
import { processCover, processHeroDesktop, processHeroMobile } from "@/lib/images";
import { storage, keyFromUrl } from "@/lib/storage";
import { sanitizeRichText } from "@/lib/sanitize";
import { isUniqueViolation, type ActionResult } from "@/lib/actions";
import type { Prisma } from "@/generated/prisma/client";

// Only this many titles can be featured (shown in the homepage carousel) at
// once. Featuring a new one past the cap evicts the longest-standing one —
// see enforceFeaturedCap.
const FEATURED_LIMIT = 3;

/** Evicts the oldest-featured title (by featuredAt) if featuring `keepId` would push the count over FEATURED_LIMIT. */
async function enforceFeaturedCap(tx: Prisma.TransactionClient, keepId: string): Promise<void> {
  const others = await tx.manga.count({ where: { featured: true, id: { not: keepId } } });
  if (others < FEATURED_LIMIT) return;
  const oldest = await tx.manga.findFirst({
    where: { featured: true, id: { not: keepId } },
    orderBy: { featuredAt: "asc" },
    select: { id: true },
  });
  if (oldest) await tx.manga.update({ where: { id: oldest.id }, data: { featured: false, featuredAt: null } });
}

function parseMangaForm(fd: FormData) {
  const altRaw = String(fd.get("altTitles") ?? "");
  const yearRaw = String(fd.get("releaseYear") ?? "").trim();
  const slugRaw = String(fd.get("slug") ?? "").trim();
  return {
    title: String(fd.get("title") ?? ""),
    slug: slugRaw === "" ? undefined : slugRaw,
    altTitles: altRaw
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
    synopsis: String(fd.get("synopsis") ?? ""),
    author: String(fd.get("author") ?? "").trim() || undefined,
    authorLink: String(fd.get("authorLink") ?? "").trim() || undefined,
    artist: String(fd.get("artist") ?? "").trim() || undefined,
    status: String(fd.get("status") ?? "ONGOING"),
    type: String(fd.get("type") ?? "MANGA"),
    intensity: String(fd.get("intensity") ?? "MODERATE"),
    isPremium: fd.get("isPremium") === "true",
    contentWarnings: String(fd.get("contentWarnings") ?? "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
    releaseYear: yearRaw ? Number(yearRaw) : undefined,
    featured: fd.get("featured") === "true",
    published: fd.get("published") === "true",
    genreIds: fd.getAll("genreIds").map(String),
    seoTitle: String(fd.get("seoTitle") ?? "").trim() || undefined,
    seoDescription: String(fd.get("seoDescription") ?? "").trim() || undefined,
    focusKeyword: String(fd.get("focusKeyword") ?? "").trim() || undefined,
    canonicalUrl: String(fd.get("canonicalUrl") ?? "").trim() || undefined,
    noindex: fd.get("noindex") === "on" || fd.get("noindex") === "true",
    nofollow: fd.get("nofollow") === "on" || fd.get("nofollow") === "true",
  };
}

async function saveCover(file: File, slug: string): Promise<string> {
  const processed = await processCover(file);
  const key = `manga/${slug}/cover-${Date.now().toString(36)}.webp`;
  return storage.save(key, processed.buffer, "public");
}

async function saveHeroDesktop(file: File, slug: string): Promise<string> {
  const processed = await processHeroDesktop(file);
  const key = `manga/${slug}/hero-desktop-${Date.now().toString(36)}.webp`;
  return storage.save(key, processed.buffer, "public");
}

async function saveHeroMobile(file: File, slug: string): Promise<string> {
  const processed = await processHeroMobile(file);
  const key = `manga/${slug}/hero-mobile-${Date.now().toString(36)}.webp`;
  return storage.save(key, processed.buffer, "public");
}

function revalidateManga(slug: string) {
  revalidatePath("/admin/manga");
  revalidatePath(`/manga/${slug}`);
  revalidatePath("/");
}

export async function createManga(fd: FormData): Promise<ActionResult<{ id: string; slug: string }>> {
  if (!(await requireAdmin())) return { ok: false, error: "Not authorized." };

  const parsed = mangaSchema.safeParse(parseMangaForm(fd));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  try {
    const slug = await uniqueSlug(slugify(data.slug || data.title), async (s) => {
      return (await prisma.manga.count({ where: { slug: s } })) > 0;
    });

    const cover = fd.get("cover");
    const heroDesktop = fd.get("heroImageDesktop");
    const heroMobile = fd.get("heroImageMobile");
    const [coverUrl, heroImageDesktop, heroImageMobile] = await Promise.all([
      cover instanceof File && cover.size > 0 ? saveCover(cover, slug) : Promise.resolve(undefined),
      heroDesktop instanceof File && heroDesktop.size > 0 ? saveHeroDesktop(heroDesktop, slug) : Promise.resolve(undefined),
      heroMobile instanceof File && heroMobile.size > 0 ? saveHeroMobile(heroMobile, slug) : Promise.resolve(undefined),
    ]);

    const manga = await prisma.$transaction(async (tx) => {
      const created = await tx.manga.create({
        data: {
          title: data.title,
          slug,
          altTitles: data.altTitles,
          synopsis: data.synopsis ? sanitizeRichText(data.synopsis) : null,
          coverUrl,
          author: data.author ?? null,
          authorLink: data.authorLink || null,
          artist: data.artist ?? null,
          status: data.status,
          type: data.type,
          intensity: data.intensity,
          isPremium: data.isPremium,
          contentWarnings: data.contentWarnings,
          releaseYear: data.releaseYear ?? null,
          featured: data.featured,
          featuredAt: data.featured ? new Date() : null,
          heroImageDesktop,
          heroImageMobile,
          published: data.published,
          seoTitle: data.seoTitle ?? null,
          seoDescription: data.seoDescription ?? null,
          focusKeyword: data.focusKeyword ?? null,
          canonicalUrl: data.canonicalUrl ?? null,
          noindex: data.noindex ?? false,
          nofollow: data.nofollow ?? false,
          genres: { connect: data.genreIds.map((id) => ({ id })) },
        },
      });
      if (data.featured) await enforceFeaturedCap(tx, created.id);
      return created;
    });

    revalidateManga(slug);
    return { ok: true, data: { id: manga.id, slug } };
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, error: "A manga with this slug already exists." };
    console.error("[MANGA] create failed:", e);
    return { ok: false, error: e instanceof Error ? e.message : "Could not create manga." };
  }
}

export async function updateManga(id: string, fd: FormData): Promise<ActionResult<{ slug: string }>> {
  if (!(await requireAdmin())) return { ok: false, error: "Not authorized." };

  const parsed = mangaSchema.safeParse(parseMangaForm(fd));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  try {
    const existing = await prisma.manga.findUnique({ where: { id } });
    if (!existing) return { ok: false, error: "Manga not found." };

    // Slug: keep unless title/slug changed; create a SlugRedirect on change.
    let slug = existing.slug;
    const desired = slugify(data.slug || data.title);
    if (desired !== existing.slug) {
      slug = await uniqueSlug(desired, async (s) => {
        return (await prisma.manga.count({ where: { slug: s, id: { not: id } } })) > 0;
      });
      if (slug !== existing.slug) {
        await prisma.slugRedirect.upsert({
          where: { entity_oldSlug: { entity: "manga", oldSlug: existing.slug } },
          update: { newSlug: slug },
          create: { entity: "manga", oldSlug: existing.slug, newSlug: slug },
        });
      }
    }

    // Cover + hero posters: replace only if a new file was uploaded, and
    // clean up the old object in storage when replaced.
    const cover = fd.get("cover");
    const heroDesktop = fd.get("heroImageDesktop");
    const heroMobile = fd.get("heroImageMobile");
    const [coverUrl, heroImageDesktop, heroImageMobile] = await Promise.all([
      cover instanceof File && cover.size > 0 ? saveCover(cover, slug) : Promise.resolve(existing.coverUrl),
      heroDesktop instanceof File && heroDesktop.size > 0 ? saveHeroDesktop(heroDesktop, slug) : Promise.resolve(existing.heroImageDesktop),
      heroMobile instanceof File && heroMobile.size > 0 ? saveHeroMobile(heroMobile, slug) : Promise.resolve(existing.heroImageMobile),
    ]);
    await Promise.all([
      coverUrl !== existing.coverUrl && existing.coverUrl ? storage.remove(keyFromUrl(existing.coverUrl) ?? "", "public") : null,
      heroImageDesktop !== existing.heroImageDesktop && existing.heroImageDesktop ? storage.remove(keyFromUrl(existing.heroImageDesktop) ?? "", "public") : null,
      heroImageMobile !== existing.heroImageMobile && existing.heroImageMobile ? storage.remove(keyFromUrl(existing.heroImageMobile) ?? "", "public") : null,
    ]);

    // First time being featured (wasn't already) starts the FIFO clock;
    // staying featured keeps the original date; un-featuring clears it.
    const featuredAt = data.featured ? (existing.featured ? existing.featuredAt : new Date()) : null;
    const newlyFeatured = data.featured && !existing.featured;

    await prisma.$transaction(async (tx) => {
      await tx.manga.update({
        where: { id },
        data: {
          title: data.title,
          slug,
          altTitles: data.altTitles,
          synopsis: data.synopsis ? sanitizeRichText(data.synopsis) : null,
          coverUrl,
          author: data.author ?? null,
          authorLink: data.authorLink || null,
          artist: data.artist ?? null,
          status: data.status,
          type: data.type,
          intensity: data.intensity,
          isPremium: data.isPremium,
          contentWarnings: data.contentWarnings,
          releaseYear: data.releaseYear ?? null,
          featured: data.featured,
          featuredAt,
          heroImageDesktop,
          heroImageMobile,
          published: data.published,
          seoTitle: data.seoTitle ?? null,
          seoDescription: data.seoDescription ?? null,
          focusKeyword: data.focusKeyword ?? null,
          canonicalUrl: data.canonicalUrl ?? null,
          noindex: data.noindex ?? false,
          nofollow: data.nofollow ?? false,
          genres: { set: data.genreIds.map((gid) => ({ id: gid })) },
        },
      });
      if (newlyFeatured) await enforceFeaturedCap(tx, id);
    });

    revalidateManga(slug);
    if (existing.slug !== slug) revalidatePath(`/manga/${existing.slug}`);
    return { ok: true, data: { slug } };
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, error: "A manga with this slug already exists." };
    console.error("[MANGA] update failed:", e);
    return { ok: false, error: e instanceof Error ? e.message : "Could not update manga." };
  }
}

export async function deleteManga(id: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Not authorized." };

  try {
    const existing = await prisma.manga.findUnique({ where: { id } });
    if (!existing) return { ok: false, error: "Manga not found." };

    await prisma.manga.delete({ where: { id } });

    await Promise.all(
      [existing.coverUrl, existing.heroImageDesktop, existing.heroImageMobile].map((url) => {
        if (!url) return null;
        const key = keyFromUrl(url);
        return key ? storage.remove(key, "public") : null;
      }),
    );

    revalidateManga(existing.slug);
    return { ok: true };
  } catch (e) {
    console.error("[MANGA] delete failed:", e);
    return { ok: false, error: "Could not delete manga." };
  }
}

export async function toggleMangaPublished(id: string, published: boolean): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Not authorized." };
  try {
    const m = await prisma.$transaction(async (tx) => {
      const manga = await tx.manga.update({ where: { id }, data: { published } });
      if (published) {
        // Publishing the manga should make its content reachable in one
        // step — any chapter that already has pages but is still an
        // unpublished draft (e.g. left that way by bulk import) gets
        // published now too, instead of requiring a second manual toggle
        // per chapter. Chapters already published, or still empty (no
        // pages yet), are left untouched.
        await tx.chapter.updateMany({
          where: { mangaId: id, publishedAt: null, pages: { some: {} } },
          data: { publishedAt: new Date() },
        });
      }
      return manga;
    });
    revalidateManga(m.slug);
    return { ok: true };
  } catch (e) {
    console.error("[MANGA] toggle publish failed:", e);
    return { ok: false, error: "Could not update publish state." };
  }
}
